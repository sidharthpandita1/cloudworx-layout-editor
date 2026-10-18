import { ITEM_TYPES } from '../domain/catalog'
import { useEditorStore } from '../store/editorStore'
import { useTranslate } from './useTranslate'

/** Palette buttons. Clicking one arms it for placing; clicking it again (or Esc) disarms it. */
export function Palette() {
  const t = useTranslate()
  const activeTool = useEditorStore((state) => state.activeTool)
  const setActiveTool = useEditorStore((state) => state.setActiveTool)

  return (
    <>
      <ul className="palette">
        {ITEM_TYPES.map((type) => (
          <li key={type.id}>
            <button
              type="button"
              aria-pressed={activeTool === type.id}
              onClick={() => setActiveTool(activeTool === type.id ? null : type.id)}
            >
              <span className="swatch" style={{ background: type.color }} aria-hidden />
              {t(type.nameKey)}
            </button>
          </li>
        ))}
      </ul>
      {activeTool && <p className="muted">{t('palette.hint')}</p>}
    </>
  )
}
