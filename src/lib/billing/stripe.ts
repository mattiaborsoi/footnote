import { eq } from "drizzle-orm";
import Stripe from "stripe";
import type { User } from "../auth";
import { getDb } from "../db";
import { stripeEvents, users } from "../db/schema";
import { logEvent } from "../log";
import { planWalks } from "../account/allowance";

export type PlanId = "week" | "month";
export type PlanInfo = { id: PlanId; name: string; price: string; walks: number; period: string; mode: "payment" | "subscription"; blurb: string; priceId: string | undefined };

/** The two offers. Prices are labels here; Stripe holds the real ones behind the price ids. */
export function plans(): PlanInfo[] {
  return [
    { id: "week", name: "Week pass", price: process.env.PLAN_WEEK_PRICE ?? "£4.99", walks: planWalks("week"), period: "seven days, no renewal", mode: "payment", blurb: "For a trip. Starts the moment you pay and ends after seven days; nothing renews.", priceId: process.env.STRIPE_PRICE_WEEK },
    { id: "month", name: "Monthly", price: process.env.PLAN_MONTH_PRICE ?? "£7.99", walks: planWalks("month"), period: "a month, renews until you cancel", mode: "subscription", blurb: "For locals and planners. Renews every month; cancel any time from your account and keep the rest of the month.", priceId: process.env.STRIPE_PRICE_MONTH },
  ];
}

let client: Stripe | null | undefined;
export function stripe(): Stripe | null {
  if (client !== undefined) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  return (client = key ? new Stripe(key) : null);
}

export function paymentsReady(): boolean {
  return !!stripe() && plans().every((p) => !!p.priceId);
}

const appUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** A Checkout page for one plan; the customer is created on first purchase and remembered. */
export async function checkoutUrl(user: User, planId: PlanId): Promise<string> {
  const s = stripe();
  const plan = plans().find((p) => p.id === planId);
  const db = getDb();
  if (!s || !plan?.priceId || !db) throw new Error("Payments are not set up on this instance.");
  let customer = user.stripeCustomerId;
  if (!customer) {
    customer = (await s.customers.create({ email: user.email, metadata: { userId: user.id } })).id;
    await db.update(users).set({ stripeCustomerId: customer }).where(eq(users.id, user.id));
  }
  const meta = { userId: user.id, plan: plan.id };
  const session = await s.checkout.sessions.create({
    mode: plan.mode,
    customer,
    client_reference_id: user.id,
    line_items: [{ price: plan.priceId, quantity: 1 }],
    success_url: `${appUrl()}/account?checkout=done`,
    cancel_url: `${appUrl()}/plans`,
    metadata: meta,
    allow_promotion_codes: true,
    custom_text: { submit: { message: "Walks start straight away, so the 14-day right to cancel is waived once the first one is built. The monthly plan can be cancelled any time from your account." } },
    ...(plan.mode === "subscription" ? { subscription_data: { metadata: meta } } : { payment_intent_data: { metadata: meta } }),
  });
  if (!session.url) throw new Error("Stripe returned no checkout link.");
  logEvent("billing.checkout", { plan: plan.id });
  return session.url;
}

/** Stripe's own portal: change card, cancel, see invoices. */
export async function portalUrl(user: User): Promise<string> {
  const s = stripe();
  if (!s || !user.stripeCustomerId) throw new Error("No billing account yet.");
  return (await s.billingPortal.sessions.create({ customer: user.stripeCustomerId, return_url: `${appUrl()}/account` })).url;
}

async function applySubscription(userId: string, sub: Stripe.Subscription): Promise<void> {
  const db = getDb();
  if (!db) return;
  const item = sub.items.data[0];
  const status = sub.status === "active" || sub.status === "trialing" ? "active" : sub.status === "past_due" ? "past_due" : "cancelled";
  await db.update(users).set({
    plan: "month", planStatus: status, subscriptionId: sub.id,
    planStartsAt: item ? new Date(item.current_period_start * 1000) : new Date(),
    planEndsAt: item ? new Date(item.current_period_end * 1000) : null,
  }).where(eq(users.id, userId));
}

async function userIdByCustomer(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null): Promise<string | null> {
  const id = typeof customer === "string" ? customer : customer?.id;
  const db = getDb();
  if (!id || !db) return null;
  return (await db.query.users.findFirst({ where: eq(users.stripeCustomerId, id), columns: { id: true } }))?.id ?? null;
}

/** Stripe calling back: verified, applied once per event id. */
export async function handleWebhook(raw: string, signature: string): Promise<{ handled: string }> {
  const s = stripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const db = getDb();
  if (!s || !secret || !db) throw new Error("Webhook not configured.");
  const event = s.webhooks.constructEvent(raw, signature, secret);
  const fresh = await db.insert(stripeEvents).values({ id: event.id, type: event.type }).onConflictDoNothing().returning({ id: stripeEvents.id });
  if (!fresh.length) return { handled: "duplicate" };
  switch (event.type) {
    case "checkout.session.completed": {
      const cs = event.data.object;
      const userId = cs.metadata?.userId ?? cs.client_reference_id;
      const plan = cs.metadata?.plan;
      if (!userId || (plan !== "week" && plan !== "month")) break;
      if (plan === "week") {
        const now = new Date();
        await db.update(users).set({ plan: "week", planStatus: "active", planStartsAt: now, planEndsAt: new Date(now.getTime() + 7 * 86_400_000), subscriptionId: null }).where(eq(users.id, userId));
      } else if (typeof cs.subscription === "string") {
        await applySubscription(userId, await s.subscriptions.retrieve(cs.subscription));
      }
      logEvent("billing.activated", { plan });
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const userId = sub.metadata?.userId ?? (await userIdByCustomer(sub.customer));
      if (userId) await applySubscription(userId, sub);
      break;
    }
  }
  return { handled: event.type };
}
