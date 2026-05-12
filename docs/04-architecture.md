# Architecture

## System overview

```
       ┌──────────────────┐
       │  Customer phone  │
       └────────┬─────────┘
                │ PSTN
                ▼
       ┌──────────────────┐
       │ Voice provider   │   Bolna (default) | Vapi | Custom
       │ (telephony +     │
       │  agent runtime)  │
       └────────┬─────────┘
                │ HTTPS (tool calls + events)
                ▼
       ┌────────────────────────────────────────────┐
       │ Dukan Next.js app (Vercel)                 │
       │ ┌─────────────────────────────────────┐   │
       │ │ /api/agent/tools/*  (webhook tools) │   │
       │ │ /api/voice/webhook  (call events)   │   │
       │ │ /api/voice/dispatch (outbound)      │   │
       │ │ /api/merchant/*     (dashboard API) │   │
       │ └─────────────────────────────────────┘   │
       │ ┌─────────────────────────────────────┐   │
       │ │ Voice provider abstraction          │   │
       │ │ src/lib/voice/                      │   │
       │ │   provider.ts        (factory)      │   │
       │ │   types.ts           (interfaces)   │   │
       │ │   bolna/                            │   │
       │ │   vapi/                             │   │
       │ │   custom/                           │   │
       │ └─────────────────────────────────────┘   │
       │ ┌─────────────────────────────────────┐   │
       │ │ Merchant UI (server components +    │   │
       │ │ Realtime subscriptions)             │   │
       │ └─────────────────────────────────────┘   │
       └────────────────┬─────────────────────────┘
                        │
                        ▼
       ┌────────────────────────────────────────────┐
       │ Supabase Postgres                           │
       │ - merchants, outlets, catalog, customers   │
       │ - calls, orders, escalations, transcripts  │
       │ + Realtime subscriptions on orders + calls │
       └────────────────────────────────────────────┘
```

## Data model

```
merchants
├── id (uuid)
├── name
├── default_language ('hi-IN', 'en-IN', etc.)
├── timezone
└── settings (jsonb)  -- escalation triggers, voice config

outlets
├── id
├── merchant_id → merchants
├── name
├── address
├── phone_number       -- inbound number
└── delivery_zones (jsonb)  -- polygons or pincode lists

catalog_items
├── id
├── merchant_id → merchants
├── sku
├── name_default
├── name_localized (jsonb)   -- { hi: '...', en: '...', mr: '...' }
├── aliases (text[])          -- ['dahi', 'curd', 'yoghurt', 'mosaranna']
├── price_paise
├── unit
├── stock_count
├── category
└── active (bool)

customers
├── id
├── merchant_id → merchants
├── phone (unique per merchant)
├── name
├── preferred_language
├── total_orders
└── lifetime_value_paise

customer_addresses
├── id
├── customer_id → customers
├── label ('home', 'office', etc.)
├── full_text
├── lat, lng
└── is_default (bool)

calls
├── id (uuid)
├── merchant_id → merchants
├── outlet_id → outlets
├── customer_id → customers (nullable, set after lookup)
├── caller_phone
├── direction ('inbound' | 'outbound')
├── started_at, ended_at
├── duration_seconds
├── language_detected
├── outcome ('order_placed' | 'escalated' | 'abandoned' | 'no_intent')
├── provider ('bolna' | 'vapi' | 'custom')
├── provider_call_id          -- vendor's ID
├── transcript (jsonb)         -- chronological events
├── recording_url
└── tool_calls (jsonb)         -- audit of what tools the agent called

orders
├── id
├── merchant_id, outlet_id, customer_id
├── call_id (nullable, FK to calls)
├── source ('phone' | 'web' | 'walk-in')
├── status ('pending' | 'confirmed' | 'dispatched' | 'delivered' | 'cancelled')
├── items (jsonb)             -- [{sku, name, qty, price_at_order}]
├── delivery_address_id → customer_addresses
├── delivery_slot
├── total_paise
├── language
└── notes

escalations
├── id
├── call_id → calls
├── reason
├── transcript_snapshot
├── status ('queued' | 'taken' | 'resolved' | 'abandoned')
├── operator_id (nullable)
└── resolution_notes
```

## Realtime flow

Two reasons to use Supabase Realtime:

1. **Dashboard live-updates** — when a call ends and the agent calls `place_order`, the merchant's `/dashboard` and `/orders` views should update without refresh. Realtime subscription on `orders` table where `merchant_id = X`.

2. **Escalation queue alerts** — when an escalation row is inserted, operators on `/escalations` get a notification badge / sound. Realtime subscription on `escalations`.

## Webhook security

All tool-call webhooks from the voice provider need signature verification:
- Bolna: HMAC-SHA256 signature header (per their docs)
- Vapi: shared-secret header
- Custom: our own HMAC scheme

`src/lib/voice/<provider>/verify.ts` handles this. Webhook handlers reject unverified requests.

## Multi-tenant readiness (schema only — code is single-tenant for v1)

Every domain table carries `merchant_id`. RLS policies are stubbed but not enforced in v1 (we run as service-role). When we add merchant auth + per-merchant dashboards, RLS gets turned on. No schema changes needed.

## Deployment

- **Vercel** — Next.js app, serverless functions
- **Supabase Cloud** — DB + Realtime
- **Bolna platform** — voice agent runtime (or Vapi for fallback)
- **Vercel KV / Upstash** — rate limiting on public webhooks, signed-URL cache for recordings (optional v1.5)

## Local dev

```bash
bun install
bun run dev               # next.js
supabase start            # local DB (optional; can use cloud)
```

Env vars (see `.env.example`):
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
VOICE_PROVIDER=bolna           # 'bolna' | 'vapi' | 'custom'
BOLNA_API_KEY
BOLNA_WEBHOOK_SECRET
VAPI_API_KEY                   # only if VOICE_PROVIDER=vapi
ELEVENLABS_API_KEY             # only if VOICE_PROVIDER=custom
DEEPGRAM_API_KEY               # only if VOICE_PROVIDER=custom
OPENROUTER_API_KEY             # for custom LLM
```
