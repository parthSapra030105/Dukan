# Dukan — Bolna FSE Assignment Submission

**Parth Sapra** · May 2026

---

## Links

- **Deployed app:** https://dukan.parthsapra.me
- **GitHub:** https://github.com/<your-handle>/dukan
- **Demo credentials** (prefilled on `/login`):
  - Email: `admin@dukan.demo`
  - Password: `dukan-demo-2026`

---

## What this is

**Dukan** is a voice-AI ordering platform for Indian kirana stores (neighbourhood supermarkets). A customer requests a callback from the homepage; the Bolna-powered agent dials them, takes their order in Hindi / English / Marathi (and code-switches naturally), and writes the order to the merchant's dashboard in realtime. Disputes, refunds, and bulk orders escalate to a human operator.

The architecture is **provider-agnostic** — the voice backend sits behind a `VoiceProvider` interface with adapters for Bolna (live), Vapi (stub), and a custom stack (stub). One env var swaps providers.

---

## Files in this folder

| File | What it shows |
|---|---|
| `Dukan + Bolna Customer Call Demo.mp4` | Customer side — form submission → call → conversation |
| `Dukan + Bolna Client Portal Demo.mp4` | Merchant side — live call indicator, order landing, transcript, escalation, `/agent` diff view |
| `Dukan + Bolna Full Customer Call Recording.aac` | Uncut call audio |
| `Dukan_FSE_Deck.pdf` | 8-slide deck (problem → workflow → demo → architecture → tools → economics → roadmap) |
| `SUBMISSION.md` | This file |

---

## How to try it yourself

1. Open https://dukan.parthsapra.me
2. Submit the callback form with a **Bolna-verified phone number** (Bolna trial limitation)
3. Pick up; place an order. Suggested: "Ek kilo aloo, ek Parle-G."
4. Sign in to the dashboard at `/login` (credentials prefilled)
5. Watch the order land on `/dashboard` in realtime; click into it for transcript + status timeline
6. Visit `/agent` to see the live diff between local source-of-truth and the deployed Bolna agent (5/5 tools synced)

---

## Highlights worth noting

- **`/agent` is a live diff view** — it fetches the deployed agent from Bolna's API on each render and compares against the local `tools-catalog.ts`. Tool drift, missing tools, or mismatched required-params surface as badges per tool.
- **Pre-call customer upsert** — when the form is submitted, the customer + address are saved before dispatch, so `lookup_customer` returns `found: true` and the agent greets by name from the first word.
- **Multi-lingual catalog search** — the `catalog_search` tool tokenises the query, drops stop-words ("kilo", "किलो", "एक"…), and searches Devanagari + romanised aliases + Hindi/English names. Effectively unmissable on stocked SKUs.
- **All Bolna config is reproducible from the repo** — `scripts/create-bolna-agent.ts`, `patch-tool-headers.ts`, `sync-system-prompt.ts`. No clicking through the Bolna dashboard.
- **Auth boundary on tool endpoints** is a shared-secret header, not an IP allowlist — Bolna's tool runtime IPs shift, so the allowlist approach is fragile here. Webhook endpoint stays IP-allowlisted (that origin is stable).

---

## Tech stack

Next.js 16 (App Router, Server Components, Server Actions) · TypeScript strict · Supabase (Postgres + Realtime + Auth via `@supabase/ssr`) · Tailwind v4 · Bun · Vercel · Bolna AI (live) · Deepgram (STT) · Asteria (TTS)

---

## Time budget

| Phase | Spent |
|---|---|
| Docs + problem framing | ~1 hr |
| Voice provider abstraction + Bolna integration | ~3 hrs |
| 5 tool endpoints + agent prompt | ~3 hrs |
| Web app pages + realtime | ~5 hrs |
| Auth wall + polish | ~1.5 hrs |
| Submission package (deck + recording) | ~1 hr |
| **Total** | **~14.5 hrs** |

---

Thanks for the assignment — it was a pleasure to build. Happy to walk through any part of it.

— Parth
