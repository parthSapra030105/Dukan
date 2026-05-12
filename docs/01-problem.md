# Problem

## Who has this problem

**Primary persona:** Owner / manager of a mid-size neighbourhood supermarket or kirana in tier-1 or tier-2 Indian cities. Single or small chain (1-10 outlets). Revenue range: ₹50L-5Cr per outlet per month. Customer base: 70-80% repeat regulars within a 2-3km delivery radius.

**Examples of the type:**
- A 6-outlet local chain in Pune (e.g. the kind of business that inspired this project — neighbourhood multi-aisle stores doing groceries + dairy + household)
- Standalone kiranas with ₹40L+ monthly revenue and an existing delivery operation
- Local cloud-kitchen-adjacent grocers
- Mid-size dairies with daily reorder customers

## The phone-ordering reality

These businesses run a parallel "calls" channel alongside walk-ins and any app/WhatsApp ordering. Numbers from research conversations and industry benchmarks:

- **Call volume:** 100-500 inbound orders/day per outlet at peak season; 60-200 in off-season
- **Operator headcount:** 2-8 dedicated phone operators per outlet
- **Operator cost:** ₹15-25k/month each, plus headset/desk overhead
- **Call duration:** 4-8 minutes typical (small order, confirm address, confirm time)
- **Order composition:** 6-15 SKUs per order on average; customer recites items, operator types them into a POS or paper slip
- **Repeat rate:** 60-80% of callers are recognised regulars; same customer, same address, often similar basket week to week

## What goes wrong

### 1. Cost
A 4-operator outlet pays ₹60-100k/month in salaries to handle phones. Five outlets in a chain = ₹3-5L/month line item. That's a meaningful chunk of operating margin in a category where margins are 8-15%.

### 2. Capacity ceiling
Operators handle one call at a time. At peak (evening 6-9 PM, weekends), all lines busy = customer hangs up = order goes to Zepto or Blinkit or never gets placed. Lost orders compound: a customer who couldn't get through twice in a week often defaults to apps permanently.

### 3. Quality variance
Operators have good days and bad days. Phone orders get mis-recorded (wrong quantity, wrong item code, wrong address). Returns and refunds eat margin. Inconsistent upsell — some operators always suggest add-ons, most never do.

### 4. Training overhead
Onboarding a new operator = 2-3 weeks before they can handle calls solo. Attrition in this role is high (operators move to delivery, retail floor, or quit). The store re-trains constantly.

### 5. No data
Phone orders rarely get analysed. The merchant has no idea what's the abandonment rate by hour, what's the avg call duration, which SKUs get substituted most often, which regulars stopped calling.

## The voice-AI shape of the solution

The repeat-customer / familiar-catalog / structured-workflow nature of these calls maps almost perfectly to a voice AI agent's strengths:

| Why this works | Why generic voice AI would fail |
|---|---|
| Catalog is bounded (200-2000 SKUs) → tool-callable lookup | Generic chatbot has no inventory awareness |
| Customers are known → phone-to-profile lookup → personalisation | Stateless conversation = poor UX for regulars |
| Order structure is repetitive → constrained prompt | Open-ended chitchat is exactly what fails in production |
| Multilingual code-switching is universal → must be first-class | English-only voice AI is a non-starter in tier-2/3 India |
| Escalation triggers are knowable → script handles them | Without escalation, edge cases poison the experience |

## Adjacent problems we don't solve here

Worth listing because reviewers will ask:

- **Payment collection** — Dukan places orders; payment is COD or merchant-handled. Payment-gateway integration is a follow-on, not a v1.
- **Delivery routing** — orders go into the dispatch queue; the merchant's existing delivery process (own bike or aggregator) takes over.
- **Multi-store inventory sync** — single-outlet first. Cross-outlet inventory + warehouse sync is a follow-on.
- **Customer support / returns** — voice agent escalates these to humans. Not auto-handled in v1.
