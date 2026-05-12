# Pitch deck skeleton

**Audience:** Bolna founders + interview panel. Ex-Zomato / Atlassian / BrowserStack. They've seen 1000 generic AI demos. Two minutes of attention per slide.

**Goal:** Show product-engineering judgment, not just full-stack execution.

## Slide 1 — Cover

> **Dukan**
> Voice-AI ordering agent for neighbourhood supermarkets and kiranas
>
> Parth Sapra · FSE Assignment · Bolna AI · 2026-05-13

Visual: clean type, single product screenshot in the corner.

## Slide 2 — The problem (the story)

> A friend was pitching a 6-outlet local supermarket in [city] on cutting customer-care costs. The owner spends ₹3.5L/month on phone operators, loses ~20% of evening calls to busy lines, and watches Zepto eat his market share.
>
> He doesn't need a chatbot. He needs an operator that never sleeps, knows his catalog, and recognises his regulars.

**Key:** open with the human story, not the technology.

Visual: a stat strip — "₹3.5L/month operator cost · 20% peak-hour call abandonment · 70% repeat callers"

## Slide 3 — The use case

> Inbound voice-AI agent that:
> - Recognises returning customers by phone number
> - Handles multilingual code-switching (Hindi / English / regional)
> - Looks up catalog items in real time
> - Confirms address and delivery slot
> - Escalates to humans for disputes, complaints, complex orders
> - Routes order to the merchant's dashboard

Visual: the call flow diagram from `docs/03-workflow.md`.

## Slide 4 — Why Bolna is the right voice layer

> Bolna's stated strengths map directly:
>
> | Bolna claim | Why this use case needs it |
> | --- | --- |
> | Multi-language, multi-accent | Tier-2 caller in Marathi can't be ignored |
> | Smart routing across providers | Cost discipline matters at 200 calls/day per outlet |
> | Tool calling | Catalog + address + order placement = all tool calls |
> | Strict safety controls | Agent must NOT promise discounts it can't apply |

**Key:** show you understand Bolna's positioning. This is the slide that says "I'm building on you intentionally, not by accident."

## Slide 5 — What I built

> 1. Voice agent on platform.bolna.ai with 5 tool calls (lookup_customer, catalog_search, validate_address, place_order, escalate_to_human)
> 2. Next.js web app: merchant dashboard, order queue, catalog management, escalation routing, live call status
> 3. End-to-end flow: customer calls Bolna number → agent handles order → web app receives via webhook → order appears in real-time
>
> Provider-agnostic architecture: voice layer is behind an abstraction with Vapi + custom-stack adapters as fallbacks.

Visual: architecture diagram from `docs/04-architecture.md`, screenshot of merchant dashboard.

## Slide 6 — Demo

Place a real call. Show the dashboard updating in real-time. Highlight:
- Multilingual interaction (switch to Hindi mid-call)
- Tool call latency (<500ms)
- Escalation working (mention "complaint" → agent hands off)

Slide content: "Demo recording embedded — [link]" and 3-4 screenshots.

## Slide 7 — Unit economics

The table from `docs/02-economics.md`:

| Line item | Today | With Dukan |
|---|---|---|
| 4 operators @ ₹20k | ₹80,000 | — |
| 1.5 operators retained | — | ₹30,000 |
| Voice provider (30k min) | — | ₹45,000 |
| Dukan platform fee | — | ₹15,000 |
| Workstation + manager | ₹15,000 | ₹7,000 |
| **Total** | **₹95,000** | **₹97,000** |

Plus hidden ROI: recovered abandoned orders (+₹60k-180k), systematic upsell (+₹70k-170k), off-hours coverage (+₹60k).

**Key:** show the merchant math. Most candidates won't.

## Slide 8 — What I'd build next

> If this got a green light:
> - Multi-tenant onboarding (catalog CSV import, agent prompt customization per merchant)
> - WhatsApp + SMS follow-up channel after call ends
> - POS integration (Petpooja, Zomato POS, simple CSV out)
> - A/B testing on agent prompts per merchant
> - Outbound: re-engagement calls to lapsed customers
> - Voice analytics: which SKUs get substituted most, language preferences by neighbourhood

**Key:** show product roadmap thinking, not just feature wishlist.

## Slide 9 — Thank you

Contact info. Repo link. Deployed app link.

---

## Notes for the recording

- **First 30 seconds matter the most.** Lead with the human story (a real person, a real problem), then dive into the tech.
- **Show the call live.** Don't just show a transcript — call from your phone and let the agent answer in front of the camera. Real audio is the most convincing thing.
- **Code transparency.** Open the agent prompt file in the repo while recording. Show the tool definitions. Show the abstraction layer.
- **End with the metric.** Close on "this saves a merchant ₹X/month and recovers ₹Y in lost orders" — not on "and this is the tech stack."
