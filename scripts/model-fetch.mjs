// Downloads the raw Flight Helmet model (Khronos glTF Sample Assets, CC0, ~48 MB) into
// public/models/raw/FlightHelmet/. That folder is gitignored: the heavy source is never committed.
// Usage: npm run model:fetch
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const LISTING = 'https://api.github.com/repos/KhronosGroup/glTF-Sample-Assets/contents/Models/FlightHelmet/glTF'
const OUT_DIR = 'public/models/raw/FlightHelmet'

const files = await (await fetch(LISTING)).json()
if (!Array.isArray(files)) throw new Error(`Could not list the model files: ${JSON.stringify(files)}`)
await mkdir(OUT_DIR, { recursive: true })

let total = 0
for (const file of files) {
  const response = await fetch(file.download_url)
  if (!response.ok) throw new Error(`${file.name}: HTTP ${response.status}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  await writeFile(join(OUT_DIR, file.name), bytes)
  total += bytes.length
  console.log(`${file.name.padEnd(60)} ${(bytes.length / 1e6).toFixed(2)} MB`)
}
console.log(`\n${files.length} files, ${(total / 1e6).toFixed(1)} MB in ${OUT_DIR}`)
