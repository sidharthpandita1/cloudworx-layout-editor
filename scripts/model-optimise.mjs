// Turns the raw Flight Helmet (48 MB glTF + PNGs) into one small web-ready GLB, one step at a time,
// so each step can be explained and its effect measured. Run `npm run model:fetch` first.
// Usage: npm run model:optimise [-- --textures 1024|512]
//   npm run model:variants builds both texture sizes (1024 px is the main file).
//
// Texture compression uses KTX2 (stays compressed on the GPU). It needs the `ktx` tool from
// KTX-Software, found on PATH or unpacked into .tools/ktx/bin. Without it, WebP is used instead.
import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs'
import { delimiter, join, resolve } from 'node:path'

const option = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? fallback : process.argv[index + 1]
}
const TEXTURE_SIZE = Number(option('textures', '1024')) // largest texture side, in pixels

const RAW = 'public/models/raw/FlightHelmet/FlightHelmet.gltf'
const WORK = `.cache/model/${TEXTURE_SIZE}`
const OUT = `public/models/flight-helmet${TEXTURE_SIZE === 1024 ? '' : `-${TEXTURE_SIZE}`}.glb`
const CLI = resolve('node_modules/.bin/gltf-transform')

if (!existsSync(RAW)) throw new Error(`${RAW} not found. Run "npm run model:fetch" first.`)
mkdirSync(WORK, { recursive: true })

// Let the CLI find a locally unpacked KTX-Software, if there is one.
const env = { ...process.env, FORCE_COLOR: '0', PATH: [resolve('.tools/ktx/bin'), process.env.PATH].join(delimiter) }
const hasKtx = (() => {
  try {
    execFileSync('ktx', ['--version'], { env, stdio: 'ignore' })
    return true
  } catch {
    return false
  }
})()

const steps = [
  // 1. Normal maps to 512 px. They are the largest textures after compression (UASTC, step 5), and fine
  //    bumps matter least at the size the model is shown. Done first because textures are matched by
  //    file name, which only exists in the raw .gltf. Writing a .glb also packs the .gltf, .bin and
  //    15 PNGs into one file (one request instead of 17).
  ['normals', ['resize', '--pattern', '*_Normal.png', '--width', String(Math.min(512, TEXTURE_SIZE)), '--height', String(Math.min(512, TEXTURE_SIZE))]],
  // 2. Remove duplicate data and anything unused. Lossless.
  ['dedup', ['dedup']],
  ['prune', ['prune']],
  // 3. Merge identical vertices, then halve the vertex count where it changes the shape by less than
  //    0.1% of the model's size (about 0.7 mm on this 70 cm model).
  ['weld', ['weld']],
  ['simplify', ['simplify', '--ratio', '0.5', '--error', '0.001']],
  // 4. The other textures: 2048 px is far more than the model ever covers on screen; 1024 px
  //    (or smaller with --textures).
  ['resize', ['resize', '--width', String(TEXTURE_SIZE), '--height', String(TEXTURE_SIZE)]],
  // 5. GPU texture compression. Normal maps get the higher-quality UASTC mode (block artefacts there
  //    show up as bumpy shading), shrunk for download with Zstandard. (UASTC "RDO" would shrink them
  //    further, but gltf-transform 4.5 does not pass the RDO options on to KTX-Software 4.4.)
  //    Colour and occlusion/roughness/metal maps change smoothly: the much smaller ETC1S mode is enough.
  ...(hasKtx
    ? [
        ['uastc', ['uastc', '--slots', 'normalTexture', '--level', '2', '--zstd', '18']],
        ['etc1s', ['etc1s', '--slots', '{baseColorTexture,occlusionTexture,metallicRoughnessTexture}', '--quality', '255']],
      ]
    : [['webp', ['webp', '--quality', '85']]]),
  // 6. Compress and quantize the geometry with Meshopt. Draco was measured too: 2% smaller files, but
  //    its 204 KB decoder made loading slower overall (docs/OPTIMISATION.md, "Meshopt or Draco").
  ['meshopt', ['meshopt', '--level', 'high']],
]

if (!hasKtx) console.warn('KTX-Software not found: using WebP textures instead of KTX2.\n')

let input = RAW
for (const [index, [name, args]] of steps.entries()) {
  const output = join(WORK, `${index + 1}-${name}.glb`)
  const started = performance.now()
  execFileSync(CLI, [args[0], input, output, ...args.slice(1)], { env, stdio: ['ignore', 'ignore', 'inherit'] })
  const seconds = ((performance.now() - started) / 1000).toFixed(1)
  console.log(`${String(index + 1).padStart(2)}. ${name.padEnd(9)} ${megabytes(statSync(output).size).padStart(9)}  (${seconds} s)`)
  input = output
}

// A plain file copy: re-writing with the CLI would undo part of the Meshopt compression.
copyFileSync(input, OUT)
console.log(`\nWrote ${OUT}: ${megabytes(statSync(OUT).size)}`)

function megabytes(bytes) {
  return `${(bytes / 1e6).toFixed(2)} MB`
}
