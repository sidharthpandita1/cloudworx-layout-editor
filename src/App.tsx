import { useEffect } from 'react'
import { translate } from './i18n'
import { EditorCanvas } from './scene/EditorCanvas'
import { Announcer } from './ui/Announcer'
import { AssistantLauncher } from './ui/AssistantPanel'
import { BomTable } from './ui/BomTable'
import { ClearancePanel } from './ui/ClearancePanel'
import { useEditorStore } from './store/editorStore'
import { ItemList } from './ui/ItemList'
import { NoticeToast } from './ui/NoticeToast'
import { Palette } from './ui/Palette'
import { PropertiesPanel } from './ui/PropertiesPanel'
import { ShortcutsButton, ShortcutsDialog } from './ui/ShortcutsDialog'
import { SidePanel } from './ui/SidePanel'
import { Toolbar } from './ui/Toolbar'
import { useKeyboardShortcuts } from './ui/useKeyboardShortcuts'
import { usePanelOpen } from './ui/usePanelOpen'
import { useTranslate } from './ui/useTranslate'

export default function App() {
  const locale = useEditorStore((state) => state.locale)
  const setLocale = useEditorStore((state) => state.setLocale)
  const isPlacing = useEditorStore((state) => state.activeTool !== null)
  const t = useTranslate()
  const [leftOpen, toggleLeft] = usePanelOpen('left')
  const [rightOpen, toggleRight] = usePanelOpen('right')
  useKeyboardShortcuts()

  // Screen readers and CSS line-breaking rules depend on the document language; the tab title follows it too.
  useEffect(() => {
    document.documentElement.lang = locale
    document.title = translate(locale, 'app.title')
  }, [locale])

  return (
    // Closed side panels shrink to a thin strip; the grid columns animate and the 3D view takes the space.
    <div className={['app', leftOpen ? '' : 'left-closed', rightOpen ? '' : 'right-closed'].join(' ').trim()}>
      <header className="app-header">
        <h1>{t('app.title')}</h1>
        <Toolbar />
        <div className="header-actions">
          <ShortcutsButton />
          <button type="button" onClick={() => setLocale(locale === 'en' ? 'vi' : 'en')}>
            {t('app.switchLanguage')}
          </button>
        </div>
      </header>
      <ShortcutsDialog />

      <SidePanel side="left" open={leftOpen} onToggle={toggleLeft}>
        <section>
          <h2>{t('panel.palette')}</h2>
          <Palette />
        </section>
        <section>
          <h2 id="items-heading">{t('panel.items')}</h2>
          <ItemList labelledBy="items-heading" />
        </section>
      </SidePanel>

      <main className={isPlacing ? 'viewport placing' : 'viewport'}>
        {/* One Tab stop for the 3D view. Clicking the canvas also focuses it, so the arrow keys
            and other shortcuts clearly belong to the view. role="application" tells screen
            readers to pass the arrow keys through instead of using them to read the page. */}
        <div
          className="canvas-focus"
          tabIndex={0}
          role="application"
          aria-label={t('canvas.label')}
          aria-describedby="canvas-help"
        >
          <EditorCanvas />
        </div>
        <p id="canvas-help" className="visually-hidden">
          {t('canvas.help')}
        </p>
        <NoticeToast />
        <AssistantLauncher />
        <Announcer />
      </main>

      <SidePanel side="right" open={rightOpen} onToggle={toggleRight}>
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
      </SidePanel>
    </div>
  )
}
