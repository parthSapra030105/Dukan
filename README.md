# Dukan

**Voice-AI ordering agent for neighbourhood supermarkets and kiranas.**

Customers call the store's number. A multilingual AI agent answers, takes the order conversationally, looks up the catalog, confirms the delivery address, places the order, and routes it to the merchant's dashboard. Human operators are kept only for escalations and complex queries — not for the 70% of calls that are repeat orders for the same regulars.

---

## Why this exists

Mid-sized Indian neighbourhood supermarkets and kiranas do ₹50L–5Cr in monthly revenue. A meaningful share of that comes from phone orders — regulars calling for daily essentials. Each store hires 2–8 phone operators at ₹15–25k/month to handle 100–500 calls/day. Three failures of this model:

1. **Salary line item** — ₹2L–15L/year just in operator salaries
2. **Capacity ceiling** — peak-hour busy lines = lost orders = customers default to Zepto / BigBasket / Blinkit
3. **Margin leakage** — operators forget add-on suggestions and offer eligibility checks

Dukan replaces 60-80% of those calls with a voice agent that knows the catalog, recognises returning customers by phone number, handles language code-switching (Hindi-English-Marathi etc.), and only escalates to humans for genuine judgment calls.

## Project state

| Phase | Status |
|---|---|
| 1. Problem + use case lock | ✓ done |
| 2. Documentation (vision + economics + workflow + arch + pitch + lore) | ✓ done |
| 3. Web app scaffold + voice provider abstraction | ✓ done |
| 4. Schema migration + demo seed | ✓ done (file ready — apply in Supabase) |
| 5. Agent tool endpoints (5 endpoints, signature-verified) | ✓ done (stubs replaced with real DB logic) |
| 6. Bolna agent build at platform.bolna.ai | next |
| 7. Merchant dashboard pages (orders / catalog / escalations / dashboard) | next |
| 8. End-to-end demo + recording | next |
| 9. Deploy to Vercel + submission package | next |

## What to do before the next session

1. Open Supabase dashboard for the Dukan project → SQL editor → paste & run `supabase/migrations/0001_initial.sql`
2. Then paste & run `supabase/seed.sql` (one demo merchant + 40 SKUs + 5 customers)
3. Copy these into your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Sign up at platform.bolna.ai (if not already) and share the API base URL + auth header format you see in their dashboard. Until then, `BolnaProvider`'s create/dispatch methods have `TODO(verify with platform)` comments and inferred API shape.

## Docs

- [`docs/00-vision.md`](docs/00-vision.md) — the why, the bet, the moat
- [`docs/01-problem.md`](docs/01-problem.md) — problem definition + research-grounded framing
- [`docs/02-economics.md`](docs/02-economics.md) — unit economics, store-level ROI math
- [`docs/03-workflow.md`](docs/03-workflow.md) — the call flow + tool catalog + escalation rules
- [`docs/04-architecture.md`](docs/04-architecture.md) — system architecture
- [`docs/05-voice-provider-abstraction.md`](docs/05-voice-provider-abstraction.md) — vendor flexibility design
- [`docs/06-pitch.md`](docs/06-pitch.md) — deck skeleton + key slides
- [`docs/lore.md`](docs/lore.md) — origin story + narrative thread

## Stack

- **Frontend + Backend:** Next.js 16 (App Router) + TypeScript
- **Database:** Supabase Postgres + Realtime
- **Styling:** Tailwind v4
- **Voice (default):** Bolna AI
- **Voice (fallback):** Custom stack — Vapi orchestration + ElevenLabs TTS + Deepgram STT + Claude / GPT-4o-mini LLM
- **Deployment:** Vercel

## Voice-provider abstraction

Dukan is **not coupled to Bolna**. The voice layer is behind a `VoiceProvider` interface that has implementations for:
- `BolnaProvider` (default for the Bolna submission)
- `VapiProvider` (fallback / production option)
- `CustomProvider` (own orchestration: ElevenLabs + Deepgram + LLM)

Swapping providers = changing one config value. See `docs/05-voice-provider-abstraction.md`.
