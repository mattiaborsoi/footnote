# Footnote

A walk designed around you. A person describes the walk they are in the mood for; the app returns real stops from open map data, each with a short story and a "why it's for you" line, routed with time, distance and steps, exportable to Google Maps. Next.js 16 + TypeScript. **Claude curates, it never invents**: it only picks and orders stops from candidate IDs we supply and writes from the facts attached to them.

## Run and test

Everything runs in containers. Nothing is installed on any host machine.

- Start the test environment: `docker compose up -d --build` (add `-V` after dependency changes). App on :3002, Mailpit (catches all email) on :8025.
- Checks: `docker compose exec -T app pnpm lint` and `docker compose exec -T app sh -c "pnpm exec next typegen && pnpm exec tsc --noEmit"` (typegen creates the route types tsc needs; the dev server does it implicitly).
- Working loop: edit in the main checkout, sync the tree to the test machine (`rsync -a --delete --exclude .git --exclude node_modules --exclude .next --exclude .env --exclude data ./ <test-host>:<path>/`), the dev container reloads.
- Secrets live only in `.env` (copy of `.env.example`, chmod 600, never committed). Container data lives in `./data/` (gitignored).
- CI on every PR (`.github/workflows/`): `checks` builds the dev image and runs lint, type-check and a production build inside it; `privacy` runs `.githooks/privacy-scan` over the PR's diff, messages, title and body with the denylist from the `PRIVACY_DENYLIST` secret, plus gitleaks; `review` and `qa` run independent Opus agents on the Claude Code GitHub Action, authenticated by the `CLAUDE_CODE_OAUTH_TOKEN` secret (read-only reviewer; QA may run Docker and curl). Merge only when all are green. Dependabot opens weekly grouped update PRs.
- Model access is one OpenAI-compatible endpoint, `LLM_BASE_URL`: locally a proxy on the test host, in production LiteLLM with a real API key.

## Rules

1. **No personal information in the repo, ever.** No real names, addresses, phone numbers, postcodes, emails, home coordinates, real trips or planned destinations anywhere: code, comments, tests, fixtures, commit messages, PR titles and bodies. Test scenarios use the fixed fixture city under `tests/fixtures/`. Personal experiments go in `.local/` (gitignored). `.githooks/privacy-scan` enforces this at commit time and in CI; keep `.local/privacy-denylist.txt` current on every machine that commits. A deliberate exception is marked by `privacy-ok` on the line.
2. **Every change is a pull request**, squash-merged by the owner, titled like a conventional commit (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`, `ci:`, `perf:`). Direct pushes to main are blocked by `.githooks/pre-push`. Enable hooks once per checkout: `git config core.hooksPath .githooks`.
3. **Small, clear changes.** PR body: what, why, how tested. No long explanations.
4. **Update this file in the same PR** as any change of plan, structure or decision. The reviewer agent checks that.
5. **Claude curates, never invents.** Stops come from candidate IDs, stories only from supplied facts, output is schema-validated, unknown IDs are rejected, routing is deterministic.

## Architecture (current)

- `src/app/` — Next.js App Router; `api/health` for checks.
- `compose.yml` + `Dockerfile` — dev target with the source bind-mounted; a production target comes with the cloud deployment.
- Planned: `src/lib/pipeline/` (interpret → geocode → gather → curate → route and fit), `src/lib/providers/` (geocoder, places, stories, routing, tiles behind interfaces with caching and throttling), `src/lib/llm/` (the one module that talks to the model).

## Decisions

- 2026-10-31 — Dependabot handles minors and patches only; majors are moved by hand (Node to the next LTS, and TypeScript, ESLint and Next together, since typescript-eslint lags TypeScript majors). Node 25+ ships no corepack, so pnpm is installed with npm at the version pinned in package.json. Dependabot PRs are merged only when checks are green.
- 2026-10-31 — Repo is private under GitHub Free, which has no branch protection: a pre-push hook blocks pushes to main until the repo goes public.
- 2026-10-31 — Everything in containers. Test environment on a home server, production on a cloud VM with its own LiteLLM. The app only ever sees an OpenAI-compatible base URL.
- 2026-10-30 — Open core: the app is public (licence to decide before release, AGPL favoured); curated city data, billing and deployment config stay private.
- 2026-10-30 — Login by magic link plus a short code, no passwords. The free trial also requires sign-in; trial abuse is limited by email normalisation (plus-tags, Gmail dots, throwaway domains) and device/IP limits.
- 2026-10-30 — The free trial shows one full walk with locked actions. Paid access is a subscription sized from measured cost, advertised as "up to N walks", never "unlimited". Stripe. Paid access opens in the UK and US first.
- 2026-10-30 — Data: OSM, Wikidata, Wikipedia, photo density (Commons, Flickr), film locations (Wikidata), shops and museums (OSM, Foursquare open places), blogger recommendations via a cached per-city scout job that stores source links. Routing and geocoding through hosted APIs.
- 2026-10-30 — CI: an independent Opus reviewer (read-only) and an Opus QA agent on every PR via the Claude Code GitHub Action; the privacy scan with a denylist kept outside the repo; gitleaks.
- 2026-10-30 — UK compliance from day one: UK GDPR (minimal data, no request text in logs), PECR (essential storage only), consumer law (digital-content waiver at checkout, renewal reminders, easy cancellation), ODbL and CC BY-SA attribution, WCAG 2.2 AA.

## Status

Milestone 0 (scaffold and pipeline) done: repo, scaffold, test environment, notes, privacy hooks, CI with reviewer and QA agents. Next: milestone 1, walks without AI. Before going public: squash the history and review this file for commercial detail.
