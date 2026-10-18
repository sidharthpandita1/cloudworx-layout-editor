/**
 * Benchmark settings come from the address (e.g. `?model=raw&copies=500&instancing=off`), and every
 * change is a new page load. That way each measurement starts cold, like a user opening the editor.
 */
/** The raw model, and the optimised versions built by `npm run model:variants`. */
export const MODEL_KINDS = ['raw', 'meshopt', 'meshopt-512'] as const
export type ModelKind = (typeof MODEL_KINDS)[number]

export interface BenchSettings {
  model: ModelKind
  copies: 1 | 500
  instancing: boolean
}

export function readSettings(search: string): BenchSettings {
  const params = new URLSearchParams(search)
  return {
    model: MODEL_KINDS.find((kind) => kind === params.get('model')) ?? 'meshopt',
    copies: params.get('copies') === '500' ? 500 : 1,
    instancing: params.get('instancing') !== 'off',
  }
}

export function settingsQuery(settings: BenchSettings): string {
  const params = new URLSearchParams({
    model: settings.model,
    copies: String(settings.copies),
    instancing: settings.instancing ? 'on' : 'off',
  })
  return `?${params}`
}

/** Positions for `count` copies in rows, centred on the origin, `spacing` metres apart. */
export function gridPositions(count: number, spacing: number): [number, number, number][] {
  const columns = Math.ceil(Math.sqrt(count * 1.25)) // a little wider than deep, like the floor
  const rows = Math.ceil(count / columns)
  return Array.from({ length: count }, (_, i) => [
    ((i % columns) - (columns - 1) / 2) * spacing,
    0,
    (Math.floor(i / columns) - (rows - 1) / 2) * spacing,
  ])
}
