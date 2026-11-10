// Erzeugt die App-Icons (PNG) für die installierbare App – ohne Zusatzpakete.
// Aufruf: node scripts/make-icons.mjs
// Motiv: weißer Blitz auf Indigo. „maskable“ hat mehr Rand (Android schneidet das Icon rund zu).
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const INDIGO = [79, 70, 229] // #4f46e5
const WHITE = [255, 255, 255]

// Blitz als Polygon im Einheitsquadrat (0..1)
const BOLT = [
  [0.58, 0.08],
  [0.24, 0.56],
  [0.47, 0.56],
  [0.4, 0.92],
  [0.76, 0.42],
  [0.53, 0.42],
  [0.6, 0.08],
]

function inside(x, y, poly) {
  let hit = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

/** size = Kantenlänge, boltScale = Anteil des Blitzes, radius = Ecken-Rundung (0 = eckig) */
function render(size, boltScale, radius) {
  const SS = 4 // Supersampling für glatte Kanten
  const px = Buffer.alloc(size * size * 4)
  const off = (1 - boltScale) / 2
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let bg = 0
      let fg = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / size
          const v = (y + (sy + 0.5) / SS) / size
          // abgerundetes Quadrat
          const dx = Math.max(radius - u, u - (1 - radius), 0)
          const dy = Math.max(radius - v, v - (1 - radius), 0)
          if (radius > 0 && dx * dx + dy * dy > radius * radius) continue
          bg++
          if (inside((u - off) / boltScale, (v - off) / boltScale, BOLT)) fg++
        }
      }
      const n = SS * SS
      const i = (y * size + x) * 4
      const t = bg ? fg / bg : 0
      for (let c = 0; c < 3; c++) px[i + c] = Math.round(INDIGO[c] * (1 - t) + WHITE[c] * t)
      px[i + 3] = Math.round((bg / n) * 255)
    }
  }
  return png(size, px)
}

function png(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr.set([8, 6, 0, 0, 0], 8) // 8 Bit, RGBA
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}

const out = new URL('../public/', import.meta.url)
writeFileSync(new URL('pwa-192.png', out), render(192, 0.8, 0.22))
writeFileSync(new URL('pwa-512.png', out), render(512, 0.8, 0.22))
writeFileSync(new URL('pwa-maskable-512.png', out), render(512, 0.56, 0)) // Vollfläche, Blitz in der sicheren Zone
writeFileSync(new URL('apple-touch-icon.png', out), render(180, 0.72, 0)) // iOS rundet selbst ab
console.log('Icons erzeugt in public/')
