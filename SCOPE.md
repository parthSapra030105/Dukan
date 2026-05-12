# SCOPE — The contract

This is the locked scope for the Bolna FSE assignment submission. Anything proposed outside this list is **scope creep**. Process for adding/removing scope: update this file BEFORE the work, with rationale.

## Demo path: outbound callback (NOT inbound)

**Hard constraint:** Inbound phone numbers on Bolna require Indian Pvt Ltd KYC (CIN + GST). Parth is an individual; we cannot procure an inbound number in our timeline. **Demo runs via Bolna's outbound flow on a $5 trial account with verified phone numbers.** The architecture supports inbound — production-deployed merchants would complete KYC and add inbound. The submission demonstrates the callback variant.

## In scope (must ship for submission)

### Voice + agent
- [x] Voice provider abstraction (`VoiceProvider` interface)
- [x] Bolna provider — real implementation (post-refactor)
- [x] Vapi provider — stubbed (throws "not implemented") for v1
- [x] Custom provider — stubbed (throws "not implemented") for v1
- [ ] Webhook source-IP allowlist verification (Bolna does NOT sign webhooks; security = IP `13.203.39.153`)
- [ ] 5 tool endpoints: lookup_customer, catalog_search, validate_address, place_order, escalate_to_human
- [ ] `/api/voice/dispatch-callback` — public endpoint that triggers an outbound call
- [ ] `/api/voice/webhook` — single end-of-call ingestion (Bolna posts the full execution record once, not granular events)
- [ ] Bolna agent created via `scripts/create-bolna-agent.ts` (reproducible from repo, not click-driven)
- [ ] Bolna agent prompt: Hindi default, English fallback, structured order-taking + escalation triggers

### Database
- [ ] Single Supabase project (separate from HookUp)
- [ ] Schema: merchants, outlets, catalog_items, customers, customer_addresses, calls, orders, escalations
- [ ] Seed: 1 demo merchant (RK-Bazar-style) + 30-50 SKUs + 5 demo customers
- [ ] RLS NOT enforced (service-role only, single-tenant)

### Web app — merchant-facing + public callback form
- [ ] `/` — landing page (hero + value prop + **callback request form: phone input → triggers outbound**)
- [ ] `/dashboard` — KPIs: today's orders, avg value, escalation rate, language breakdown, active calls
- [ ] `/orders` — order queue with status (incoming / confirmed / dispatched / delivered / cancelled)
- [ ] `/orders/[id]` — order detail: transcript, audio playback, line items, delivery address
- [ ] `/catalog` — read-only catalog list (CRUD is out — admin in seed only)
- [ ] `/escalations` — calls that needed human takeover, with reason + transcript
- [ ] `/agent` — read-only view of the agent's system prompt + tool schemas
- [ ] Realtime: dashboard + order queue auto-update via Supabase Realtime

### Deployment + submission
- [ ] Vercel deploy with public URL
- [ ] GitHub repo (clean README, env.example, architecture diagram)
- [ ] 5-7 min screen recording (real phone call demo)
- [ ] 7-9 slide deck (problem → demo → economics → roadmap)
- [ ] Google folder `ParthSapra_FSE@bolna` with deck + recording + repo link + deployed link
- [ ] Submitted via Bolna's gforms link

## Out of scope (NOT shipping for v1 submission)

These are tempting but explicitly out. If any of these get suggested, the answer is "after submission."

- ❌ Inbound phone numbers (requires Indian Pvt Ltd KYC — post-submission)
- ❌ Multi-merchant / multi-tenant auth
- ❌ Merchant login / sign-up flow (everything runs as a demo merchant)
- ❌ Customer-facing app (customer interacts via phone only)
- ❌ Payment processing / payment gateway
- ❌ Delivery routing / driver app
- ❌ POS integration (Petpooja, Zomato POS, etc.)
- ❌ Catalog CRUD UI (seeded once, edit via DB or seed file)
- ❌ Multi-store inventory sync
- ❌ Returns / refunds workflow
- ❌ WhatsApp / SMS follow-up channel (mentioned only in pitch roadmap)
- ❌ Outbound calls (we handle inbound only for v1)
- ❌ Voice provider integration with Vapi or Custom — adapter stubs are fine, no real API calls
- ❌ User accounts / authentication on the merchant dashboard
- ❌ Analytics dashboards beyond the basic KPIs
- ❌ A/B testing on agent prompts
- ❌ Cron jobs / scheduled tasks
- ❌ Email pipeline / inbox ingestion
- ❌ Notion / external integrations
- ❌ Internationalisation of the UI (English UI only; Hindi is for the voice agent)

## Time budget

| Phase | Hours | Status |
|---|---|---|
| 1. Docs + lore | 0.75 | ✓ done |
| 2. Web app scaffold + provider abstraction | 2.0 | in progress |
| 3. Bolna agent (platform.bolna.ai) | 2.5 | pending |
| 4. Web app pages + tool endpoints | 5.0 | pending |
| 5. Integration + demo testing | 1.5 | pending |
| 6. Submission package (deck + recording + deploy) | 2.0 | pending |
| **Total** | **~14 hrs** | |

## Rules of engagement

1. **No code outside this scope without updating SCOPE.md first.**
2. **No "while we're at it" additions.** New ideas → notes file, not the build.
3. **Stop when the checklist item is done.** Don't polish past the bar.
4. **Demo > beauty.** If something works but isn't pretty, ship it.
5. **Real before perfect.** Phone call working > dashboard looking great.

## How to use this file

Before any build session: open SCOPE.md, pick the next unchecked item, build only that.
After any build session: mark it checked.
If tempted to do more: write the idea in `docs/post-submission.md` instead.
