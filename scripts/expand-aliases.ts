/**
 * Expands the `aliases` array on catalog_items with Devanagari, Marathi, and
 * common spelling variants. Demo-critical: Deepgram hi-IN transcribes Hindi
 * speech as Devanagari, so the LLM passes "आलू" / "टमाटर" etc. to catalog_search.
 * Without these aliases, every Hindi-spoken query would miss.
 *
 * Idempotent — unions with existing aliases, deduplicates. Re-running is safe.
 *
 * Run: bun run scripts/expand-aliases.ts
 */
export {}

import { getSupabaseAdmin } from '../src/lib/supabase/admin'
import { getDemoMerchantId } from '../src/lib/merchant'

interface AliasAddition {
  sku: string
  add: string[]
}

const ALIAS_EXPANSIONS: AliasAddition[] = [
  // ── Staples ────────────────────────────────────────────────────────────
  { sku: 'atta-aashirvaad-5kg', add: ['आटा', 'आशीर्वाद', 'आशीर्वाद आटा', 'गेहूं का आटा', 'gehu', 'gehoo', 'aashirwaad', 'wheat', 'aata'] },
  { sku: 'atta-fortune-5kg',    add: ['फॉर्च्यून', 'फॉर्च्यून आटा', 'chakki', 'चक्की', 'चक्की आटा'] },
  { sku: 'rice-basmati-1kg',    add: ['चावल', 'बासमती', 'बासमती चावल', 'basmati chawal', 'chawal', 'india gate', 'इंडिया गेट', 'tandul'] },
  { sku: 'rice-sona-masoori-5kg', add: ['सोना मसूरी', 'sona', 'masoori', 'sona chawal', 'सोना चावल'] },
  { sku: 'dal-toor-1kg',        add: ['तूर', 'तूर दाल', 'tur', 'arhar', 'अरहर', 'अरहर दाल', 'तुअर'] },
  { sku: 'dal-moong-1kg',       add: ['मूंग', 'मूंग दाल', 'mung', 'green gram dal'] },
  { sku: 'dal-chana-1kg',       add: ['चना', 'चना दाल', 'chane ki dal'] },
  { sku: 'oil-fortune-sunflower-1l', add: ['तेल', 'सूरजमुखी', 'सूरजमुखी तेल', 'फॉर्च्यून तेल', 'surajmukhi', 'cooking oil', 'खाने का तेल'] },
  { sku: 'oil-fortune-sunflower-5l', add: ['फॉर्च्यून 5 लीटर', 'बड़ा तेल', 'big oil'] },
  { sku: 'sugar-1kg',           add: ['चीनी', 'शक्कर', 'shakkar', 'chini', 'sakhar', 'साखर'] },
  { sku: 'salt-tata-1kg',       add: ['नमक', 'टाटा', 'टाटा नमक', 'mith', 'मीठ'] },

  // ── Dairy ──────────────────────────────────────────────────────────────
  { sku: 'milk-amul-500ml',     add: ['दूध', 'doodh', 'अमूल', 'अमूल दूध', 'milk 500ml'] },
  { sku: 'milk-amul-1l',        add: ['दूध 1 लीटर', 'अमूल 1 लीटर', 'milk 1 litre', 'doodh 1 ltr', 'amul 1 ltr'] },
  { sku: 'dahi-amul-400g',      add: ['दही', 'curd', 'yoghurt', 'yogurt', 'अमूल दही'] },
  { sku: 'paneer-amul-200g',    add: ['पनीर', 'cottage cheese', 'अमूल पनीर'] },
  { sku: 'butter-amul-100g',    add: ['मक्खन', 'makkhan', 'अमूल मक्खन', 'butter amul'] },
  { sku: 'ghee-amul-500ml',     add: ['घी', 'देसी घी', 'desi ghee', 'अमूल घी', 'tup'] },

  // ── Vegetables ─────────────────────────────────────────────────────────
  { sku: 'aloo-1kg',            add: ['आलू', 'aalu', 'aaloo', 'batata', 'बटाटा'] },
  { sku: 'pyaaz-1kg',           add: ['प्याज', 'प्याज़', 'kaanda', 'कांदा', 'pyaz'] },
  { sku: 'tamatar-500g',        add: ['टमाटर', 'tamato', 'tomatar', 'tomate'] },
  { sku: 'hari-mirch-100g',     add: ['हरी मिर्च', 'mirchi', 'मिर्ची', 'mirch', 'मिर्च', 'green chilli'] },
  { sku: 'adrak-100g',          add: ['अदरक', 'aale', 'आले'] },
  { sku: 'lehsun-100g',         add: ['लहसुन', 'lasun', 'लसून'] },

  // ── Snacks ─────────────────────────────────────────────────────────────
  { sku: 'biscuits-parle-g-150g', add: ['पार्ले', 'पार्ले-जी', 'पार्ले जी', 'biscuit', 'बिस्किट', 'parley g'] },
  { sku: 'biscuits-good-day-200g', add: ['गुड डे', 'good day biscuits', 'गुड डे बिस्किट', 'britannia good day'] },
  { sku: 'biscuits-marie-150g', add: ['मेरी', 'मेरी गोल्ड', 'marie biscuit', 'marie biscuits', 'marie gold biscuit'] },
  { sku: 'lays-classic-50g',    add: ['लेज़', 'chips', 'चिप्स', 'salted chips', 'wafer', 'lays salted'] },

  // ── Cleaning ───────────────────────────────────────────────────────────
  { sku: 'surf-excel-1kg',      add: ['सर्फ़', 'सर्फ', 'detergent', 'डिटर्जेंट', 'washing powder', 'कपड़े धोने का पाउडर'] },
  { sku: 'vim-bar-200g',        add: ['विम', 'dishwash bar', 'बर्तन धोने का साबुन', 'bartan ka saabun', 'vim saabun'] },
  { sku: 'harpic-500ml',        add: ['हार्पिक', 'toilet cleaner', 'टॉयलेट क्लीनर', 'टॉयलेट साफ़ करने वाला'] },

  // ── Personal care ──────────────────────────────────────────────────────
  { sku: 'soap-dove-100g',      add: ['डव', 'साबुन', 'saabun', 'soap', 'नहाने का साबुन', 'bath soap', 'dove saabun'] },
  { sku: 'shampoo-clinic-plus-175ml', add: ['क्लिनिक प्लस', 'शैम्पू', 'shaempu', 'बाल धोने का', 'hair wash', 'clinic plus shampoo'] },
  { sku: 'toothpaste-colgate-150g', add: ['कोलगेट', 'टूथपेस्ट', 'दंत मंजन', 'manjan', 'दांत साफ़ करने वाला', 'colgate paste'] },

  // ── Beverages ──────────────────────────────────────────────────────────
  { sku: 'tea-tata-250g',       add: ['चाय', 'चाय पत्ती', 'chai patti', 'टाटा चाय', 'tea leaves', 'tata chai'] },
  { sku: 'coffee-nescafe-50g',  add: ['नेस्कैफे', 'कॉफ़ी', 'कॉफी', 'kafi', 'coffee powder', 'इंस्टेंट कॉफ़ी', 'nescafe coffee'] },
  { sku: 'coke-750ml',          add: ['कोका कोला', 'कोक', 'कोल्ड ड्रिंक', 'thanda', 'ठंडा', 'soft drink', 'soda'] },

  // ── Eggs / bread / instant ─────────────────────────────────────────────
  { sku: 'eggs-12pc',           add: ['अंडे', 'anda', 'ande', 'अंडा', 'dozen ande', 'एक दर्जन अंडे'] },
  { sku: 'bread-britannia-400g', add: ['ब्रेड', 'ब्राउन ब्रेड', 'britania', 'पाव', 'double roti', 'पावरोटी'] },
  { sku: 'maggi-70g',           add: ['मैगी', 'noodles', 'नूडल्स', 'maggie noodles', 'मैगी नूडल्स', '2 minute noodles'] },
]

const supabase = getSupabaseAdmin()
const merchantId = await getDemoMerchantId()

console.log(`Expanding aliases for merchant ${merchantId.slice(0, 8)}…\n`)

let updated = 0
let skipped = 0
let notFound = 0

for (const item of ALIAS_EXPANSIONS) {
  const { data: existing, error } = await supabase
    .from('catalog_items')
    .select('id, aliases')
    .eq('merchant_id', merchantId)
    .eq('sku', item.sku)
    .maybeSingle()

  if (error) {
    console.error(`  ✗ ${item.sku} — fetch error: ${error.message}`)
    continue
  }
  if (!existing) {
    console.warn(`  ⚠ ${item.sku} — not found in catalog`)
    notFound++
    continue
  }

  const current: string[] = existing.aliases ?? []
  const currentSet = new Set(current.map(a => a.toLowerCase()))
  const toAdd = item.add.filter(a => !currentSet.has(a.toLowerCase()))

  if (toAdd.length === 0) {
    console.log(`  · ${item.sku} — all aliases already present (${current.length} total)`)
    skipped++
    continue
  }

  const merged = [...current, ...toAdd]

  const { error: updErr } = await supabase
    .from('catalog_items')
    .update({ aliases: merged })
    .eq('id', existing.id)

  if (updErr) {
    console.error(`  ✗ ${item.sku} — update error: ${updErr.message}`)
    continue
  }

  console.log(`  ✓ ${item.sku} — added ${toAdd.length} (total ${merged.length}): ${toAdd.slice(0, 3).join(', ')}${toAdd.length > 3 ? '…' : ''}`)
  updated++
}

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
console.log(`Updated:   ${updated}`)
console.log(`Skipped:   ${skipped} (already complete)`)
console.log(`Not found: ${notFound}`)
console.log(`\n✓ Done. catalog_search will now match Devanagari and Marathi terms.`)
