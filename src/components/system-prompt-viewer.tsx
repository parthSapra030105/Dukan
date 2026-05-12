import { parseMarkdown, renderInline, slugify } from '@/lib/markdown'

export function SystemPromptViewer({ markdown }: { markdown: string }) {
  const blocks = parseMarkdown(markdown)
  const sections: Array<{ text: string; slug: string }> = []
  for (const b of blocks) {
    if (b.type === 'h2') sections.push({ text: b.text, slug: slugify(b.text) })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-8">
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <p className="text-[10px] uppercase tracking-wider font-medium text-stone-500 mb-2">
          Sections
        </p>
        <ul className="space-y-0.5 border-l border-stone-200">
          {sections.map(s => (
            <li key={s.slug}>
              <a
                href={`#${s.slug}`}
                className="block text-xs text-stone-600 hover:text-rose-700 hover:bg-rose-50/40 py-1 pl-3 -ml-px border-l border-transparent hover:border-rose-400"
              >
                {s.text}
              </a>
            </li>
          ))}
        </ul>
      </aside>

      <article className="space-y-2.5 min-w-0">
        {blocks.map((b, i) => {
          switch (b.type) {
            case 'h1':
              return (
                <h2 key={i} className="text-xl font-semibold text-stone-900 mt-0 mb-3">
                  {b.text}
                </h2>
              )
            case 'h2': {
              const slug = slugify(b.text)
              return (
                <h3
                  key={i}
                  id={slug}
                  className="text-base font-semibold text-stone-900 mt-7 mb-2 pt-5 border-t border-stone-200 first:border-t-0 first:pt-0 first:mt-0 scroll-mt-20"
                >
                  {b.text}
                </h3>
              )
            }
            case 'h3':
              return (
                <h4 key={i} className="text-sm font-semibold text-stone-800 mt-4 mb-1">
                  {b.text}
                </h4>
              )
            case 'p':
              return (
                <p key={i} className="text-sm text-stone-700 leading-relaxed">
                  {renderInline(b.text)}
                </p>
              )
            case 'ul':
              return (
                <ul key={i} className="list-disc pl-5 space-y-1 text-sm text-stone-700 marker:text-stone-300">
                  {b.items.map((it, j) => (
                    <li key={j} className="leading-relaxed">
                      {renderInline(it)}
                    </li>
                  ))}
                </ul>
              )
            case 'ol':
              return (
                <ol key={i} className="list-decimal pl-5 space-y-1 text-sm text-stone-700 marker:text-stone-400">
                  {b.items.map((it, j) => (
                    <li key={j} className="leading-relaxed">
                      {renderInline(it)}
                    </li>
                  ))}
                </ol>
              )
            case 'hr':
              return <hr key={i} className="border-stone-200 my-4" />
          }
        })}
      </article>
    </div>
  )
}
