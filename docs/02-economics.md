# Unit economics

This document carries the merchant-side ROI math + Dukan's pricing thesis. Numbers are estimates derived from industry baselines, not from a customer's books — but they're the kind of numbers you can defend in a pitch.

## Merchant-side ROI: a representative outlet

**Assumptions** (single outlet, mid-size kirana / supermarket):
- 200 inbound phone orders / day → ~6,000 / month
- Average call duration: 5 minutes
- 4 phone operators at ₹20,000 / month each
- 5-min average call × 6,000 calls = **30,000 voice-minutes / month**

### Current cost (human only)

| Line item | ₹ / month |
|---|---|
| 4 operators @ ₹20k | 80,000 |
| Workstation + headsets (amortised) | 5,000 |
| Manager oversight (1 FTE allocation) | 10,000 |
| **Total** | **₹95,000** |

### With Dukan (voice AI + 1-2 humans for escalation)

Assume 70% of calls are handled fully by the agent, 30% escalate to a human or partial-human flow:

| Line item | ₹ / month |
|---|---|
| Voice provider minutes (30k min × ₹1.50) ⁽¹⁾ | 45,000 |
| 1.5 operators retained (escalations + complex orders) | 30,000 |
| Dukan platform fee (placeholder: ₹15k flat or ₹0.50/call) | 15,000 |
| Workstation + manager (reduced) | 7,000 |
| **Total** | **₹97,000** |

At 70% AI handling, costs are roughly flat — but capacity becomes elastic, missed-call rate drops, and operator quality issues vanish for the AI-handled portion.

### When the unit economics flip

**At 80% AI handling:**
- 1 retained operator: ₹20k
- Total: ₹87,000 → ~₹8k saved (8%)

**At 85% AI handling + chain of 5 outlets sharing 2 escalation operators:**
- Operator cost per outlet: ₹16k
- Total: ₹83,000 → ~₹12k saved (13%)

**At scale (10 outlets, 4 shared escalation operators, volume discount on voice):**
- Voice minutes drop to ₹1.00/min
- Operator cost per outlet: ₹8k
- Per-outlet total: ~₹65,000 → ₹30,000 saved (32%)

⁽¹⁾ Voice-provider pricing is the largest variable. Bolna's published rates vary by configuration; Vapi/ElevenLabs combinations come in at ₹0.80-2.50/min depending on volume. Dukan's pricing model assumes we pass through voice costs and charge a platform/seat fee.

## Hidden ROI lines (not in the table)

Lines that don't show up as direct savings but matter:

1. **Recovered lost orders.** Industry data: 15-25% of peak-hour calls go unanswered today. If Dukan recovers 50% of that, and each call = ₹400 AOV → **+₹60k-180k/month in recovered revenue** for the same outlet.

2. **Systematic upsell.** AI agent always suggests add-ons based on basket. Industry uplift: 3-7% AOV. On ₹24L/month GMV (200 × 30 × ₹400) → **+₹70k-170k/month** in AOV uplift.

3. **Data + analytics.** Every call recorded, transcribed, tagged with outcome. Merchant gets dashboards they've never had before. Drives loyalty programs, supplier negotiation, demand forecasting.

4. **Customer satisfaction (NPS).** No more "all lines busy" tone. Customers get through every time. Defensible against Zepto / Blinkit.

5. **Off-hours coverage.** Today: calls outside operator shifts = lost. With Dukan: agent runs 24/7. Even 5 night orders / day at ₹400 = +₹60k/month.

**Aggressive but defensible total:** recovered orders + upsell + off-hours = **+₹2L-5L/month per outlet**, on top of operator savings.

## Dukan's revenue model (rough draft)

For the pitch deck, position three tiers:

| Tier | Setup | Monthly | Includes |
|---|---|---|---|
| Starter | ₹15k one-time | ₹15k flat + voice passthrough | 1 outlet, 1 language, basic dashboard |
| Growth | ₹25k one-time | ₹25k flat + voice passthrough | Up to 3 outlets, 3 languages, escalation routing, basic analytics |
| Chain | Custom | Custom (₹50k+) + voice passthrough | Unlimited outlets, all languages, custom integrations (POS sync), priority support |

For Bolna reviewers, the relevant signal isn't the exact numbers — it's that **you priced it like an operator, not like a developer.** The flat + passthrough model is how you avoid scope creep on the voice usage while maintaining predictable margins.

## What to put in the deck

One slide, three columns: Current cost / Dukan cost / Hidden ROI. Footnote the assumptions. Have the chain-of-5 / 10-outlet escalation slide ready in appendix for the "but does it scale" question.
