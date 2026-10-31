# Footnote

A walk designed around you. A person describes the walk they are in the mood for; the app returns real stops from open map data, each with a short story and a "why it's for you" line, routed with time, distance and steps, exportable to Google Maps. Next.js 16 + TypeScript. **Claude curates, it never invents**: it only picks and orders stops from candidate IDs we supply and writes from the facts attached to them.

## Product

**Problem.** Asking a chatbot for a day out gives untailored waypoints with no timeline and no map. Footnote turns a person's dates, time, company and interests into a plan they can see on a map and trust the timings of: a desktop to plan, a phone to walk.

**Who.** Travellers with a free afternoon or a trip to plan, locals wanting somewhere new, anyone with ninety minutes to fill. Non-technical, mostly on phones.

**Request, never a blank box.** Six questions: where (start by current location or search; end the same, elsewhere, or "surprise me") · how long (slider with the implied distance) · who is walking (just me, kids, older people, limited mobility, pram: drives pace, breaks and step-free routing; pace stays overridable) · interests (icon tiles, long-press to rank: nature, modern architecture, history, technology, gaming, art and craft, cafés, views, photo spots, film locations, museums, shops) · when (now, or a day and time: unlocks opening hours and weather) · anything else (one optional free-text line, a constraint, never the sole input). Desktop shows all six on one page with a live summary sentence.

**Content.** Open data (OSM, Wikidata, Wikipedia) anchors real places. The **scout layer** is the content: a background job per city searches the web (blogs, travel sites, forums, video transcripts) for recommended spots, matches each to a real map place and stores name, one-line reason, source link and date. Facts and links only, never an author's text; every stop credits its source. It starts with key world capitals and expands to a city when people search for it. Per city, pre-made walks and must-sees are cached and offered first: a cached walk costs no model time; re-checking opening hours and weather for the person's date is free, tailoring it to their preferences uses the model.

**Curation rules.** No story, no stop: a thin area gives a shorter walk, never a padded one. Opening hours are checked for the planned day and arrival time; closed stops are swapped or flagged. Weather nudges parks and views. Companions change dwell time, breaks and steps.

**Map.** One calm base map, desaturated while a walk shows. The route is one solid ink-blue line with a white casing. Stops are white numbered circles with a thin halo in the interest colour; start a square, end a diamond. Time pills per leg when zoomed in, one total pill otherwise, never a time on a pin. Detours: dashed blue at reduced opacity with lettered hollow pins, off by default on phone, behind one "Options" chip. "20 more minutes" extensions: a dotted amber spur with a tag, one at a time, tap to swap in. A closed stop gets a grey halo and a clock badge. Nothing thinner than 2 px, no colour-only distinctions.

**The wait (15 to 40 s).** Four honest stages with real durations and no fake percentages: understood · searching · choosing stops · walking the route. On the map the search circle breathes out, candidate dots fade in, the chosen ones grow into numbered pins in walk order, the line draws itself. One short fact rotates underneath. After 20 s say it is slow; after 30 s offer "show what we have".

**Stories.** Name only on the map. One hook line of at most 90 characters on the card, expanding to three short paragraphs, then "why it's here for you" with the person's interests bolded and sources linked. Audio reading comes later.

**Around me (phone).** One button: location, 45 minutes, saved interests, now. The result is a fan of five options within ten minutes, swipeable cards with walking time and open-till, dashed spokes on the map. "Go" routes one leg; "Make this a walk" runs the full pipeline.

**Walks are pages.** Every walk has an id and a shareable link, cached on the device with its stories so it reads offline on the pavement. The **footnoted walk** is the signature: as you walk, numbered superscripts land where you paused, took a photo or opened a story, and at the end a one-page footnoted record of the walk can be shared as an image or printed.

**Trial and plans.** The first walk is real and exportable; the magic-link sign-in is asked when the person wants to save or share it. Then a weekly pass for travellers and a monthly plan for locals, "up to N walks", sized from measured cost.

## Run and test

Everything runs in containers. Nothing is installed on any host machine.

- Start the test environment: `docker compose up -d --build` (add `-V` after dependency changes). App on :3002, Mailpit (catches all email) on :8025.
- Checks: `docker compose exec -T app pnpm test`, `docker compose exec -T app pnpm lint` and `docker compose exec -T app sh -c "pnpm exec next typegen && pnpm exec tsc --noEmit"` (typegen creates the route types tsc needs; the dev server does it implicitly).
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

- `src/app/` — Next.js App Router; `api/health` for checks; `api/walk/demo` builds a walk from query parameters without a model.
- `src/lib/geo.ts` — distances, detour, ordering along an axis or around a centre, search bounding box.
- `src/lib/providers/` — `types.ts` (Geocoder, PlacesProvider, Router, Candidate), `cache.ts` (TTL cache, per-provider throttle, User-Agent), `nominatim.ts`, `overpass.ts` (candidates with facts from tags), `osrm.ts` (foot profile). All dev-grade public services, swapped before going public.
- `src/lib/pipeline/` — `intent.ts` (Intent schema, interest → OSM selectors, pace, dwell), `candidates.ts` (score, dedupe, pick and order), `fit.ts` (deterministic time-budget fitting), `export.ts` (Google Maps link with the nine-waypoint cap, GPX), `walk.ts` (orchestration).
- `tests/unit/` with vitest; `tests/fixtures/city.ts` is the only place with coordinates (central Bath).
- `compose.yml` + `Dockerfile` — dev target with the source bind-mounted; a production target comes with the cloud deployment.
- Planned: `src/lib/llm/` (the one module that talks to the model) with interpret and curate replacing the hard-coded intent and the score-based pick.

## Decisions

- 2026-10-31 — Product reshaped after two independent evaluations and the owner's review: a plan-builder for dates and companions, not a mood walk. Adopted: the six-question request, the scout layer with a per-city cache of pre-made walks, "no story, no stop", opening hours and weather in selection, companions as a pace profile, the map and waiting design, stories as one expandable line, walks as shareable pages, the footnoted walk, "around me" on the phone, a real exportable trial with sign-in afterwards. See Product.
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

Milestone 0 (scaffold and pipeline) done: repo, scaffold, test environment, notes, privacy hooks, CI with reviewer and QA agents. Milestones 0 and 1 done (pipeline, test environment, CI, walks without AI). Milestone 2, in progress: product brief and mockups before more code. Then: 3 Claude in the loop (LLM module, interpret from the six questions, curate with "no story, no stop", opening hours, weekday and weather checks, staged progress streaming); 4 scout layer and city cache; 5 UI (request flow, map overlay, the wait, walk pages, around me, stories, footnoted walk); 6 trial, sign-in and plans; 7 hardening and the droplet. Before going public: squash the history and review this file for commercial detail.
