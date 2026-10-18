import { useEffect } from 'react'
import { EditorCanvas } from './scene/EditorCanvas'
import { BomTable } from './ui/BomTable'
import { ClearancePanel } from './ui/ClearancePanel'
import { useEditorStore } from './store/editorStore'
import { ItemList } from './ui/ItemList'
import { NoticeToast } from './ui/NoticeToast'
import { Palette } from './ui/Palette'
import { PropertiesPanel } from './ui/PropertiesPanel'
import { Toolbar } from './ui/Toolbar'
import { useKeyboardShortcuts } from './ui/useKeyboardShortcuts'
import { useTranslate } from './ui/useTranslate'

export default function App() {
  const locale = useEditorStore((state) => state.locale)
  const setLocale = useEditorStore((state) => state.setLocale)
  const isPlacing = useEditorStore((state) => state.activeTool !== null)
  const t = useTranslate()
  useKeyboardShortcuts()

  // Screen readers and CSS line-breaking rules depend on the document language.
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  return (
    <div className="app">
      <header className="app-header">
        <h1>{t('app.title')}</h1>
        <Toolbar />
        <button type="button" onClick={() => setLocale(locale === 'en' ? 'vi' : 'en')}>
          {t('app.switchLanguage')}
        </button>
      </header>

      <aside className="panel">
        <section>
          <h2>{t('panel.palette')}</h2>
          <Palette />
        </section>
        <section>
          <h2>{t('panel.items')}</h2>
          <ItemList />
        </section>
      </aside>

      <main className={isPlacing ? 'viewport placing' : 'viewport'}>
        <EditorCanvas />
        <NoticeToast />
      </main>

      <aside className="panel">
        <section>
          <h2>{t('panel.clearance')}</h2>
          <ClearancePanel />
        </section>
        <section>
          <h2>{t('panel.properties')}</h2>
          <PropertiesPanel />
        </section>
        <section>
          <h2>{t('panel.bom')}</h2>
          <BomTable />
        </section>
      </aside>
    </div>
  )
}
