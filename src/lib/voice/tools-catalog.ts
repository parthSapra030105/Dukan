import { Search, User, MapPin, ShoppingCart, AlertTriangle, type LucideIcon } from 'lucide-react'

export interface ToolParam {
  name: string
  type: string
  required: boolean
  description: string
}

export interface ToolDoc {
  name: string
  icon: LucideIcon
  description: string
  when: string
  endpoint: string
  method: 'POST'
  params: ToolParam[]
  returns: string
}

export const TOOLS_CATALOG: ToolDoc[] = [
  {
    name: 'lookup_customer',
    icon: User,
    description:
      'Look up a caller by phone — returns identity, language preference, last order, and saved addresses.',
    when: 'Once at call start, before the greeting.',
    endpoint: '/api/agent/tools/lookup-customer',
    method: 'POST',
    params: [
      { name: 'phone',     type: 'string', required: true, description: 'Caller phone in E.164 (e.g. +919876543210).' },
    ],
    returns:
      '{ found: boolean, customer?: { id, name, preferred_language, total_orders, last_order, saved_addresses[] } }',
  },
  {
    name: 'catalog_search',
    icon: Search,
    description:
      'Find an item the customer just named — matches by name, Hindi name, and alias. Returns price, unit, and stock.',
    when: 'Once per item the customer mentions.',
    endpoint: '/api/agent/tools/catalog-search',
    method: 'POST',
    params: [
      { name: 'query',    type: 'string', required: true,  description: 'The customer\'s exact phrase ("atta", "doodh 1 litre", "namak").' },
      { name: 'language', type: 'string', required: false, description: 'Two-letter language hint (hi, en, mr).' },
      { name: 'limit',    type: 'number', required: false, description: 'Max results (default 5).' },
    ],
    returns:
      '{ results: [{ sku, name_localized, aliases, price_paise, unit, in_stock, category }] }',
  },
  {
    name: 'validate_address',
    icon: MapPin,
    description:
      'Resolve the customer\'s address text and confirm it falls within the merchant\'s delivery zone.',
    when: 'When the customer provides a new address.',
    endpoint: '/api/agent/tools/validate-address',
    method: 'POST',
    params: [
      { name: 'text', type: 'string', required: true, description: 'Address as spoken by the customer.' },
    ],
    returns:
      '{ resolved, full_address?, pincode?, within_delivery_zone, clarification_needed? }',
  },
  {
    name: 'place_order',
    icon: ShoppingCart,
    description:
      'Place the confirmed order — writes to the merchant\'s dashboard in realtime, triggers an SMS confirmation.',
    when: 'Once at end of Phase 5, after the customer explicitly confirms.',
    endpoint: '/api/agent/tools/place-order',
    method: 'POST',
    params: [
      { name: 'item_skus',         type: 'string', required: true,  description: 'Comma-separated SKUs in order ("rice-basmati-1kg,dal-toor-1kg").' },
      { name: 'item_quantities',   type: 'string', required: true,  description: 'Comma-separated quantities, position-matched ("2,1").' },
      { name: 'customer_id',       type: 'uuid',   required: false, description: 'From lookup_customer; or pass customer_phone as fallback.' },
      { name: 'customer_phone',    type: 'string', required: false, description: 'E.164 phone — used when customer_id is not available.' },
      { name: 'delivery_address',  type: 'string', required: true,  description: 'Validated address string.' },
      { name: 'delivery_slot',     type: 'string', required: false, description: 'Slot the customer chose ("today evening").' },
      { name: 'total_paise',       type: 'number', required: true,  description: 'Subtotal in paise. Server re-verifies against catalog.' },
      { name: 'language',          type: 'string', required: false, description: 'Call language.' },
    ],
    returns: '{ order_id, sms_sent, total_paise }',
  },
  {
    name: 'escalate_to_human',
    icon: AlertTriangle,
    description:
      'Hand the call off to a human operator. Logs to the escalations queue with reason and conversation summary.',
    when: 'Immediately on any of the 7 escalation triggers (complaint, refund, off-menu, bulk, etc.).',
    endpoint: '/api/agent/tools/escalate',
    method: 'POST',
    params: [
      { name: 'call_id',           type: 'uuid',   required: true,  description: 'Internal Dukan call row id (from user_data).' },
      { name: 'reason',            type: 'string', required: true,  description: 'Short reason key (payment_dispute, complaint, bulk_order, etc.).' },
      { name: 'transcript_so_far', type: 'string', required: false, description: 'Summary of the conversation so far.' },
    ],
    returns: '{ queued, queue_position, escalation_id }',
  },
]
