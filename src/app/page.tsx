import Link from "next/link";
import { CallbackForm } from "./callback-form";
import { BrandMark } from "@/components/brand-mark";

export default function Home() {
  return (
    <main className="min-h-screen bg-stone-50">
      <div className="max-w-5xl mx-auto px-6 py-16 sm:py-24">
        {/* Hero + callback form */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 mb-12">
          <div>
            <div className="inline-block bg-rose-100 text-rose-700 text-xs font-medium px-2.5 py-1 rounded-full mb-4">
              Voice AI for neighbourhood retail
            </div>
            <h1 className="leading-tight">
              <BrandMark size="lg" />
            </h1>
            <p className="text-xl text-stone-700 mt-3 max-w-2xl">
              A voice agent that takes phone orders for neighbourhood supermarkets and kiranas — in Hindi or
              English, knows the catalog, and routes to a human only when it has to.
            </p>
            <p className="text-sm text-stone-500 mt-3">
              Request a callback to try the agent →
            </p>
          </div>
          <CallbackForm />
        </div>

        {/* Value strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <Stat
            label="Operator cost per outlet today"
            value="₹95k/month"
            note="4 phone operators at ~₹20k each"
          />
          <Stat
            label="Peak-hour calls lost"
            value="15–25%"
            note="Customers default to Zepto / Blinkit"
          />
          <Stat
            label="Repeat callers"
            value="60–80%"
            note="Same regulars, same baskets, week after week"
          />
        </div>

        {/* What it does */}
        <section className="bg-white border border-stone-200 rounded-xl p-6 mb-12">
          <h2 className="text-xs uppercase tracking-wider font-medium text-stone-500 mb-3">
            How a call works
          </h2>
          <ol className="space-y-2.5 text-sm text-stone-700">
            <Step n={1}>
              Customer dials the store number — Bolna AI routes to the Dukan agent.
            </Step>
            <Step n={2}>
              Agent looks up the caller&apos;s phone in the merchant database. Greets returning customers
              by name in their preferred language.
            </Step>
            <Step n={3}>
              Customer places the order in natural Hindi / English / mixed. Agent calls{" "}
              <code className="bg-stone-100 px-1.5 py-0.5 rounded text-xs">catalog_search</code> for each
              item; suggests substitutes when out of stock.
            </Step>
            <Step n={4}>
              Confirms address (returning customer = on file, new = capture + validate pincode). Reads back
              the full order with total.
            </Step>
            <Step n={5}>
              Places the order — written to the merchant&apos;s dashboard in realtime. Triggers SMS
              confirmation. Escalates to a human only for disputes, complaints, or bulk orders.
            </Step>
          </ol>
        </section>

        {/* Nav strip */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
          <NavCard href="/dashboard" title="Dashboard" desc="Live KPIs + active calls" />
          <NavCard href="/orders" title="Orders" desc="The phone-order queue" />
          <NavCard href="/catalog" title="Catalog" desc="What the agent can sell" />
          <NavCard href="/escalations" title="Escalations" desc="Calls that needed a human" />
        </section>

        {/* Architecture note */}
        <section className="bg-stone-100 border border-stone-200 rounded-xl p-5 text-sm text-stone-600">
          <p className="font-medium text-stone-900 mb-1">Built on Bolna AI — provider-agnostic by design.</p>
          <p>
            The voice layer sits behind a{" "}
            <code className="bg-white px-1.5 py-0.5 rounded text-xs">VoiceProvider</code> interface with
            adapters for Bolna (default), Vapi, and a custom ElevenLabs + Deepgram + LLM stack. Swapping
            providers is one env var.
          </p>
        </section>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-stone-200 text-xs text-stone-500">
          <p>
            Built by{" "}
            <a href="https://parthsapra.me" className="text-rose-600 hover:underline">
              Parth Sapra
            </a>{" "}
            · Full-stack engineer assignment for{" "}
            <a
              href="https://bolna.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-rose-600 hover:underline"
            >
              Bolna AI
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4">
      <div className="text-[11px] uppercase tracking-wider font-medium text-stone-500">{label}</div>
      <div className="text-2xl font-bold text-stone-900 mt-1">{value}</div>
      <div className="text-xs text-stone-500 mt-1">{note}</div>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="shrink-0 w-6 h-6 rounded-full bg-rose-100 text-rose-700 text-xs font-semibold flex items-center justify-center">
        {n}
      </span>
      <span className="flex-1 pt-0.5">{children}</span>
    </li>
  );
}

function NavCard({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="block bg-white border border-stone-200 rounded-xl p-4 hover:border-rose-300 hover:shadow-sm transition"
    >
      <div className="font-medium text-stone-900">{title}</div>
      <div className="text-xs text-stone-500 mt-0.5">{desc}</div>
    </Link>
  );
}
