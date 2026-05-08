
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

function localFrequencyQuarterWave(c, lengthCm) {
  const L = lengthCm / 100
  return c / (4 * Math.max(L, 1e-6))
}

function gaussianDip(freq, center, width, depth) {
  const x = (freq - center) / Math.max(width, 1e-6)
  return depth * Math.exp(-0.5 * x * x)
}

function lorentzDip(freq, center, q, depth) {
  const width = Math.max(center / Math.max(q, 0.5), 1e-6)
  const x = (freq - center) / width
  return depth / (1 + x * x)
}

/*
  Classroom model, not a full acoustic solver:
  - Bragg scattering: broad stop band near c/(2a)
  - Local resonator: Lorentzian-like dip near c/(4L)
  - More cells deepen the stop band
  - Low damping can create amplification near resonance
*/
function transmissionModel(params, freq) {
  const fB = braggFrequency(params.c, params.periodCm)
  const fR = localFrequencyQuarterWave(params.c, params.branchLengthCm)

  const cells = params.cells
  const braggWidth = Math.max(80, fB * (0.12 + 0.04 / Math.sqrt(cells)))
  const braggStrength = params.enableBragg ? gaussianDip(freq, fB, braggWidth, params.braggStrength) : 0
  const localStrength = params.enableLocal ? lorentzDip(freq, fR, params.localQ, params.localStrength) : 0

  const repeatedBraggLoss = cells * 0.36 * braggStrength
  const repeatedLocalLoss = cells * 0.42 * localStrength
  const backgroundLoss = params.loss * (0.15 + 0.00006 * freq) * cells

  const amplification = params.enableLocal
    ? 1 + (1 - clamp(params.loss, 0, 1)) * 0.55 * lorentzDip(freq, fR * 1.07, Math.max(2, params.localQ * 0.6), params.localStrength)
    : 1

  const attenuation = Math.exp(-(repeatedBraggLoss + repeatedLocalLoss + backgroundLoss))
  const T = clamp(amplification * attenuation, 0.001, 2.5)

  return { T, fB, fR, braggStrength, localStrength }
}

function sweepData(params) {
  const out = []
  for (let f = 100; f <= 4000; f += 30) {
    const m = transmissionModel(params, f)
    out.push({ f: round(f, 0), T: round(m.T, 3) })
  }
  return out
}

function pressureProfile(params) {
  const m = transmissionModel(params, params.frequency)
  const points = []
  const N = params.cells
  for (let i = 0; i <= N; i++) {
    const s = i / Math.max(N, 1)
    const decay = Math.pow(m.T, s)
    const ripple = 1 + 0.12 * params.braggStrength * Math.sin(2 * Math.PI * i / Math.max(2, N)) + 0.10 * params.localStrength * Math.sin(Math.PI * s * N)
    points.push({ x: i, pressureAmp: round(clamp(decay * ripple, 0, 2.2), 3) })
  }
  return points
}

function AcousticTubeSvg({ params, time }) {
  const f = params.frequency
  const omega = 2 * Math.PI * f
  const cells = params.cells
  const T = transmissionModel(params, f).T
  const width = 900
  const tubeX = 70
  const tubeY = 116
  const tubeW = 740
  const tubeH = 62
  const cellDx = tubeW / cells
  const particles = []

  for (let i = 0; i < 46; i++) {
    const s = i / 45
    const amp = 18 * Math.pow(T, s)
    const phase = omega * time / 180 - 2 * Math.PI * s * (params.frequency / 900)
    particles.push({
      x: tubeX + s * tubeW + amp * Math.sin(phase),
      y: tubeY + tubeH / 2 + 14 * Math.sin(i * 1.7),
      r: 3.5,
      opacity: 0.42 + 0.5 * (0.5 + 0.5 * Math.sin(phase)),
    })
  }

  const compressions = []
  for (let i = 0; i < 7; i++) {
    const s = (i / 7 + (time * params.frequency / 900) % 1) % 1
    compressions.push({ x: tubeX + s * tubeW, w: 24 + 22 * Math.sin(2 * Math.PI * s) ** 2, opacity: 0.14 + 0.28 * Math.pow(T, s) })
  }

  return (
    <svg viewBox={`0 0 ${width} 285`} className="tubeSvg">
      <defs>
        <linearGradient id="tubeGrad" x1="0" x2="1">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="100%" stopColor="#f8fafc" />
        </linearGradient>
      </defs>

      <rect x={tubeX} y={tubeY} width={tubeW} height={tubeH} rx="24" fill="url(#tubeGrad)" stroke="#0ea5e9" strokeWidth="3" />
      <text x={tubeX} y="72" className="svgTitle">longitudinal sound wave: air particles move left ↔ right</text>

      {compressions.map((c, idx) => (
        <rect key={idx} x={c.x - c.w / 2} y={tubeY + 6} width={c.w} height={tubeH - 12} rx="12" fill="#ef4444" opacity={c.opacity} />
      ))}

      {params.enableBragg && Array.from({ length: cells }, (_, i) => (
        <g key={`b-${i}`}>
          <line x1={tubeX + (i + 0.5) * cellDx} y1={tubeY - 9} x2={tubeX + (i + 0.5) * cellDx} y2={tubeY + tubeH + 9} className="scatterer" />
          <text x={tubeX + (i + 0.5) * cellDx} y={tubeY - 18} textAnchor="middle" className="tinyLabel">a</text>
        </g>
      ))}

      {params.enableLocal && Array.from({ length: cells }, (_, i) => {
        const x = tubeX + (i + 0.5) * cellDx
        const branchLen = clamp(params.branchLengthCm * 1.7, 25, 118)
        const phase = Math.sin(omega * time / 180 - i * 0.7)
        return (
          <g key={`r-${i}`}>
            <line x1={x} y1={tubeY + tubeH} x2={x} y2={tubeY + tubeH + branchLen} className="branch" />
            <circle cx={x} cy={tubeY + tubeH + branchLen + 7 * phase} r="7" className="branchPressure" />
          </g>
        )
      })}

      {particles.map((p, idx) => <circle key={idx} cx={p.x} cy={p.y} r={p.r} fill="#0f172a" opacity={p.opacity} />)}

      <text x={tubeX - 20} y={tubeY + 35} textAnchor="end" className="label">speaker</text>
      <text x={tubeX + tubeW + 18} y={tubeY + 35} className="label">microphone</text>
      <text x={tubeX} y="244" className="label">Predicted Bragg: {round(braggFrequency(params.c, params.periodCm), 0)} Hz</text>
      <text x={tubeX + 300} y="244" className="label">Local resonance: {round(localFrequencyQuarterWave(params.c, params.branchLengthCm), 0)} Hz</text>
      <text x={tubeX + 610} y="244" className="label">T = {round(T, 2)}</text>
    </svg>
  )
}

function App() {
  const [params, setParams] = useState({
    c: 343,
    frequency: 1000,
    cells: 6,
    periodCm: 17,
    braggStrength: 0.8,
    branchLengthCm: 8.6,
    localStrength: 0.85,
    localQ: 8,
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

  const designCode = [
    `cells=${params.cells}`,
    `a=${params.periodCm}cm`,
    `L=${params.branchLengthCm}cm`,
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
          <p>Design a longitudinal sound-wave filter using Bragg scattering, local resonators, or both.</p>
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
              This app focuses on a simplified duct model with periodic spacing and side-branch resonators.
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
            <p>Repeated spacing creates many small reflections. When those reflections add up, transmission drops.</p>
            <pre>{`f_Bragg ≈ c / (2a)`}</pre>
            <p className="hint">Larger spacing <b>a</b> blocks lower-frequency sound.</p>
          </div>
          <div className="theoryCard">
            <h2>Local resonators</h2>
            <p>A side branch or cavity acts like a sound trap. Near resonance, it stores and reflects acoustic energy.</p>
            <pre>{`f_res ≈ c / (4L)`}</pre>
            <p className="hint">Longer side branches <b>L</b> resonate at lower frequency.</p>
          </div>
          <div className="theoryCard">
            <h2>Link to EM metamaterials</h2>
            <p>The same design philosophy appears in EM metamaterials: unit cells, resonances, periodicity, and stop bands.</p>
            <table>
              <tbody>
                <tr><td>sound pressure</td><td>electric / magnetic field</td></tr>
                <tr><td>side cavity</td><td>LC / split-ring / patch resonator</td></tr>
                <tr><td>sound stop band</td><td>EM bandgap / FSS stop band</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="card fullSpan">
          <div className="cardHead">
            <h2>1. Longitudinal wave animation</h2>
            <span className={model.T < 0.35 ? 'badge good' : model.T > 1 ? 'badge danger' : 'badge'}>{model.T < 0.35 ? 'blocked' : model.T > 1 ? 'amplified' : 'passes'}</span>
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
          <h2>2. Design controls</h2>

          <label>Current sound frequency: {round(params.frequency, 0)} Hz
            <input type="range" min="100" max="4000" step="10" value={params.frequency} onChange={e => set('frequency', +e.target.value)} />
          </label>

          <label>Number of unit cells: {params.cells}
            <input type="range" min="1" max="12" step="1" value={params.cells} onChange={e => set('cells', +e.target.value)} />
          </label>

          <label className="check">
            <input type="checkbox" checked={params.enableBragg} onChange={e => set('enableBragg', e.target.checked)} />
            Enable Bragg scatterers
          </label>

          <label>Period spacing a: {params.periodCm.toFixed(1)} cm
            <input type="range" min="4" max="80" step="0.5" value={params.periodCm} onChange={e => set('periodCm', +e.target.value)} />
          </label>

          <label>Bragg scatter strength: {params.braggStrength.toFixed(2)}
            <input type="range" min="0" max="1.5" step="0.01" value={params.braggStrength} onChange={e => set('braggStrength', +e.target.value)} />
          </label>

          <label className="check">
            <input type="checkbox" checked={params.enableLocal} onChange={e => set('enableLocal', e.target.checked)} />
            Enable local resonators
          </label>

          <label>Side-branch length L: {params.branchLengthCm.toFixed(1)} cm
            <input type="range" min="2" max="80" step="0.2" value={params.branchLengthCm} onChange={e => set('branchLengthCm', +e.target.value)} />
          </label>

          <label>Local resonator strength: {params.localStrength.toFixed(2)}
            <input type="range" min="0" max="1.5" step="0.01" value={params.localStrength} onChange={e => set('localStrength', +e.target.value)} />
          </label>

          <label>Local resonator Q: {params.localQ.toFixed(1)}
            <input type="range" min="1" max="25" step="0.5" value={params.localQ} onChange={e => set('localQ', +e.target.value)} />
          </label>

          <label>Loss / damping: {params.loss.toFixed(2)}
            <input type="range" min="0" max="1" step="0.01" value={params.loss} onChange={e => set('loss', +e.target.value)} />
          </label>
        </div>

        <div className="card wide">
          <h2>3. Pressure amplitude over distance</h2>
          <p className="hint">This shows the predicted pressure amplitude after each unit cell.</p>
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
          <p>Try to design the deepest transmission dip near a target frequency while explaining whether it comes from Bragg scattering, local resonance, or both.</p>
          <textarea readOnly value={designCode} />
          <button onClick={() => navigator.clipboard?.writeText(designCode)}>Copy design code</button>
        </div>
      </section>
    </main>
  )
}

createRoot(document.getElementById('root')).render(<App />)
