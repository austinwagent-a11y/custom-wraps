import { test, expect } from '@playwright/test'

for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
  test(`vehicle, artwork and download flow at ${viewport.width}px`, async ({ page }) => {
    test.setTimeout(90000)
    await page.setViewportSize(viewport)
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    await page.goto('/')
    await expect(page.locator('.selected .title')).toHaveText('Desert Khaki')
    await expect(page.getByRole('button', { name: 'Send to truck' })).toBeEnabled()
    await expect(page.locator('.film').first()).toBeVisible()
    expect((await page.locator('.film').first().boundingBox()).height).toBeGreaterThan(50)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('button', { name: 'Model 3', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Send to phone' })).toBeEnabled()
    await page.getByRole('button', { name: 'Tune', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Lower', exact: true })).toBeDisabled()
    await page.getByRole('button', { name: 'Cybertruck', exact: true }).click()
    await page.getByRole('button', { name: 'Lower', exact: true }).click()
    await page.getByRole('button', { name: 'Full', exact: true }).click()
    await page.getByRole('button', { name: 'Yours', exact: true }).click()
    await page.getByLabel('Upload artwork', { exact: true }).setInputFiles({
      name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not an image'),
    })
    await expect(page.getByRole('status')).toContainText('could not be opened')
    const data = await page.evaluate(() => {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 128
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      ctx.fillStyle = '#ff0000'
      ctx.fillRect(0, 0, 64, 128)
      return canvas.toDataURL().split(',')[1]
    })
    await page.getByLabel('Upload artwork', { exact: true }).setInputFiles({
      name: 'art.png', mimeType: 'image/png', buffer: Buffer.from(data, 'base64'),
    })
    await expect(page.locator('.selected .title')).toHaveText('Custom artwork')
    const canvas = page.locator('.stage canvas')
    await expect(canvas).toBeVisible()
    const frame = () => canvas.evaluate((node) => node.toDataURL())
    let settled = await frame()
    await expect.poll(async () => {
      const next = await frame()
      const same = next === settled
      settled = next
      return same
    }, { timeout: 15000 }).toBe(true)
    const before = settled
    const scale = page.getByRole('slider').first()
    const offsetX = page.getByRole('slider').nth(1)
    await scale.fill('0.5')
    await offsetX.fill('200')
    await expect(scale).toHaveValue('0.5')
    await expect(offsetX).toHaveValue('200')
    await expect.poll(async () => (await frame()) === before, { timeout: 8000 }).toBe(false)
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Send to truck' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('CT Custom.png')
    await expect(page.getByRole('heading', { name: 'Ready to upload' })).toBeVisible()
    const exported = await page.locator('.modal-preview').evaluate(async (img) => {
      await img.decode()
      const blob = await fetch(img.src).then((r) => r.blob())
      return { width: img.naturalWidth, height: img.naturalHeight, bytes: blob.size }
    })
    expect(exported.width).toBe(1024)
    expect(exported.height).toBe(768)
    expect(exported.bytes).toBeLessThanOrEqual(1e6)
    await page.getByRole('button', { name: 'Close', exact: true }).click()
    await page.getByRole('button', { name: 'Films', exact: true }).click()
    await page.getByRole('button', { name: /^Cherry(?: Gloss cherry)?$/ }).click()
    await expect(page.locator('.selected .title')).toHaveText('Cherry')
    await page.getByRole('button', { name: 'Yours', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Remove', exact: true })).toHaveCount(0)
    await page.screenshot({ path: test.info().outputPath('studio.png') })
    expect(errors).toEqual([])
  })
}

test('export preserves artwork background, official pixels and vehicle dimensions', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { buildWrapFile, paintArtwork, loadImage } = await import('/src/paintshop.js')
    const { getFilm } = await import('/src/films.js')
    const art = document.createElement('canvas')
    art.width = art.height = 100
    const actx = art.getContext('2d')
    actx.fillStyle = '#ff0000'
    actx.fillRect(0, 0, 50, 100)
    const source = art.toDataURL()
    const fit = { x: 150, y: 50, scale: 0.5 }
    const canvas = document.createElement('canvas')
    canvas.width = 1024; canvas.height = 768
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    paintArtwork(ctx, await loadImage(source), fit, '#b7a48a')
    const expected = ctx.getImageData(0, 0, 1024, 768).data
    const blob = await buildWrapFile(getFilm('khaki'), 'full', source, fit)
    const bitmap = await createImageBitmap(blob)
    ctx.clearRect(0, 0, 1024, 768)
    ctx.drawImage(bitmap, 0, 0)
    const actual = ctx.getImageData(0, 0, 1024, 768).data
    let mismatch = 0, opaque = 0, background = 0
    for (let i = 0; i < actual.length; i += 4) {
      if (!actual[i + 3]) continue
      opaque++
      if (actual[i] !== expected[i] || actual[i + 1] !== expected[i + 1] || actual[i + 2] !== expected[i + 2]) mismatch++
      if (actual[i] === 183 && actual[i + 1] === 164 && actual[i + 2] === 138) background++
    }
    let officialMismatch = 0, officialOpaque = 0
    const { getOfficialArt } = await import('/src/films.js')
    for (const id of ['cosmic', 'gradblack']) {
      const film = getFilm(id)
      const officialSrc = getOfficialArt(film, 'cybertruck')
      const official = await buildWrapFile(film, 'lower', null, undefined, 'cybertruck')
      const officialImage = await createImageBitmap(await fetch(officialSrc).then((r) => r.blob()))
      ctx.clearRect(0, 0, 1024, 768); ctx.drawImage(officialImage, 0, 0, 1024, 768)
      const officialPixels = ctx.getImageData(0, 0, 1024, 768).data
      ctx.clearRect(0, 0, 1024, 768); ctx.drawImage(await createImageBitmap(official), 0, 0)
      const cropped = ctx.getImageData(0, 0, 1024, 768).data
      for (let i = 0; i < cropped.length; i += 4) {
        if (!cropped[i + 3]) continue
        officialOpaque++
        if (cropped[i] !== officialPixels[i] || cropped[i + 1] !== officialPixels[i + 1] || cropped[i + 2] !== officialPixels[i + 2] || cropped[i + 3] !== officialPixels[i + 3]) officialMismatch++
      }
    }
    const model3 = await buildWrapFile(getFilm('stainless'), 'full', null, undefined, 'model3')
    const m3 = await createImageBitmap(model3)
    const m3Canvas = document.createElement('canvas')
    m3Canvas.width = m3Canvas.height = 1024
    const m3ctx = m3Canvas.getContext('2d', { willReadFrequently: true })
    m3ctx.drawImage(m3, 0, 0)
    const white = Array.from(m3ctx.getImageData(500, 50, 1, 1).data)
    return { mismatch, opaque, background, officialMismatch, officialOpaque, model3: [m3.width, m3.height], white }
  })
  expect(result.mismatch).toBe(0)
  expect(result.opaque).toBeGreaterThan(100000)
  expect(result.background).toBeGreaterThan(100000)
  expect(result.officialMismatch).toBe(0)
  expect(result.officialOpaque).toBeGreaterThan(1000)
  expect(result.model3).toEqual([1024, 1024])
  expect(result.white).toEqual([243, 243, 241, 255])
})

test('Model 3 Cosmic Burst export uses Model 3 UV, not Cybertruck', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { buildWrapFile } = await import('/src/paintshop.js')
    const { getFilm, getOfficialArt } = await import('/src/films.js')
    const film = getFilm('cosmic')
    const ctSrc = getOfficialArt(film, 'cybertruck')
    const m3Src = getOfficialArt(film, 'model3')
    if (!ctSrc || !m3Src || ctSrc === m3Src) throw new Error('expected distinct vehicle official paths')

    const m3Blob = await buildWrapFile(film, 'full', null, undefined, 'model3')
    const m3Export = await createImageBitmap(m3Blob)
    const m3Official = await createImageBitmap(await fetch(m3Src).then((r) => r.blob()))
    const ctOfficial = await createImageBitmap(await fetch(ctSrc).then((r) => r.blob()))

    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1024
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    const sample = async (bitmap) => {
      ctx.clearRect(0, 0, 1024, 1024)
      ctx.drawImage(bitmap, 0, 0, 1024, 1024)
      return ctx.getImageData(0, 0, 1024, 1024).data
    }

    const exported = await sample(m3Export)
    const expected = await sample(m3Official)
    const wrongVehicle = await sample(ctOfficial)

    let matchM3 = 0
    let matchCT = 0
    let opaque = 0
    for (let i = 0; i < exported.length; i += 4) {
      if (!exported[i + 3]) continue
      opaque++
      if (
        exported[i] === expected[i] &&
        exported[i + 1] === expected[i + 1] &&
        exported[i + 2] === expected[i + 2]
      ) matchM3++
      if (
        exported[i] === wrongVehicle[i] &&
        exported[i + 1] === wrongVehicle[i + 1] &&
        exported[i + 2] === wrongVehicle[i + 2]
      ) matchCT++
    }

    // Digi has no Model 3 official art — export must not pull Cybertruck UV.
    const digi = getFilm('digi')
    if (getOfficialArt(digi, 'model3')) throw new Error('digi should not have Model 3 official art yet')
    const digiBlob = await buildWrapFile(digi, 'full', null, undefined, 'model3')
    const digiBmp = await createImageBitmap(digiBlob)

    return {
      ctSrc,
      m3Src,
      size: [m3Export.width, m3Export.height],
      bytes: m3Blob.size,
      opaque,
      matchM3Ratio: matchM3 / opaque,
      matchCTRatio: matchCT / opaque,
      digiSize: [digiBmp.width, digiBmp.height],
    }
  })

  expect(result.ctSrc).toContain('/official/cybertruck/')
  expect(result.m3Src).toContain('/official/model3/')
  expect(result.size).toEqual([1024, 1024])
  expect(result.bytes).toBeLessThanOrEqual(1e6)
  expect(result.matchM3Ratio).toBeGreaterThan(0.98)
  expect(result.matchCTRatio).toBeLessThan(0.5)
  expect(result.digiSize).toEqual([1024, 1024])
})
