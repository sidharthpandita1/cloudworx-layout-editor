import { translate, type MessageKey, type MessageParams } from '../i18n'
import { useEditorStore } from '../store/editorStore'

/** Returns a `t(key, params?)` function for the current language; components re-render when it changes. */
export function useTranslate(): (key: MessageKey, params?: MessageParams) => string {
  const locale = useEditorStore((state) => state.locale)
  return (key, params) => translate(locale, key, params)
}
