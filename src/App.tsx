import { useEffect, useState } from 'react'
import { ITEM_TYPES } from './domain/catalog'
import { translate, type Locale, type MessageKey } from './i18n'
import { EditorCanvas } from './scene/EditorCanvas'

export default function App() {
  const [locale, setLocale] = useState<Locale>('en')
  const t = (key: MessageKey) => translate(locale, key)

  // Screen readers and CSS line-breaking rules depend on the document language.
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  return (
    <div className="app">
      <header className="app-header">
        <h1>{t('app.title')}</h1>
        <button type="button" onClick={() => setLocale(locale === 'en' ? 'vi' : 'en')}>
          {t('app.switchLanguage')}
        </button>
      </header>

      <aside className="panel">
        <section>
          <h2>{t('panel.palette')}</h2>
          <ul className="palette">
            {ITEM_TYPES.map((type) => (
              <li key={type.id}>
                <span className="swatch" style={{ background: type.color }} aria-hidden />
                {t(type.nameKey)}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2>{t('panel.items')}</h2>
          <p className="muted">{t('empty.items')}</p>
        </section>
      </aside>

      <main className="viewport">
        <EditorCanvas />
      </main>

      <aside className="panel">
        <section>
          <h2>{t('panel.properties')}</h2>
          <p className="muted">{t('empty.selection')}</p>
        </section>
        <section>
          <h2>{t('panel.bom')}</h2>
          <p className="muted">{t('empty.bom')}</p>
        </section>
      </aside>
    </div>
  )
}
