# Call workflow

## Trigger model — callback (v1) + inbound (post-submission)

**v1 demo:** Customer fills the "Request a callback" form on the store's website (phone + optional name + language). Web app POSTs to `/api/voice/dispatch-callback` → triggers `voiceProvider.dispatchOutbound` → Bolna calls the customer. This avoids the Indian Pvt Ltd KYC required for inbound numbers.

**Post-submission inbound:** Once the merchant completes Bolna's compliance KYC and provisions an inbound number, calls to that number route to the same agent. **The conversation logic, tools, and webhook are identical in both directions** — only the trigger differs.

## The high-level call flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  v1 (CALLBACK):   Customer fills form → /api/voice/dispatch-callback │
│                   → Bolna outbound to customer's phone               │
│                                                                       │
│  post-submission (INBOUND): Customer dials merchant's number          │
│                             → Bolna routes to the same agent          │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Bolna agent runtime                                                 │
│  → agent.greeting in customer's preferred language                   │
│  → tool: lookup_customer(caller_phone)                               │
│    ├ known customer → personalised greeting + last-order context     │
│    └ unknown customer → neutral greeting + intent capture            │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Item-by-item ordering loop (until customer says "done")             │
│                                                                       │
│  Customer: <item in natural speech, possibly multilingual>           │
│       ↓                                                               │
│  Agent → tool: catalog_search(query, language)                       │
│       ├ exact match → confirm qty                                     │
│       ├ multiple matches → ask which                                  │
│       ├ no match → suggest closest 2-3                                │
│       └ out of stock → suggest substitute                             │
│       ↓                                                               │
│  Agent reads back item + qty → customer confirms                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Address + delivery slot                                              │
│  → known customer: confirm on-file address ("same as last time?")    │
│  → new customer: capture address → tool: validate_address             │
│  → ask preferred delivery slot                                       │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Summary + confirmation                                               │
│  Agent reads back: "<list> totalling ₹X, deliver to <address>        │
│   between <slot>, payment by COD. Should I place this?"              │
│  Customer: yes/no/modify                                              │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Agent → tool: place_order(items, address, slot, total)              │
│  Agent → SMS confirmation triggered                                   │
│  Agent → goodbye in default language                                  │
└─────────────────────────────────────────────────────────────────────┘
```

## Escalation rules

The agent calls `escalate_to_human(reason)` and gracefully hands off when ANY of:

1. **3-strike misunderstanding** — same item asked 3 times, still ambiguous
2. **Payment dispute** — customer mentions credit, last bill, missing item from previous order
3. **Refund / return request** — agent does not handle these
4. **Complaint about service** — angry tone detected OR keywords like "manager," "complain"
5. **Off-menu request** — customer asks for something the store does not stock (e.g. medicine, alcohol)
6. **Bulk / wholesale order** — order size > 50 items OR total > ₹10,000 (caps differ per merchant config)
7. **Customer explicitly asks** — "main bhaiya se baat karna chahta hu"

On escalation, the agent says: "Ek minute, main aapko humare team member se baat karwata hu" and the call routes to a human queue. The transcript so far + escalation reason is shown to the operator before they pick up.

## Tool catalog

All tools are HTTP webhooks the voice provider calls during the conversation. JSON payloads, signature-verified.

### `lookup_customer`
```ts
POST /api/agent/tools/lookup-customer
Body: { phone: string }
Returns: {
  found: boolean
  customer?: {
    id: string
    name: string
    preferred_language: 'hi' | 'en' | 'mr' | ...
    last_order?: { items: Array<{ name; qty }>; date: string }
    saved_addresses: Array<{ label; full; lat; lng }>
  }
}
```

### `catalog_search`
```ts
POST /api/agent/tools/catalog-search
Body: { query: string; language: string; merchant_id: string }
Returns: {
  results: Array<{
    sku: string
    name_localized: string  // in the requested language
    aliases: string[]       // common ways customers say it
    price: number           // in paise
    unit: '500g' | '1kg' | '12-pack' | etc.
    in_stock: boolean
    substitutes?: Array<{ sku; name; reason }>
  }>
}
```

### `validate_address`
```ts
POST /api/agent/tools/validate-address
Body: { text: string; merchant_id: string }
Returns: {
  resolved: boolean
  full_address?: string
  lat?: number
  lng?: number
  within_delivery_zone: boolean
  clarification_needed?: string  // e.g. "which landmark do you mean?"
}
```

### `place_order`
```ts
POST /api/agent/tools/place-order
Body: {
  call_id: string
  customer_id: string
  items: Array<{ sku; qty; price_at_order }>
  delivery_address: string
  delivery_slot: string
  total: number
  language: string
}
Returns: { order_id: string; sms_sent: boolean }
```

### `escalate_to_human`
```ts
POST /api/agent/tools/escalate
Body: { call_id: string; reason: string; transcript_so_far: string }
Returns: { queued: boolean; queue_position: number }
```

## Prompt structure (high level — fleshed out in agent.md later)

```
ROLE: Warm, efficient phone operator for <Merchant Name>.
LANGUAGES: Default <hi-IN>, switch fluidly to <en-IN, mr-IN> if customer does.
NEVER: discuss politics, give medical advice, accept orders for items not in catalog.
ALWAYS: confirm qty before adding, read back total, suggest one related add-on per order.
ESCALATE: when <triggers above>.
TOOLS: <list>
```

## Latency targets

- Tool-call response: <500ms p95 (catalog lookups especially — every call has 6-15 of these)
- Agent response after tool: voice provider's TTS latency, target <800ms perceived
- End-to-end call: target 2-4 minutes for a typical 8-item order (vs 5-8 min for human operator)
