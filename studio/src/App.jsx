import { useEffect, useMemo, useState } from 'react'
import { CATEGORIES, COVERAGES, FINISHES, FILMS, VEHICLES, getFilm, getFilmThumb, getOfficialArt } from './films'
import { buildWrapFile, loadImage, MAX_BYTES, shareOrDownload, wrapFileName } from './paintshop'
import { useStudio } from './store'
import VehicleScene from './vehicle/VehicleScene'

function filmThumb(film) {
  return getFilmThumb(film)
}

function FilmsList() {
  const category = useStudio((s) => s.category)
  const wrapId = useStudio((s) => s.wrapId)
  const setWrapId = useStudio((s) => s.setWrapId)
  const setCategory = useStudio((s) => s.setCategory)
  const setFinish = useStudio((s) => s.setFinish)

  const films = useMemo(
    () => (category === 'all' ? FILMS : FILMS.filter((f) => f.category === category)),
    [category],
  )

  return (
    <>
      <div className="tabs">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={category === c.id ? 'tab active' : 'tab'}
            onClick={() => setCategory(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="film-scroll">
        {films.map((film) => {
          const thumb = filmThumb(film)
          return (
            <button
              key={film.id}
              type="button"
              className={wrapId === film.id ? 'film active' : 'film'}
              onClick={() => {
                setWrapId(film.id)
                setFinish(film.finish)
              }}
            >
              <span className="swatch" style={thumb ? undefined : { background: film.color }}>
                {thumb ? <img src={thumb} alt="" loading="lazy" /> : null}
              </span>
              <span className="film-copy">
                <span className="film-name">{film.name}</span>
                <span className="film-meta">{film.film}</span>
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}

function TunePanel() {
  const vehicle = useStudio((s) => s.vehicle)
  const film = getFilm(useStudio((s) => s.wrapId))
  const finish = useStudio((s) => s.finish)
  const coverage = useStudio((s) => s.coverage)
  const autoRotate = useStudio((s) => s.autoRotate)
  const setFinish = useStudio((s) => s.setFinish)
  const setCoverage = useStudio((s) => s.setCoverage)
  const setAutoRotate = useStudio((s) => s.setAutoRotate)
  const locked = !!film.lockFinish

  return (
    <div className="tune">
      <div className="field">
        <div className="field-head">
          <span>Finish</span>
          {locked ? <span className="hint">Locked by film</span> : null}
        </div>
        <div className="chip-row">
          {FINISHES.map((f) => (
            <button
              key={f.id}
              type="button"
              disabled={locked}
              className={(!locked && finish === f.id) || (locked && film.finish === f.id) ? 'chip active' : 'chip'}
              onClick={() => setFinish(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <div className="field-head">
          <span>Coverage</span>
          {vehicle === 'model3' ? <span className="hint">Full coverage for Model 3</span> : null}
        </div>
        <div className="chip-row">
          {COVERAGES.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={vehicle === 'model3' && c.id !== 'full'}
              className={coverage === c.id ? 'chip active' : 'chip'}
              onClick={() => setCoverage(c.id)}
              title={c.hint}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <label className="toggle">
        <input type="checkbox" checked={autoRotate} onChange={(e) => setAutoRotate(e.target.checked)} />
        <span>Auto-rotate preview</span>
      </label>
      <p className="blurb">{film.blurb}</p>
    </div>
  )
}

function YoursPanel() {
  const [uploading, setUploading] = useState(false)
  const setToast = useStudio((s) => s.setToast)
  const customSrc = useStudio((s) => s.customSrc)
  const customFit = useStudio((s) => s.customFit)
  const setCustomSrc = useStudio((s) => s.setCustomSrc)
  const setCustomFit = useStudio((s) => s.setCustomFit)
  const clearCustom = useStudio((s) => s.clearCustom)

  return (
    <div className="yours">
      <p className="blurb">Upload your own art. It maps onto the body in the 3D preview and into the Paint Shop PNG.</p>
      <label className="upload-zone">
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          disabled={uploading}
          aria-label="Upload artwork"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 20e6) {
              setToast('Choose a PNG, JPG, or WebP under 20 MB.')
              return
            }
            setUploading(true)
            const src = URL.createObjectURL(file)
            try {
              await loadImage(src)
              setCustomSrc(src)
            } catch {
              URL.revokeObjectURL(src)
              setToast('This image could not be opened. Try another file.')
            } finally {
              setUploading(false)
            }
          }}
        />
        <strong>{uploading ? 'Opening artwork…' : customSrc ? 'Replace artwork' : 'Upload artwork'}</strong>
        <small>PNG, JPG, or WebP · up to 20 MB</small>
      </label>
      {customSrc ? (
        <div className="fit-controls">
          <button type="button" className="chip" onClick={clearCustom}>
            Remove
          </button>
          <label>
            Scale <output>{Math.round(customFit.scale * 100)}%</output>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.05"
              value={customFit.scale}
              onChange={(e) => setCustomFit({ ...customFit, scale: +e.target.value })}
            />
          </label>
          <label>
            X <output>{customFit.x}</output>
            <input
              type="range"
              min="-400"
              max="400"
              value={customFit.x}
              onChange={(e) => setCustomFit({ ...customFit, x: +e.target.value })}
            />
          </label>
          <label>
            Y <output>{customFit.y}</output>
            <input
              type="range"
              min="-400"
              max="400"
              value={customFit.y}
              onChange={(e) => setCustomFit({ ...customFit, y: +e.target.value })}
            />
          </label>
        </div>
      ) : null}
    </div>
  )
}

function SendButton({ block }) {
  const wrapId = useStudio((s) => s.wrapId)
  const coverage = useStudio((s) => s.coverage)
  const customSrc = useStudio((s) => s.customSrc)
  const customFit = useStudio((s) => s.customFit)
  const vehicle = useStudio((s) => s.vehicle)
  const setUpload = useStudio((s) => s.setUpload)
  const setToast = useStudio((s) => s.setToast)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const film = getFilm(wrapId)
  const vehicleMeta = VEHICLES.find((v) => v.id === vehicle)

  useEffect(() => {
    let dead = false
    setReady(false)
    const officialArt = getOfficialArt(film, vehicle)
    if (officialArt && !customSrc && coverage === 'full') {
      setReady(true)
      return undefined
    }
    buildWrapFile(film, coverage, customSrc, customFit, vehicle)
      .then(() => {
        if (!dead) setReady(true)
      })
      .catch(() => {
        if (!dead) {
          setReady(true)
          setToast('Could not build the wrap file. Try send again.')
        }
      })
    return () => {
      dead = true
    }
  }, [wrapId, coverage, customSrc, customFit, vehicle, film, setToast])

  async function onSend() {
    setBusy(true)
    try {
      const officialArt = getOfficialArt(film, vehicle)
      const useOfficialFile = officialArt && !customSrc && coverage === 'full'
      const blob = useOfficialFile
        ? await fetch(officialArt).then((r) => {
            if (!r.ok) throw new Error('The official wrap could not be downloaded.')
            return r.blob()
          })
        : await buildWrapFile(film, coverage, customSrc, customFit, vehicle)
      if (blob.size > MAX_BYTES) throw new Error('This wrap exceeds the 1 MB upload limit.')
      const name = useOfficialFile ? officialArt.split('/').pop() : wrapFileName(customSrc ? 'Custom' : film.name, vehicle)
      const result = await shareOrDownload(blob, name, `${vehicleMeta.name} ${vehicleMeta.trim}`)
      setUpload({ name, vehicle, bytes: blob.size, url: URL.createObjectURL(blob) })
      if (result === 'saved') setToast('Wrap file saved')
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) setToast(err.message || 'Save failed. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button type="button" className={block ? 'send block' : 'send'} disabled={!ready || busy} onClick={onSend}>
      {busy || !ready ? 'Prepping file' : vehicle === 'model3' ? 'Send to phone' : 'Send to truck'}
    </button>
  )
}

function UploadModal() {
  const upload = useStudio((s) => s.upload)
  const clearUpload = useStudio((s) => s.clearUpload)
  if (!upload) return null
  const vehicle = upload.vehicle
  const kb = Math.max(1, Math.round(upload.bytes / 1024))
  const vehicleMeta = VEHICLES.find((v) => v.id === vehicle)
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-head">
          <div>
            <p className="eyebrow">
              {vehicle === 'model3' ? 'Model 3 Standard · phone key' : 'AWD Cybertruck Premium'}
            </p>
            <h2>Ready to upload</h2>
          </div>
          <button type="button" className="icon-btn" onClick={clearUpload} aria-label="Close">
            ✕
          </button>
        </div>
        <img className="modal-preview" src={upload.url} alt={upload.name} />
        <p className="modal-meta">
          {upload.name} · {kb} KB · {vehicleMeta.trim}
        </p>
        <ol className="steps">
          <li>Open the Tesla app → Creations → Wrap → Upload</li>
          <li>Pick this PNG (or drop it in a USB Wraps folder)</li>
          <li>In the car: Toybox → Paint Shop → Wraps</li>
        </ol>
        <a className="send block" href={upload.url} download={upload.name}>
          Download again
        </a>
      </div>
    </div>
  )
}

function Toast() {
  const toast = useStudio((s) => s.toast)
  const setToast = useStudio((s) => s.setToast)
  useEffect(() => {
    if (!toast) return undefined
    const id = window.setTimeout(() => setToast(null), 2800)
    return () => window.clearTimeout(id)
  }, [toast, setToast])
  if (!toast) return null
  return <div className="toast" role="status">{toast}</div>
}

export default function App() {
  const vehicle = useStudio((s) => s.vehicle)
  const setVehicle = useStudio((s) => s.setVehicle)
  const panel = useStudio((s) => s.panel)
  const setPanel = useStudio((s) => s.setPanel)
  const wrapId = useStudio((s) => s.wrapId)
  const film = getFilm(wrapId)
  const vehicleMeta = VEHICLES.find((v) => v.id === vehicle)
  const customSrc = useStudio((s) => s.customSrc)
  const title = customSrc ? 'Custom artwork' : vehicle === 'model3' && film.id === 'stainless' ? 'Factory White' : film.name

  return (
    <div className="cabin">
      <div className="starfield" aria-hidden="true" />
      <div className="screen">
        <header className="topbar">
          <p className="brand">A&D</p>
          <div className="vehicle-toggle">
            {VEHICLES.map((v) => (
              <button
                key={v.id}
                type="button"
                className={vehicle === v.id ? 'active' : ''}
                onClick={() => setVehicle(v.id)}
              >
                {v.name}
              </button>
            ))}
          </div>
          <button type="button" className="films-link" onClick={() => setPanel('films')}>
            Films
          </button>
        </header>

        <div className="workspace">
          <div className="stage">
            <VehicleScene />
          </div>

          <aside className="rail">
            <div className="selected">
              <p className="title">{title}</p>
              <p className="sub">
                {vehicleMeta.trim} · {film.film}
              </p>
            </div>

            <div className="panel-body">
              {panel === 'films' ? <FilmsList /> : null}
              {panel === 'tune' ? <TunePanel /> : null}
              {panel === 'yours' ? <YoursPanel /> : null}
            </div>

            <div className="rail-footer">
              <div className="action-row">
                <button
                  type="button"
                  className={panel === 'yours' ? 'ghost active' : 'ghost'}
                  onClick={() => setPanel(panel === 'yours' ? 'films' : 'yours')}
                >
                  Yours
                </button>
                <button
                  type="button"
                  className={panel === 'tune' ? 'ghost active' : 'ghost'}
                  onClick={() => setPanel(panel === 'tune' ? 'films' : 'tune')}
                >
                  Tune
                </button>
                <SendButton />
              </div>
            </div>
          </aside>
        </div>
      </div>
      <UploadModal />
      <Toast />
    </div>
  )
}
