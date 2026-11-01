import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { hashSecret, sameHash } from "../auth/codes";

export const ADMIN_COOKIE = "fn_admin";

/** The dashboard exists only where ADMIN_UI=on and a token is set: the owner's machine, never the public instance. */
export function adminEnabled(): boolean {
  return process.env.ADMIN_UI === "on" && !!process.env.ADMIN_TOKEN;
}

export async function isAdmin(): Promise<boolean> {
  await connection();
  const token = process.env.ADMIN_TOKEN;
  if (!adminEnabled() || !token) return false;
  const v = (await cookies()).get(ADMIN_COOKIE)?.value;
  return !!v && sameHash(v, hashSecret(token));
}

/** Pages: 404 where the dashboard does not exist, the login where it does. */
export async function requireAdmin(): Promise<void> {
  if (!adminEnabled()) notFound();
  if (!(await isAdmin())) redirect("/admin/login");
}

export async function setAdminCookie(on: boolean): Promise<void> {
  const jar = await cookies();
  if (!on) { jar.delete(ADMIN_COOKIE); return; }
  jar.set(ADMIN_COOKIE, hashSecret(process.env.ADMIN_TOKEN ?? ""), { httpOnly: true, sameSite: "strict", secure: (process.env.APP_URL ?? "").startsWith("https"), path: "/", maxAge: 30 * 86_400 });
}
