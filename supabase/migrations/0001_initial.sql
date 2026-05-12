-- ============================================================================
-- Dukan — initial schema (single-tenant, multi-tenant headroom)
-- Spec: docs/04-architecture.md
-- ============================================================================

create extension if not exists "pgcrypto";

-- updated_at trigger helper
create or replace function trigger_set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- merchants
-- ---------------------------------------------------------------------------
create table if not exists merchants (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  default_language    text not null default 'hi-IN',
  timezone            text not null default 'Asia/Kolkata',
  settings            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger set_updated_at_merchants
  before update on merchants
  for each row execute function trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- outlets — physical store locations under a merchant
-- ---------------------------------------------------------------------------
create table if not exists outlets (
  id                  uuid primary key default gen_random_uuid(),
  merchant_id         uuid not null references merchants(id) on delete cascade,
  name                text not null,
  address             text,
  phone_number        text,                          -- public inbound number
  delivery_zones      jsonb not null default '[]'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists outlets_merchant_idx on outlets (merchant_id);

create trigger set_updated_at_outlets
  before update on outlets
  for each row execute function trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- catalog_items — products the agent can sell
-- ---------------------------------------------------------------------------
create table if not exists catalog_items (
  id                  uuid primary key default gen_random_uuid(),
  merchant_id         uuid not null references merchants(id) on delete cascade,
  sku                 text not null,
  name_default        text not null,
  name_localized      jsonb not null default '{}'::jsonb,  -- {hi: '...', en: '...', mr: '...'}
  aliases             text[] not null default '{}',
  price_paise         int not null,
  unit                text not null,                  -- '500g', '1kg', '12-pack'
  stock_count         int,                            -- null = unlimited / not tracked
  category            text,
  active              boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (merchant_id, sku)
);

create index if not exists catalog_merchant_active_idx on catalog_items (merchant_id, active);
create index if not exists catalog_aliases_gin on catalog_items using gin (aliases);

create trigger set_updated_at_catalog_items
  before update on catalog_items
  for each row execute function trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- customers — phone-keyed, per-merchant
-- ---------------------------------------------------------------------------
create table if not exists customers (
  id                  uuid primary key default gen_random_uuid(),
  merchant_id         uuid not null references merchants(id) on delete cascade,
  phone               text not null,
  name                text,
  preferred_language  text,
  total_orders        int not null default 0,
  lifetime_value_paise bigint not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (merchant_id, phone)
);

create index if not exists customers_merchant_phone_idx on customers (merchant_id, phone);

create trigger set_updated_at_customers
  before update on customers
  for each row execute function trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- customer_addresses
-- ---------------------------------------------------------------------------
create table if not exists customer_addresses (
  id                  uuid primary key default gen_random_uuid(),
  customer_id         uuid not null references customers(id) on delete cascade,
  label               text,                           -- 'home', 'office'
  full_text           text not null,
  lat                 numeric(9, 6),
  lng                 numeric(9, 6),
  is_default          boolean not null default false,
  created_at          timestamptz not null default now()
);

create index if not exists addresses_customer_idx on customer_addresses (customer_id);

-- ---------------------------------------------------------------------------
-- calls — every voice interaction
-- ---------------------------------------------------------------------------
create table if not exists calls (
  id                  uuid primary key default gen_random_uuid(),
  merchant_id         uuid not null references merchants(id) on delete cascade,
  outlet_id           uuid references outlets(id) on delete set null,
  customer_id         uuid references customers(id) on delete set null,
  caller_phone        text not null,
  direction           text not null check (direction in ('inbound', 'outbound')),
  started_at          timestamptz not null default now(),
  ended_at            timestamptz,
  duration_seconds    int,
  language_detected   text,
  outcome             text check (outcome in ('order_placed', 'escalated', 'abandoned', 'no_intent', 'in_progress')),
  provider            text not null check (provider in ('bolna', 'vapi', 'custom')),
  provider_call_id    text,
  transcript          jsonb not null default '[]'::jsonb,
  recording_url       text,
  tool_calls          jsonb not null default '[]'::jsonb,
  provider_cost_paise int,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists calls_merchant_started_idx on calls (merchant_id, started_at desc);
create index if not exists calls_customer_idx on calls (customer_id) where customer_id is not null;
create unique index if not exists calls_provider_call_id_idx on calls (provider, provider_call_id) where provider_call_id is not null;

create trigger set_updated_at_calls
  before update on calls
  for each row execute function trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- orders — orders placed via agent (or other channels)
-- ---------------------------------------------------------------------------
create table if not exists orders (
  id                  uuid primary key default gen_random_uuid(),
  merchant_id         uuid not null references merchants(id) on delete cascade,
  outlet_id           uuid references outlets(id) on delete set null,
  customer_id         uuid not null references customers(id) on delete cascade,
  call_id             uuid references calls(id) on delete set null,
  source              text not null check (source in ('phone', 'web', 'walk-in')),
  status              text not null default 'pending'
                       check (status in ('pending', 'confirmed', 'dispatched', 'delivered', 'cancelled')),
  items               jsonb not null default '[]'::jsonb,
                       -- [{sku, name, qty, price_at_order_paise, unit}]
  delivery_address_id uuid references customer_addresses(id) on delete set null,
  delivery_address_snapshot text,
  delivery_slot       text,
  total_paise         int not null,
  language            text,
  notes               text,
  sms_sent            boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists orders_merchant_status_idx on orders (merchant_id, status);
create index if not exists orders_merchant_created_idx on orders (merchant_id, created_at desc);
create index if not exists orders_call_idx on orders (call_id) where call_id is not null;

create trigger set_updated_at_orders
  before update on orders
  for each row execute function trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- escalations — when the agent hands off to a human
-- ---------------------------------------------------------------------------
create table if not exists escalations (
  id                  uuid primary key default gen_random_uuid(),
  call_id             uuid not null references calls(id) on delete cascade,
  reason              text not null,
  transcript_snapshot text,
  status              text not null default 'queued'
                       check (status in ('queued', 'taken', 'resolved', 'abandoned')),
  operator_id         uuid,                           -- nullable; matches future operators table
  resolution_notes    text,
  created_at          timestamptz not null default now(),
  resolved_at         timestamptz
);

create index if not exists escalations_status_idx on escalations (status, created_at);
create index if not exists escalations_call_idx on escalations (call_id);

-- ---------------------------------------------------------------------------
-- Enable Realtime on orders + escalations + calls (for live dashboard)
-- ---------------------------------------------------------------------------
-- Supabase Realtime is configured per-table at the dashboard / via SQL:
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table escalations;
alter publication supabase_realtime add table calls;
