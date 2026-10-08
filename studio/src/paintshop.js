export const MAX_BYTES = 1e6
export const PAINTSHOP = {
  cybertruck: { w: 1024, h: 768, mask: '/paintshop/mask.png', label: 'Cybertruck AWD Premium' },
  model3: { w: 1024, h: 1024, mask: '/paintshop/model3-mask.png', label: 'Model 3 Standard' },
}

const maskCache = new Map()
const fileCache = new Map()

function loadMask(src, w, h) {
  const hit = maskCache.get(src)
  if (hit) return hit
  const p = new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) {
        reject(new Error('canvas'))
        return
      }
      ctx.drawImage(img, 0, 0, w, h)
      const data = ctx.getImageData(0, 0, w, h).data
      const alpha = new Uint8Array(w * h)
      for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4] ?? 0
      resolve(alpha)
    }
    img.onerror = () => reject(new Error('template'))
    img.src = src
  })
  p.catch(() => maskCache.delete(src))
  maskCache.set(src, p)
  return p
}

function inCoverage(maskValue, coverage, row) {
  if (maskValue === 0) return false
  if (coverage === 'full') return true
  if (coverage === 'twoTone') return maskValue === 1 || maskValue === 2
  if (coverage === 'roof') return maskValue === 1 ? row >= 150 : maskValue === 2 && row <= 618
  return maskValue === 1 ? row <= 96 : maskValue === 2 && row >= 672
}

function hexRgb(hex) {
  const t = hex.replace('#', '')
  return [Number.parseInt(t.slice(0, 2), 16), Number.parseInt(t.slice(2, 4), 16), Number.parseInt(t.slice(4, 6), 16)]
}

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}

function rng(seed) {
  let t = seed >>> 0
  return () => {
    t = (t + 1831565813) | 0
    let e = Math.imul(t ^ (t >>> 15), 1 | t)
    e = e + Math.imul(e ^ (e >>> 7), 61 | e) ^ e
    return ((e ^ (e >>> 14)) >>> 0) / 4294967296
  }
}

function heart(ctx, x, y, s) {
  ctx.beginPath()
  ctx.moveTo(x, y + s * 0.3)
  ctx.bezierCurveTo(x, y, x - s, y, x - s, y + s * 0.35)
  ctx.bezierCurveTo(x - s, y + s * 0.7, x, y + s * 0.85, x, y + s)
  ctx.bezierCurveTo(x, y + s * 0.85, x + s, y + s * 0.7, x + s, y + s * 0.35)
  ctx.bezierCurveTo(x + s, y, x, y, x, y + s * 0.3)
  ctx.fill()
}

/** Paint a wrap pattern onto a 2D context at cybertruck template size. */
export function paintPattern(ctx, pattern, color) {
  const w = ctx.canvas.width
  const h = ctx.canvas.height
  const rgb = hexRgb(color)

  if (pattern === 'solid' || pattern === 'hearts' || pattern === 'blossom') {
    ctx.fillStyle = color
    ctx.fillRect(0, 0, w, h)
    if (pattern === 'solid') return
    if (pattern === 'hearts') {
      ctx.fillStyle = '#fff5f7'
      ctx.font = '600 28px sans-serif'
      ctx.fillText('Destiny', 48, 88)
      for (let i = 0; i < 42; i++) heart(ctx, (i * 137) % w, 120 + ((i * 89) % (h - 160)), 10 + (i % 4) * 4)
      return
    }
    ctx.fillStyle = '#ffffff'
    for (let i = 0; i < 70; i++) {
      ctx.beginPath()
      ctx.arc((i * 97) % w, (i * 61) % h, 3 + (i % 3), 0, Math.PI * 2)
      ctx.fill()
    }
    return
  }

  if (pattern === 'shift') {
    const g = ctx.createLinearGradient(0, 0, 1024, 0)
    g.addColorStop(0, '#0e3d3a')
    g.addColorStop(0.45, '#14324a')
    g.addColorStop(1, '#3a1860')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    return
  }

  if (pattern === 'carbon') {
    ctx.fillStyle = '#101012'
    ctx.fillRect(0, 0, w, h)
    for (let y = 0; y < h; y += 8) {
      for (let x = 0; x < w; x += 8) {
        ctx.fillStyle = (x + y) / 8 % 2 === 0 ? '#1c1c22' : '#0c0c10'
        ctx.fillRect(x, y, 8, 8)
      }
    }
    return
  }

  if (pattern === 'topo') {
    ctx.fillStyle = '#121214'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = '#c4b08a'
    ctx.lineWidth = 2
    for (const [cx, cy] of [[280, 180], [720, 520], [480, 360], [140, 600]]) {
      for (let r = 24; r < 340; r += 22) {
        ctx.beginPath()
        ctx.ellipse(cx, cy, r * 1.4, r, 0.2, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
    return
  }

  if (pattern === 'livery' || pattern === 'slash') {
    ctx.fillStyle = '#141416'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#8e1d24'
    if (pattern === 'slash') {
      ctx.save()
      ctx.translate(w / 2, h / 2)
      ctx.rotate(-0.6)
      ctx.fillRect(-w, -18, w * 2, 36)
      ctx.restore()
      return
    }
    ctx.beginPath()
    ctx.moveTo(180, 0)
    ctx.lineTo(340, 0)
    ctx.lineTo(860, h)
    ctx.lineTo(700, h)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#ececee'
    ctx.font = '700 72px sans-serif'
    ctx.fillText('01', 80, 160)
    ctx.fillText('01', 80, 680)
    return
  }

  if (pattern === 'stars' || pattern === 'nebula') {
    ctx.fillStyle = pattern === 'nebula' ? '#10161e' : '#0c1016'
    ctx.fillRect(0, 0, w, h)
    if (pattern === 'nebula') {
      ctx.fillStyle = '#243246'
      ctx.beginPath()
      ctx.ellipse(360, 280, 280, 140, 0.4, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#1a2836'
      ctx.beginPath()
      ctx.ellipse(700, 480, 240, 120, -0.3, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = '#e8eef4'
    for (let i = 0; i < 500; i++) {
      const x = (i * 97) % w
      const y = (i * 53 + (i % 9) * 20) % h
      const s = i % 13 === 0 ? 2 : 1
      ctx.fillRect(x, y, s, s)
    }
    return
  }

  // camo / default organic pattern
  ctx.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`
  ctx.fillRect(0, 0, w, h)
  const rand = rng(pattern === 'camo' ? 7 : 3)
  const tones = [
    mix(rgb, [20, 22, 16], 0.55),
    mix(rgb, [90, 84, 60], 0.45),
    mix(rgb, [12, 12, 10], 0.7),
    mix(rgb, [210, 200, 170], 0.35),
  ]
  for (let i = 0; i < 90; i++) {
    const [r, g, b] = tones[i % tones.length]
    ctx.fillStyle = `rgb(${r},${g},${b})`
    ctx.beginPath()
    ctx.ellipse(rand() * w, rand() * h, 36 + rand() * 110, 24 + rand() * 70, rand() * Math.PI, 0, Math.PI * 2)
    ctx.fill()
  }
}

function quantize(imageData, step) {
  const n = imageData.data
  for (let i = 0; i < n.length; i += 4) {
    if ((n[i + 3] ?? 0) === 0) continue
    n[i] = Math.round((n[i] ?? 0) / step) * step
    n[i + 1] = Math.round((n[i + 1] ?? 0) / step) * step
    n[i + 2] = Math.round((n[i + 2] ?? 0) / step) * step
  }
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image'))
    img.src = src
  })
}

/** Compose artwork identically for the preview texture and exported template. */
export function paintArtwork(ctx, img, fit, color) {
  const { width: w, height: h } = ctx.canvas
  ctx.fillStyle = color
  ctx.fillRect(0, 0, w, h)
  const scale = Math.max(w / img.width, h / img.height) * fit.scale
  const dw = img.width * scale
  const dh = img.height * scale
  ctx.drawImage(img, (w - dw) / 2 + fit.x, (h - dh) / 2 + fit.y, dw, dh)
}

export function wrapFileName(label, vehicle) {
  const clean = label.replace(/[^A-Za-z0-9 _-]/g, ' ').replace(/\s+/g, ' ').trim()
  return `${`${vehicle === 'model3' ? 'M3 ' : 'CT '}${clean}`.slice(0, 26).trim()}.png`
}

export function buildWrapFile(film, coverage, customSrc, fit = { x: 0, y: 0, scale: 1 }, vehicle = 'cybertruck') {
  if (vehicle === 'model3') coverage = 'full'
  const key = `${vehicle}:${film.id}:${coverage}:${film.color}:${film.pattern ?? ''}:${customSrc ?? ''}:${fit.x}:${fit.y}:${fit.scale}`
  const hit = fileCache.get(key)
  if (hit) return hit
  const p = makeWrapBlob(film, coverage, customSrc, fit, vehicle).catch((err) => {
    fileCache.delete(key)
    throw err
  })
  // Keep slider edits and uploaded artwork from accumulating indefinitely.
  if (fileCache.size >= 4) fileCache.delete(fileCache.keys().next().value)
  fileCache.set(key, p)
  return p
}

async function makeWrapBlob(film, coverage, customSrc, fit, vehicle) {
  const spec = PAINTSHOP[vehicle]
  const mask = await loadMask(spec.mask, spec.w, spec.h)
  const canvas = document.createElement('canvas')
  canvas.width = spec.w
  canvas.height = spec.h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('canvas')

  if (customSrc) {
    const img = await loadImage(customSrc)
    paintArtwork(ctx, img, fit, film.color)
  } else if (film.official && vehicle === 'cybertruck') {
    const img = await loadImage(film.official)
    ctx.drawImage(img, 0, 0, spec.w, spec.h)
  } else {
    const pattern = film.finish === 'shift' ? 'shift' : film.pattern ?? 'solid'
    if (spec.h === 768) {
      paintPattern(ctx, pattern, film.color)
    } else {
      const tmp = document.createElement('canvas')
      tmp.width = 1024
      tmp.height = 768
      const tctx = tmp.getContext('2d')
      if (!tctx) throw new Error('canvas')
      paintPattern(tctx, pattern, film.id === 'stainless' ? '#f3f3f1' : film.color)
      ctx.drawImage(tmp, 0, 0, spec.w, spec.h)
    }
  }

  const source = ctx.getImageData(0, 0, spec.w, spec.h)
  const out = document.createElement('canvas')
  out.width = spec.w
  out.height = spec.h
  const octx = out.getContext('2d', { willReadFrequently: true })
  if (!octx) throw new Error('canvas')

  const encode = (step) =>
    new Promise((resolve, reject) => {
      if (step > 1) quantize(source, step)
      const image = octx.createImageData(spec.w, spec.h)
      const src = source.data
      const dst = image.data
      for (let i = 0; i < mask.length; i++) {
        if (!inCoverage(mask[i] ?? 0, coverage, (i / spec.w) | 0)) continue
        const p = i * 4
        dst[p] = src[p] ?? 0
        dst[p + 1] = src[p + 1] ?? 0
        dst[p + 2] = src[p + 2] ?? 0
        dst[p + 3] = src[p + 3] ?? 0
      }
      octx.putImageData(image, 0, 0)
      out.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('png'))), 'image/png')
    })

  let blob = await encode(1)
  if (blob.size > MAX_BYTES) blob = await encode(32)
  if (blob.size > MAX_BYTES) blob = await encode(64)
  if (blob.size > MAX_BYTES) throw new Error('This artwork is too detailed for a 1 MB wrap. Try a simpler image.')
  return blob
}

export async function shareOrDownload(blob, filename, title = 'Tesla') {
  const file = new File([blob], filename, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] }) && navigator.share) {
    try {
      await navigator.share({
        files: [file],
        title: filename,
        text: `${title} wrap. Tesla app → Creations → Wrap → Upload.`,
      })
      return 'shared'
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 4000)
  return 'saved'
}
