# Dukan — Bolna FSE Assignment
## 8-slide deck content

> Paste each section into a slide in Google Slides / Canva / Keynote.
> Keep typography clean (one heading font, one body font, dark text on light).
> Pick a single accent colour — rose-600 (#e11d48) matches the product.

---

## Slide 1 — Title

# Dukan
### Voice-AI ordering for India's neighbourhood supermarkets

The द in Dukan: a kirana's voice operator, replaced.

—

Parth Sapra · Bolna Full-Stack Engineer assignment · May 2026
Live: **dukan.parthsapra.me** · Repo: **github.com/<your-handle>/dukan**

---

## Slide 2 — The problem

# Kiranas live on the phone — but phones don't scale.

- 13M+ neighbourhood supermarkets in India process ₹40 lakh-crore/yr; most still take orders by phone
- A 3-outlet kirana spends **₹95k/month** on phone operators (4 humans × ₹22k)
- At peak hours, **15–25% of incoming calls drop** — customer defaults to Zepto/Blinkit
- The work is repetitive: **60–80% repeat callers, same regulars, same baskets**

**Outcome metric:** call-to-order conversion at peak.
Today: ~60%. With Dukan: 90%+.

---

## Slide 3 — The workflow

# How a call works

1. Customer requests a callback from `dukan.app` — phone, name, address saved upfront
2. Bolna dials. Agent **greets by name in their preferred language** (Hindi / English / Marathi)
3. Customer dictates the basket; agent calls `catalog_search` per item — handles Devanagari, aliases, code-switching
4. Agent reads back, confirms saved address, places the order
5. Order lands on the merchant dashboard **in realtime**; SMS dispatched
6. Disputes / refunds / bulk orders / explicit "manager se baat karwao" → **escalate** to a human

End-to-end, a typical 8-item order closes in 2–3 minutes with zero human time.

---

## Slide 4 — Watch the demo

# Two recordings, ~7 minutes total

| File | Shows |
|---|---|
| `Dukan + Bolna Customer Call Demo.mp4` | Customer side — submitting the form, picking up, ordering |
| `Dukan + Bolna Client Portal Demo.mp4` | Merchant side — live call indicator, order card landing, transcript, escalation flow, the `/agent` diff view |
| `Dukan + Bolna Full Customer Call Recording.aac` | Uncut call audio |

**Things to listen / watch for:**
- Hindi / English code-switching mid-sentence (agent never narrates the switch)
- "Half kg tamatar" → noun extraction + Devanagari alias hit, in-stock confirmation
- Mic indicator pulses red on dashboard the moment the call connects
- Order card appears on `/orders` **before** the call ends
- `/agent` page shows **5/5 tools synced live with Bolna** — proves the deploy is real

---

## Slide 5 — Architecture

# Provider-agnostic voice layer

```
Web app
  ↓
VoiceProvider interface  ← src/lib/voice/types.ts
  ↓
┌──────────┬─────────┬──────────┐
│ Bolna    │ Vapi    │ Custom   │
│ (live)   │ (stub)  │ (stub)   │
└──────────┴─────────┴──────────┘
  ↓
Phone network  ↔  Customer
```

- One env var (`VOICE_PROVIDER`) swaps the voice backend without touching application code
- `/agent` page renders **live state from Bolna's API** + diffs it against `tools-catalog.ts` (the local source of truth) — drift is visible
- Tool auth: header-based shared secret (Bolna's runtime IPs shift; allowlist would be fragile). Webhook auth: IP-allowlist (Bolna's webhook origin is stable)

**Stack:** Next.js 16 (App Router, Server Components) · TypeScript · Supabase (Postgres + Realtime + Auth) · Tailwind v4 · Bun · Vercel

---

## Slide 6 — The 5 tools

# The agent's API to the business

| Tool | When called | Returns |
|---|---|---|
| `lookup_customer` | Call start | id, name, language, last order, saved addresses |
| `catalog_search` | Per item | SKU, name, price, unit, in-stock, category |
| `validate_address` | New address | Pincode + delivery-zone check |
| `place_order` | After explicit confirm | order_id, SMS status, total |
| `escalate_to_human` | 7 triggers | queued, position, escalation_id |

- Tools are configured via `scripts/create-bolna-agent.ts` and `patch-tool-headers.ts` — **reproducible from the repo**, no dashboard clicking
- `catalog_search` tokenises, drops stop-words ("kilo", "किलो", "एक"…), and searches Devanagari + romanised aliases + name in 3 languages. Effectively unmissable on stocked SKUs.
- `place_order` re-verifies SKU + price against the catalog server-side — the LLM never sets the total

---

## Slide 7 — Economics

# Why a kirana would pay for this

| | Today | With Dukan |
|---|---|---|
| Operators per outlet | 4 × ₹22k = **₹88k/mo** | 1 supervisor × ₹22k |
| Concurrent calls | 4 | Effectively unlimited |
| Peak-hour drop rate | 15–25% | < 2% |
| Per-call variable cost | ~₹3 (human) | ~₹2 (Bolna trial-grade) |
| Hours/day open | 12 | 24 (overnight callbacks) |

**Per-outlet savings: ~₹65k/month. Break-even in week 1.**

**The moat:** the catalog (aliases, substitution rules, brand prefs) and the saved-address graph. Both compound per outlet, per month. Switching costs grow with usage.

---

## Slide 8 — Roadmap & ask

# What's next

**v1 (this submission)** — outbound callback flow, 5 tools, realtime dashboard, escalation queue, provider abstraction, live Bolna sync verification

**Next 2 weeks**
- Inbound numbers (architecture is ready — needs Pvt Ltd KYC)
- WhatsApp confirmation + Razorpay payment link
- Catalog CMS (operator adds SKUs without seed edits)

**Next quarter**
- Browser-audio operator handoff during escalation
- Last-order substitution prompts ("aata khatam ho gaya — wohi laaun?")
- Multi-outlet routing by pincode

**What I'd ask Bolna for**
- A lower KYC bar for verified outbound trial accounts (the biggest blocker for indie builders)
- First-party SMS dispatch from the agent
- Tool-call retry hook + structured error surface

—

Thank you. — Parth
