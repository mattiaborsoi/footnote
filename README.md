# Footnote

A walk designed around you.

Describe the walk you are in the mood for: where you start, what you are curious about, what to avoid. Footnote builds one from real places: an ordered set of stops on a map, each with a short story and a line on why it is for you, with time, distance and steps, exportable to Google Maps.

**Claude curates, it never invents.** Places come from open data (OpenStreetMap, Wikidata, Wikipedia). The model only chooses and orders stops from candidates the app supplies and writes from the facts attached to them. Its output is schema-checked, unknown places are rejected, and a routing service, not the model, computes time and distance.

## Status

Early development. Not usable yet.

## Self-hosting (development)

Docker is the only requirement.

```bash
cp .env.example .env   # edit it, then chmod 600 .env
docker compose up -d --build
```

App on http://localhost:3002, mail catcher on http://localhost:8025. `LLM_BASE_URL` must point at an OpenAI-compatible chat endpoint, for example LiteLLM in front of the Anthropic API.

## Data and attribution

Map data © OpenStreetMap contributors, ODbL. Place descriptions are derived from Wikipedia, CC BY-SA. The licence for this code will be chosen before the first public release.
