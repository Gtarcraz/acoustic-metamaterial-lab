import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts'
import './style.css'

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x))
const round = (x, d = 2) => Number(x.toFixed(d))

function braggFrequency(c, periodCm) {
  const a = periodCm / 100
  return c / (2 * Math.max(a, 1e-6))
}

function localFrequencyQuarterWave(c, resonatorLengthCm) {
  const L = resonatorLengthCm / 100
  return c / (4 * Math.max(L, 1e-6))
}

function gaussianPeak(freq, center, width, amp) {
  const x = (freq - center) / Math.max(width, 1e-6)
  return amp * Math.exp(-0.5 * x * x)
}

function lorentzPeak(freq, center, width, amp) {
  const x = (freq - center) / Math.max(width, 1e-6)
  return amp / (1 + x * x)
}

function pressureColor(v) {
  const x = clamp(v, -1, 1)
  if (x >= 0) {
    const g = Math.round(240 - 120 * x)
    const b = Math.round(240 - 200 * x)
    return `rgb(239, ${g}, ${b})`
  }
  const t = -x
  const r = Math.round(240 - 200 * t)
  const g = Math.round(240 - 120 * t)
  return `rgb(${r}, ${g}, 239)`
}

function tubeHalfHeight(params, cellIndex) {
  const wide = params.mainWidthCm * 1.25
  const narrow = Math.max(0.8, params.braggNarrowWidthCm) * 1.25
  if (!params.enableBragg) return wide
  return cellIndex % 2 === 0 ? wide : narrow
}

/*
  Simple classroom model:
  - Bragg stop band centered near c/(2a), strength comes from width modulation contrast.
  - Local resonator stop band centered near c/(4L), depth comes from neck/cavity widths and repeated cells.
  - Low damping may create mild amplification near resonance.
  This is not a full transfer-matrix or FEM model; it is a design-intuition model.
*/
function transmissionModel(params, freq) {
  const fB = braggFrequency(params.c, params.periodCm)
  const fR = localFrequencyQuarterWave(params.c, params.resonatorLengthCm)

  const widthContrast = clamp(
    Math.abs(params.mainWidthCm - params.braggNarrowWidthCm) / Math.max(params.mainWidthCm, 1e-6),
    0,
    1.2,
  )
  const braggBase = 0.18 + 1.15 * widthContrast
  const braggWidthHz = Math.max(90, fB * (0.14 + 0.03 / Math.sqrt(params.cells)))
  const braggEffect = params.enableBragg
    ? params.cells * 0.24 * gaussianPeak(freq, fB, braggWidthHz, braggBase)
    : 0

  const branchCoupling = clamp(
    0.28 + 0.45 * params.neckWidthCm / Math.max(params.mainWidthCm, 0.5) + 0.35 * params.resonatorWidthCm / Math.max(params.mainWidthCm, 0.5),
    0,
    1.5,
  )
  const localWidthHz = Math.max(
    35,
    fR * (0.05 + 0.12 * params.loss + 0.05 * params.neckWidthCm / Math.max(params.mainWidthCm, 0.5)),
  )
  const localEffect = params.enableLocal
    ? params.cells * 0.22 * lorentzPeak(freq, fR, localWidthHz, branchCoupling)
    : 0

  const backgroundLoss = params.loss * params.cells * (0.04 + 0.00005 * freq)

  const amplification = params.enableLocal
    ? 1 + (1 - params.loss) * 0.34 * lorentzPeak(freq, 1.04 * fR, 1.4 * localWidthHz, branchCoupling)
    : 1

  const attenuation = Math.exp(-(braggEffect + localEffect + backgroundLoss))
  const T = clamp(amplification * attenuation, 0.001, 2.2)

  return {
    T,
    fB,
    fR,
    braggEffect,
    localEffect,
    widthContrast,
    branchCoupling,
    localWidthHz,
  }
}

function sweepData(params) {
  const out = []
  for (let f = 100; f <= 4000; f += 25) {
    const m = transmissionModel(params, f)
    out.push({ f: round(f, 0), T: round(m.T, 3) })
  }
  return out
}

function pressureProfile(params) {
  const m = transmissionModel(params, params.frequency)
  const out = []
  for (let i = 0; i <= params.cells; i++) {
    const s = i / Math.max(params.cells, 1)
    const envelope = Math.pow(m.T, s)
    out.push({ x: i, pressureAmp: round(clamp(envelope, 0, 2.2), 3) })
  }
  return out
}

function AcousticTubeSvg({ params, time }) {
  const width = 980
  const height = 390
  const x0 = 70
  const totalW = 780
  const centerY = 170
  const cellW = totalW / params.cells
  const phase = 2 * Math.PI * params.frequency * time * 0.55
  const model = transmissionModel(params, params.frequency)
  const slices = []
  const sliceCount = 130

  for (let i = 0; i < sliceCount; i++) {
    const s = i / sliceCount
    const x = x0 + s * totalW
    const cellIndex = Math.min(params.cells - 1, Math.floor(s * params.cells))
    const halfH = tubeHalfHeight(params, cellIndex)
    const env = Math.pow(model.T, s)
    const pressure = clamp(env * Math.sin(2 * Math.PI * (3.4 * s - params.frequency * time * 0.72)), -1, 1)
    slices.push({ x, y: centerY - halfH, h: 2 * halfH, w: totalW / sliceCount + 1.2, pressure })
  }

  const branchPressure = i => {
    const s = (i + 0.5) / params.cells
    const env = Math.pow(model.T, s)
    return clamp(env * Math.sin(phase - i * 0.8), -1, 1)
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="tubeSvg">
      <text x={x0} y="34" className="svgTitle">pressure shown by color: red = compression, blue = rarefaction</text>
      <text x={x0} y="56" className="svgSubtitle">the main pipe width modulation creates Bragg scattering; the side branches create local resonances</text>

      {slices.map((s, idx) => (
        <rect key={idx} x={s.x} y={s.y} width={s.w} height={s.h} fill={pressureColor(s.pressure)} stroke="none" />
      ))}

      <path
        d={`M ${x0} ${centerY - tubeHalfHeight(params, 0)} ${Array.from({ length: params.cells }, (_, i) => {
          const xA = x0 + i * cellW
          const xB = x0 + (i + 1) * cellW
          const halfH = tubeHalfHeight(params, i)
          return `L ${xA} ${centerY - halfH} L ${xB} ${centerY - halfH}`
        }).join(' ')} L ${x0 + totalW} ${centerY + tubeHalfHeight(params, params.cells - 1)} ${Array.from({ length: params.cells }, (_, j) => {
          const i = params.cells - 1 - j
          const xA = x0 + (i + 1) * cellW
          const xB = x0 + i * cellW
          const halfH = tubeHalfHeight(params, i)
          return `L ${xA} ${centerY + halfH} L ${xB} ${centerY + halfH}`
        }).join(' ')} Z`}
        fill="none"
        className="tubeOutline"
      />

      <line x1={x0} y1={centerY} x2={x0 + totalW} y2={centerY} className="centerLine" />

      {params.enableBragg && Array.from({ length: params.cells }, (_, i) => {
        const x = x0 + i * cellW
        const xm = x0 + (i + 0.5) * cellW
        return (
          <g key={`bragg-${i}`}>
            <text x={xm} y={centerY - tubeHalfHeight(params, i) - 12} textAnchor="middle" className="tinyLabel">
              {i % 2 === 0 ? `W=${round(params.mainWidthCm, 1)} cm` : `w=${round(params.braggNarrowWidthCm, 1)} cm`}
            </text>
            <line x1={x} y1={centerY - 74} x2={x} y2={centerY + 74} className="cellDivider" />
          </g>
        )
      })}

      {params.enableLocal && Array.from({ length: params.cells }, (_, i) => {
        const xMid = x0 + (i + 0.5) * cellW
        const topY = centerY + tubeHalfHeight(params, i)
        const neckW = params.neckWidthCm * 4.2
        const branchW = params.resonatorWidthCm * 4.2
        const branchL = params.resonatorLengthCm * 1.7
        const p = branchPressure(i)
        return (
          <g key={`branch-${i}`}>
            <rect
              x={xMid - neckW / 2}
              y={topY}
              width={neckW}
              height={16}
              fill={pressureColor(0.7 * p)}
              className="branchBox"
            />
            <rect
              x={xMid - branchW / 2}
              y={topY + 16}
              width={branchW}
              height={branchL}
              fill={pressureColor(p)}
              className="branchBox"
            />
            <text x={xMid + branchW / 2 + 8} y={topY + 34} className="branchLabel">L={round(params.resonatorLengthCm, 1)} cm</text>
            <text x={xMid + branchW / 2 + 8} y={topY + 52} className="branchLabel">W={round(params.resonatorWidthCm, 1)} cm</text>
            <text x={xMid + branchW / 2 + 8} y={topY + 70} className="branchLabel">neck={round(params.neckWidthCm, 1)} cm</text>
          </g>
        )
      })}

      <text x={x0 - 16} y={centerY + 4} textAnchor="end" className="label">speaker</text>
      <text x={x0 + totalW + 18} y={centerY + 4} className="label">microphone</text>

      <g className="legendBox">
        <rect x="700" y="18" width="235" height="112" rx="14" className="legendBg" />
        <rect x="718" y="38" width="22" height="14" fill={pressureColor(0.9)} />
        <text x="748" y="50" className="legendText">red = compression (+ pressure)</text>
        <rect x="718" y="62" width="22" height="14" fill={pressureColor(-0.9)} />
        <text x="748" y="74" className="legendText">blue = rarefaction (- pressure)</text>
        <line x1="718" y1="92" x2="742" y2="92" className="tubeOutlineMini" />
        <text x="748" y="96" className="legendText">modulated pipe width = Bragg</text>
        <rect x="718" y="105" width="12" height="10" className="branchBox" fill={pressureColor(0.4)} />
        <rect x="714" y="115" width="20" height="18" className="branchBox" fill={pressureColor(-0.4)} />
        <text x="748" y="126" className="legendText">side branch = local resonator</text>
      </g>

      <text x={x0} y="350" className="label">Predicted Bragg frequency: {round(model.fB, 0)} Hz</text>
      <text x={x0 + 290} y="350" className="label">Predicted local resonance: {round(model.fR, 0)} Hz</text>
      <text x={x0 + 585} y="350" className="label">Transmission T = {round(model.T, 2)}</text>
    </svg>
  )
}

function App() {
  const [params, setParams] = useState({
    c: 343,
    frequency: 1000,
    cells: 6,
    periodCm: 17,
    mainWidthCm: 3.5,
    braggNarrowWidthCm: 1.6,
    resonatorLengthCm: 8.6,
    resonatorWidthCm: 2.6,
    neckWidthCm: 1.0,
    loss: 0.18,
    enableBragg: true,
    enableLocal: true,
  })

  const [running, setRunning] = useState(true)
  const [time, setTime] = useState(0)
  const last = useRef(null)

  useEffect(() => {
    let raf
    const loop = ts => {
      if (last.current == null) last.current = ts
      const dt = (ts - last.current) / 1000
      last.current = ts
      if (running) setTime(t => t + dt)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [running])

  const set = (key, value) => setParams(p => ({ ...p, [key]: value }))
  const model = useMemo(() => transmissionModel(params, params.frequency), [params])
  const sweep = useMemo(() => sweepData(params), [params])
  const profile = useMemo(() => pressureProfile(params), [params])

  const recommendedPeriodCm = round((params.c / (2 * params.frequency)) * 100, 2)
  const recommendedResLengthCm = round((params.c / (4 * params.frequency)) * 100, 2)

  const designCode = [
    `cells=${params.cells}`,
    `a=${params.periodCm}cm`,
    `W=${params.mainWidthCm}cm`,
    `w=${params.braggNarrowWidthCm}cm`,
    `Lr=${params.resonatorLengthCm}cm`,
    `Wr=${params.resonatorWidthCm}cm`,
    `Wn=${params.neckWidthCm}cm`,
    `f=${params.frequency}Hz`,
    `Bragg=${params.enableBragg ? 'on' : 'off'}`,
    `Local=${params.enableLocal ? 'on' : 'off'}`,
    `loss=${params.loss}`,
  ].join('; ')

  return (
    <main>
      <header className="hero">
        <div>
          <h1>Acoustic Metamaterial Lab</h1>
          <p>Design a 1D longitudinal sound-wave metamaterial using pipe-width modulation (Bragg scattering) and side branches (local resonators).</p>
        </div>
        <div className="heroButtons">
          <a href={`${import.meta.env.BASE_URL}docs/`} className="docButton">Open theory docs</a>
          <button onClick={() => setRunning(v => !v)}>{running ? 'Pause' : 'Play'}</button>
        </div>
      </header>

      <section className="grid">
        <div className="card fullSpan application">
          <div>
            <h2>Real-world application</h2>
            <p>
              Acoustic chambers, silencers, mufflers, HVAC ducts, and noise barriers all use geometry to control sound.
              This app now shows the two mechanisms directly: width-modulated pipes for Bragg scattering and side-branch resonators with adjustable length and width.
            </p>
            <p className="credit">
              Photo: an acoustic anechoic chamber from Wikimedia Commons. It shows a real sound-control environment using patterned absorbing wedges.
            </p>
          </div>
          <img src={`${import.meta.env.BASE_URL}images/anechoic-chamber.jpg`} alt="Real acoustic anechoic chamber with sound absorbing wedges" />
        </div>

        <div className="card fullSpan qrCard">
          <div>
            <h2>Classroom QR code</h2>
            <p>After GitHub Pages is enabled, students can scan this code to open the app directly.</p>
            <p className="qrUrl">https://gtarcraz.github.io/acoustic-metamaterial-lab/</p>
          </div>
          <img src={`${import.meta.env.BASE_URL}images/qr-acoustic-metamaterial-lab.png`} alt="QR code for Acoustic Metamaterial Lab" />
        </div>

        <div className="card fullSpan theoryGrid">
          <div className="theoryCard">
            <h2>Bragg scattering</h2>
            <p>Periodic width changes reflect the wave many times. When the cell spacing matches about half a wavelength, the reflections add up and reduce transmission.</p>
            <pre>{`f_Bragg ≈ c / (2a)`}</pre>
            <p className="hint"><b>a</b> = unit-cell length / period. Stronger width contrast gives a deeper Bragg stop band.</p>
          </div>
          <div className="theoryCard">
            <h2>Local resonators</h2>
            <p>Each side branch acts like an acoustic resonator. The branch length sets the frequency; the neck and cavity widths control how strongly it couples to the main pipe.</p>
            <pre>{`f_res ≈ c / (4L_r)`}</pre>
            <p className="hint"><b>L_r</b> = resonator length, <b>W_n</b> = neck width, <b>W_r</b> = resonator width.</p>
          </div>
          <div className="theoryCard">
            <h2>Link to EM metamaterials</h2>
            <p>The same design philosophy appears in EM metamaterials: periodicity creates Bragg effects, while local resonators create compact stop bands.</p>
            <table>
              <tbody>
                <tr><td>sound pressure</td><td>electric / magnetic field</td></tr>
                <tr><td>modulated pipe</td><td>periodic EM line / photonic crystal</td></tr>
                <tr><td>side branch</td><td>LC / patch / split-ring resonator</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="card fullSpan equationsPanel">
          <h2>Quick design equations</h2>
          <div className="equationGrid">
            <div className="equationCard">
              <div className="equation">f_Bragg ≈ c / (2a)</div>
              <p>To block a target frequency, choose the pipe period <b>a ≈ c / (2f)</b>.</p>
              <p className="designHint">For {round(params.frequency, 0)} Hz, start with <b>a ≈ {recommendedPeriodCm} cm</b>.</p>
            </div>
            <div className="equationCard">
              <div className="equation">f_res ≈ c / (4L_r)</div>
              <p>For a quarter-wave local resonator, choose branch length <b>L_r ≈ c / (4f)</b>.</p>
              <p className="designHint">For {round(params.frequency, 0)} Hz, start with <b>L_r ≈ {recommendedResLengthCm} cm</b>.</p>
            </div>
            <div className="equationCard">
              <div className="equation">T(f) = |p_out| / |p_in|</div>
              <p>Low transmission means the design blocks sound well at that frequency.</p>
              <p className="designHint">Current prediction: <b>T = {round(model.T, 2)}</b>.</p>
            </div>
          </div>
        </div>

        <div className="card fullSpan">
          <div className="cardHead">
            <h2>1. Animated 1D metamaterial view</h2>
            <span className={model.T < 0.35 ? 'badge good' : model.T > 1 ? 'badge danger' : 'badge'}>
              {model.T < 0.35 ? 'blocked' : model.T > 1 ? 'amplified' : 'passes'}
            </span>
          </div>
          <AcousticTubeSvg params={params} time={time} />
          <div className="metricRow four">
            <div><b>Current frequency</b><span>{round(params.frequency, 0)} Hz</span></div>
            <div><b>Transmission</b><span>{round(model.T, 2)}</span></div>
            <div><b>Bragg prediction</b><span>{round(model.fB, 0)} Hz</span></div>
            <div><b>Local resonance</b><span>{round(model.fR, 0)} Hz</span></div>
          </div>
        </div>

        <div className="card controls">
          <h2>2. Geometry controls</h2>

          <label>Current sound frequency: {round(params.frequency, 0)} Hz
            <input type="range" min="100" max="4000" step="10" value={params.frequency} onChange={e => set('frequency', +e.target.value)} />
          </label>

          <label>Number of unit cells: {params.cells}
            <input type="range" min="1" max="12" step="1" value={params.cells} onChange={e => set('cells', +e.target.value)} />
          </label>

          <label className="check">
            <input type="checkbox" checked={params.enableBragg} onChange={e => set('enableBragg', e.target.checked)} />
            Enable Bragg pipe-width modulation
          </label>

          <label>Cell period a: {params.periodCm.toFixed(1)} cm
            <input type="range" min="4" max="80" step="0.5" value={params.periodCm} onChange={e => set('periodCm', +e.target.value)} />
          </label>

          <label>Main pipe width W: {params.mainWidthCm.toFixed(1)} cm
            <input type="range" min="1.0" max="8.0" step="0.1" value={params.mainWidthCm} onChange={e => set('mainWidthCm', +e.target.value)} />
          </label>

          <label>Narrow pipe width w: {params.braggNarrowWidthCm.toFixed(1)} cm
            <input type="range" min="0.6" max="8.0" step="0.1" value={params.braggNarrowWidthCm} onChange={e => set('braggNarrowWidthCm', +e.target.value)} />
          </label>

          <label className="check">
            <input type="checkbox" checked={params.enableLocal} onChange={e => set('enableLocal', e.target.checked)} />
            Enable local side resonators
          </label>

          <label>Resonator length Lr: {params.resonatorLengthCm.toFixed(1)} cm
            <input type="range" min="2" max="80" step="0.2" value={params.resonatorLengthCm} onChange={e => set('resonatorLengthCm', +e.target.value)} />
          </label>

          <label>Resonator width Wr: {params.resonatorWidthCm.toFixed(1)} cm
            <input type="range" min="0.8" max="6.0" step="0.1" value={params.resonatorWidthCm} onChange={e => set('resonatorWidthCm', +e.target.value)} />
          </label>

          <label>Neck width Wn: {params.neckWidthCm.toFixed(1)} cm
            <input type="range" min="0.4" max="4.0" step="0.1" value={params.neckWidthCm} onChange={e => set('neckWidthCm', +e.target.value)} />
          </label>

          <label>Loss / damping: {params.loss.toFixed(2)}
            <input type="range" min="0" max="1" step="0.01" value={params.loss} onChange={e => set('loss', +e.target.value)} />
          </label>
        </div>

        <div className="card wide">
          <h2>3. Pressure amplitude over distance</h2>
          <p className="hint">This plot shows the pressure-amplitude envelope after each unit cell.</p>
          <div className="chartBox">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={profile}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="x" label={{ value: 'unit-cell index / distance', position: 'insideBottom', offset: -4 }} />
                <YAxis label={{ value: '|p(x)| / |p_in|', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Line type="monotone" dataKey="pressureAmp" name="pressure amplitude" strokeWidth={3} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card fullSpan">
          <h2>4. Frequency sweep</h2>
          <p className="hint">Red = current frequency, blue = Bragg prediction, orange = local resonance prediction.</p>
          <div className="chartBox">
            <ResponsiveContainer width="100%" height={330}>
              <LineChart data={sweep}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="f" label={{ value: 'frequency (Hz)', position: 'insideBottom', offset: -4 }} />
                <YAxis label={{ value: 'transmission |p_out|/|p_in|', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <ReferenceLine x={round(params.frequency, 0)} stroke="#ef4444" strokeWidth={2} label="current" />
                {params.enableBragg && <ReferenceLine x={round(model.fB, 0)} stroke="#2563eb" strokeDasharray="6 4" label="Bragg" />}
                {params.enableLocal && <ReferenceLine x={round(model.fR, 0)} stroke="#f97316" strokeDasharray="6 4" label="local" />}
                <Line type="monotone" dataKey="T" name="transmission" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card fullSpan">
          <h2>5. Challenge output</h2>
          <p>Try to design the deepest transmission dip near a target frequency using Bragg scattering, local resonators, or both. Use the geometry values in your explanation.</p>
          <textarea readOnly value={designCode} />
          <button onClick={() => navigator.clipboard?.writeText(designCode)}>Copy design code</button>
        </div>
      </section>
    </main>
  )
}

createRoot(document.getElementById('root')).render(<App />)
