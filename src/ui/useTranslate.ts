import { translate, type MessageKey } from '../i18n'
import { useEditorStore } from '../store/editorStore'

/** Returns a `t(key)` function for the current language; components re-render when it changes. */
export function useTranslate(): (key: MessageKey) => string {
  const locale = useEditorStore((state) => state.locale)
  return (key) => translate(locale, key)
}
