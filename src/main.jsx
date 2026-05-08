
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts'
import './style.css'

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x))
const round=(x,d=2)=>Number(x.toFixed(d))
const RHO=1.21
const Cx=(re,im=0)=>({re,im})
const add=(a,b)=>Cx(a.re+b.re,a.im+b.im)
const mul=(a,b)=>Cx(a.re*b.re-a.im*b.im,a.re*b.im+a.im*b.re)
const div=(a,b)=>{const d=b.re*b.re+b.im*b.im||1e-30;return Cx((a.re*b.re+a.im*b.im)/d,(a.im*b.re-a.re*b.im)/d)}
const abs=a=>Math.hypot(a.re,a.im)
const inv=a=>div(Cx(1),a)
const I=Cx(0,1)
const mm=(A,B)=>[
  [add(mul(A[0][0],B[0][0]),mul(A[0][1],B[1][0])),add(mul(A[0][0],B[0][1]),mul(A[0][1],B[1][1]))],
  [add(mul(A[1][0],B[0][0]),mul(A[1][1],B[1][0])),add(mul(A[1][0],B[0][1]),mul(A[1][1],B[1][1]))]
]
const eye=()=>[[Cx(1),Cx(0)],[Cx(0),Cx(1)]]
const area=wcm=>Math.max((wcm/100)**2,1e-8)
const Zc=(p,wcm)=>RHO*p.c/area(wcm)

function P(p,wcm,lcm,f){
  const Z=Zc(p,wcm), kd=2*Math.PI*f/p.c*lcm/100, co=Math.cos(kd), si=Math.sin(kd)
  return [[Cx(co),mul(I,Cx(Z*si))],[mul(I,Cx(si/Z)),Cx(co)]]
}
function shunt(Y){return [[Cx(1),Cx(0)],[Y,Cx(1)]]}
function branchZ(p,f){
  const neckL=Math.max(0.8,1.3*p.neckWidthCm)
  const M=mm(P(p,p.neckWidthCm,neckL,f),P(p,p.resonatorWidthCm,p.resonatorLengthCm,f))
  const Zin=div(M[0][0],M[1][0]) // closed end: U_end=0 -> Zin=A/C
  return add(Zin,Cx(p.loss*Zc(p,p.resonatorWidthCm)*0.18,0))
}
function branchY(p,f){return p.enableLocal?inv(branchZ(p,f)):Cx(0)}
function fBragg(c,aCm){return c/(2*Math.max(aCm/100,1e-9))}
function fLocal(c,Lcm){return c/(4*Math.max(Lcm/100,1e-9))}
function cellM(p,f){
  const q=p.periodCm/4, w2=p.enableBragg?p.braggNarrowWidthCm:p.mainWidthCm
  return mm(mm(mm(mm(P(p,p.mainWidthCm,q,f),shunt(branchY(p,f))),P(p,p.mainWidthCm,q,f)),P(p,w2,q,f)),P(p,w2,q,f))
}
function totalM(p,f,n=p.cells){
  let M=eye(), C=cellM(p,f)
  for(let i=0;i<n;i++) M=mm(M,C)
  return M
}
function s21(M,Z0){
  const den=add(add(M[0][0],div(M[0][1],Cx(Z0))),add(Cx(M[1][0].re*Z0,M[1][0].im*Z0),M[1][1]))
  return div(Cx(2),den)
}
function model(p,f){
  const M=totalM(p,f), Z0=Zc(p,p.mainWidthCm), S=s21(M,Z0)
  return {T:clamp(abs(S)*Math.exp(-p.loss*p.cells*(0.035+0.000035*f)),0.001,2.5), fB:fBragg(p.c,p.periodCm), fR:fLocal(p.c,p.resonatorLengthCm), Z0, Zb:branchZ(p,f)}
}
function sweep(p){const a=[];for(let f=100;f<=4000;f+=25)a.push({f,T:round(model(p,f).T,3)});return a}
function profile(p){const a=[],Z0=Zc(p,p.mainWidthCm);for(let i=0;i<=p.cells;i++){const S=s21(totalM(p,p.frequency,i),Z0);a.push({x:i,pressureAmp:round(clamp(abs(S)*Math.exp(-p.loss*i*.04),0,2.5),3)})}return a}
function color(v){v=clamp(v,-1,1);if(v>=0)return `rgb(255,${Math.round(255-205*v)},${Math.round(255-255*v)})`;let t=-v;return `rgb(${Math.round(255-255*t)},${Math.round(255-205*t)},255)`}
function halfH(p,i){const s=3.75;return (p.enableBragg && i%2)?Math.max(.8,p.braggNarrowWidthCm)*s:p.mainWidthCm*s}

function Tube({p,t,speed,prof}){
  const W=980,H=430,x0=70,tw=780,cy=185,cw=tw/p.cells,m=model(p,p.frequency),slices=[]
  const interp=s=>{let pos=s*p.cells,i=Math.floor(pos),u=pos-i,a=prof[Math.min(i,prof.length-1)]?.pressureAmp??1,b=prof[Math.min(i+1,prof.length-1)]?.pressureAmp??a;return a*(1-u)+b*u}
  for(let i=0;i<150;i++){let s=i/150,x=x0+s*tw,ci=Math.min(p.cells-1,Math.floor(s*p.cells)),hh=halfH(p,ci),env=interp(s),pr=clamp(env*Math.sin(2*Math.PI*(3.4*s-p.frequency*t*speed*.72)),-1,1);slices.push({x,y:cy-hh,h:2*hh,w:tw/150+1.2,pr})}
  const pbranch=i=>clamp(interp((i+.5)/p.cells)*Math.sin(2*Math.PI*(.45*i-p.frequency*t*speed*.68)),-1,1)
  return <svg viewBox={`0 0 ${W} ${H}`} className="tubeSvg">
    <text x={x0} y="34" className="svgTitle">pressure shown by color: red = compression, blue = rarefaction</text>
    <text x={x0} y="56" className="svgSubtitle">transfer matrix model: reflections at every width change + side-branch shunt impedance</text>
    {slices.map((s,i)=><rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} fill={color(s.pr)}/>)}
    <path d={`M ${x0} ${cy-halfH(p,0)} ${Array.from({length:p.cells},(_,i)=>`L ${x0+i*cw} ${cy-halfH(p,i)} L ${x0+(i+1)*cw} ${cy-halfH(p,i)}`).join(' ')} L ${x0+tw} ${cy+halfH(p,p.cells-1)} ${Array.from({length:p.cells},(_,j)=>{let i=p.cells-1-j;return `L ${x0+(i+1)*cw} ${cy+halfH(p,i)} L ${x0+i*cw} ${cy+halfH(p,i)}`}).join(' ')} Z`} className="tubeOutline"/>
    <line x1={x0} y1={cy} x2={x0+tw} y2={cy} className="centerLine"/>
    {p.enableBragg&&Array.from({length:p.cells},(_,i)=><g key={i}><text x={x0+(i+.5)*cw} y={cy-halfH(p,i)-12} textAnchor="middle" className="tinyLabel">{i%2?`w=${round(p.braggNarrowWidthCm,1)} cm`:`W=${round(p.mainWidthCm,1)} cm`}</text><line x1={x0+i*cw} y1={cy-92} x2={x0+i*cw} y2={cy+92} className="cellDivider"/></g>)}
    {p.enableLocal&&Array.from({length:p.cells},(_,i)=>{let xm=x0+(i+.25)*cw,top=cy+halfH(p,i),nw=p.neckWidthCm*9.5,bw=p.resonatorWidthCm*9.5,bl=p.resonatorLengthCm*2,pr=pbranch(i);return <g key={i}><rect x={xm-nw/2} y={top} width={nw} height={18} fill={color(.7*pr)} className="branchBox"/><rect x={xm-bw/2} y={top+18} width={bw} height={bl} fill={color(pr)} className="branchBox"/><text x={xm+bw/2+8} y={top+34} className="branchLabel">L={round(p.resonatorLengthCm,1)} cm</text><text x={xm+bw/2+8} y={top+52} className="branchLabel">W={round(p.resonatorWidthCm,1)} cm</text><text x={xm+bw/2+8} y={top+70} className="branchLabel">neck={round(p.neckWidthCm,1)} cm</text></g>})}
    <text x={x0-16} y={cy+4} textAnchor="end" className="label">speaker</text><text x={x0+tw+18} y={cy+4} className="label">microphone</text>
    <g><rect x="694" y="18" width="245" height="118" rx="14" className="legendBg"/><rect x="712" y="38" width="24" height="16" fill={color(.95)}/><text x="748" y="51" className="legendText">red = compression</text><rect x="712" y="66" width="24" height="16" fill={color(-.95)}/><text x="748" y="79" className="legendText">blue = rarefaction</text><line x1="712" y1="99" x2="740" y2="99" className="tubeOutlineMini"/><text x="748" y="103" className="legendText">width step = impedance change</text><rect x="712" y="112" width="12" height="12" className="branchBox" fill={color(.4)}/><rect x="706" y="124" width="24" height="22" className="branchBox" fill={color(-.4)}/><text x="748" y="128" className="legendText">side branch = shunt impedance</text></g>
    <text x={x0} y="385" className="label">Bragg estimate: {round(m.fB,0)} Hz</text><text x={x0+250} y="385" className="label">Quarter-wave estimate: {round(m.fR,0)} Hz</text><text x={x0+545} y="385" className="label">Transfer-matrix T = {round(m.T,2)}</text>
  </svg>
}

function App(){
  const [p,setP]=useState({c:343,frequency:1000,cells:6,periodCm:17,mainWidthCm:3.5,braggNarrowWidthCm:1.6,resonatorLengthCm:8.6,resonatorWidthCm:2.6,neckWidthCm:1.0,loss:.18,enableBragg:true,enableLocal:true})
  const [running,setRunning]=useState(true), [time,setTime]=useState(0), [speed,setSpeed]=useState(.35), last=useRef(null)
  useEffect(()=>{let raf;const loop=ts=>{if(last.current==null)last.current=ts;let dt=(ts-last.current)/1000;last.current=ts;if(running)setTime(t=>t+dt);raf=requestAnimationFrame(loop)};raf=requestAnimationFrame(loop);return()=>cancelAnimationFrame(raf)},[running])
  const set=(k,v)=>setP(x=>({...x,[k]:v})), m=useMemo(()=>model(p,p.frequency),[p]), sw=useMemo(()=>sweep(p),[p]), prof=useMemo(()=>profile(p),[p])
  const recA=round((p.c/(2*p.frequency))*100,2), recL=round((p.c/(4*p.frequency))*100,2), zw=round(Zc(p,p.mainWidthCm),1), zn=round(Zc(p,p.braggNarrowWidthCm),1), zb=round(abs(m.Zb),1)
  const code=[`cells=${p.cells}`,`a=${p.periodCm}cm`,`W=${p.mainWidthCm}cm`,`w=${p.braggNarrowWidthCm}cm`,`Lr=${p.resonatorLengthCm}cm`,`Wr=${p.resonatorWidthCm}cm`,`Wn=${p.neckWidthCm}cm`,`f=${p.frequency}Hz`,`Bragg=${p.enableBragg?'on':'off'}`,`Local=${p.enableLocal?'on':'off'}`,`loss=${p.loss}`].join('; ')
  return <main>
    <header className="hero"><div><h1>Acoustic Metamaterial Lab</h1><p>Transfer-matrix model for 1D sound metamaterials: width-step Bragg scattering plus side-branch shunt resonators.</p></div><div className="heroButtons"><a href={`${import.meta.env.BASE_URL}docs/`} className="docButton">Open theory docs</a><button onClick={()=>setRunning(v=>!v)}>{running?'Pause':'Play'}</button></div></header>
    <section className="grid">
      <div className="card fullSpan application"><div><h2>Real-world application</h2><p>Acoustic chambers, silencers, mufflers, HVAC ducts, and noise barriers all use geometry to control sound. This app models width-step scattering and side-branch resonators using acoustic transfer matrices.</p><p className="credit">Photo: acoustic anechoic chamber from Wikimedia Commons.</p></div><img src={`${import.meta.env.BASE_URL}images/anechoic-chamber.jpg`} alt="acoustic chamber"/></div>
      <div className="card fullSpan qrCard"><div><h2>Classroom QR code</h2><p>After GitHub Pages is enabled, students can scan this code to open the app directly.</p><p className="qrUrl">https://gtarcraz.github.io/acoustic-metamaterial-lab/</p></div><img src={`${import.meta.env.BASE_URL}images/qr-acoustic-metamaterial-lab.png`} alt="QR code"/></div>
      <div className="card fullSpan theoryGrid"><div className="theoryCard"><h2>Bragg scattering</h2><p>Each width step creates an impedance mismatch and partial reflection. Repeated steps create a Bragg stop band.</p><pre>{`Z = ρc/A\nR = (Z₂-Z₁)/(Z₂+Z₁)\nf_Bragg ≈ c/(2a)`}</pre></div><div className="theoryCard"><h2>Local resonator shunt</h2><p>The side branch is modeled by its input impedance and inserted into the main duct as a shunt admittance.</p><pre>{`Z_branch = A/C from branch matrix\nY_branch = 1/Z_branch\nS = [[1,0],[Y,1]]`}</pre></div><div className="theoryCard"><h2>EM metamaterial link</h2><p>This is the acoustic analog of transmission-line metamaterials, FSS, EBG structures, and shunt LC resonators.</p><table><tbody><tr><td>pressure p</td><td>voltage / E-field</td></tr><tr><td>volume velocity U</td><td>current / H-field</td></tr><tr><td>side branch</td><td>shunt LC resonator</td></tr></tbody></table></div></div>
      <div className="card fullSpan equationsPanel"><h2>Quick design equations</h2><div className="equationGrid"><div className="equationCard"><div className="equation">f_Bragg ≈ c / (2a)</div><p>For a target frequency, start with <b>a ≈ c/(2f)</b>.</p><p className="designHint">For {round(p.frequency,0)} Hz, start with <b>a ≈ {recA} cm</b>.</p></div><div className="equationCard"><div className="equation">f_res ≈ c / (4Lr)</div><p>The transfer matrix uses the branch impedance, but the quarter-wave estimate is the best first guess.</p><p className="designHint">For {round(p.frequency,0)} Hz, start with <b>Lr ≈ {recL} cm</b>.</p></div><div className="equationCard"><div className="equation">Z = ρc / A</div><p>Narrower pipe means smaller area and stronger reflections.</p><p className="designHint"><b>Zwide ≈ {zw}</b>, <b>Znarrow ≈ {zn}</b>, <b>|Zbranch| ≈ {zb}</b>.</p></div></div></div>
      <div className="card fullSpan"><div className="cardHead"><h2>1. Animated transfer-matrix metamaterial view</h2><span className={m.T<.35?'badge good':m.T>1?'badge danger':'badge'}>{m.T<.35?'blocked':m.T>1?'amplified':'passes'}</span></div><Tube p={p} t={time} speed={speed} prof={prof}/><div className="metricRow four"><div><b>Current frequency</b><span>{round(p.frequency,0)} Hz</span></div><div><b>Transmission</b><span>{round(m.T,2)}</span></div><div><b>Bragg estimate</b><span>{round(m.fB,0)} Hz</span></div><div><b>Local estimate</b><span>{round(m.fR,0)} Hz</span></div></div></div>
      <div className="card controls"><h2>2. Geometry controls</h2>
        <label>Animation speed: {speed.toFixed(2)}×<input type="range" min="0.05" max="1.50" step="0.05" value={speed} onChange={e=>setSpeed(+e.target.value)}/></label>
        <label>Current sound frequency: {round(p.frequency,0)} Hz<input type="range" min="100" max="4000" step="10" value={p.frequency} onChange={e=>set('frequency',+e.target.value)}/></label>
        <label>Number of unit cells: {p.cells}<input type="range" min="1" max="12" step="1" value={p.cells} onChange={e=>set('cells',+e.target.value)}/></label>
        <label className="check"><input type="checkbox" checked={p.enableBragg} onChange={e=>set('enableBragg',e.target.checked)}/>Enable Bragg pipe-width modulation</label>
        <label>Cell period a: {p.periodCm.toFixed(1)} cm<input type="range" min="4" max="80" step="0.5" value={p.periodCm} onChange={e=>set('periodCm',+e.target.value)}/></label>
        <label>Main pipe width W: {p.mainWidthCm.toFixed(1)} cm<input type="range" min="1" max="8" step="0.1" value={p.mainWidthCm} onChange={e=>set('mainWidthCm',+e.target.value)}/></label>
        <label>Narrow pipe width w: {p.braggNarrowWidthCm.toFixed(1)} cm<input type="range" min=".6" max="8" step="0.1" value={p.braggNarrowWidthCm} onChange={e=>set('braggNarrowWidthCm',+e.target.value)}/></label>
        <label className="check"><input type="checkbox" checked={p.enableLocal} onChange={e=>set('enableLocal',e.target.checked)}/>Enable local side resonators</label>
        <label>Resonator length Lr: {p.resonatorLengthCm.toFixed(1)} cm<input type="range" min="2" max="80" step="0.2" value={p.resonatorLengthCm} onChange={e=>set('resonatorLengthCm',+e.target.value)}/></label>
        <label>Resonator width Wr: {p.resonatorWidthCm.toFixed(1)} cm<input type="range" min=".8" max="6" step=".1" value={p.resonatorWidthCm} onChange={e=>set('resonatorWidthCm',+e.target.value)}/></label>
        <label>Neck width Wn: {p.neckWidthCm.toFixed(1)} cm<input type="range" min=".4" max="4" step=".1" value={p.neckWidthCm} onChange={e=>set('neckWidthCm',+e.target.value)}/></label>
        <label>Loss / damping: {p.loss.toFixed(2)}<input type="range" min="0" max="1" step=".01" value={p.loss} onChange={e=>set('loss',+e.target.value)}/></label>
      </div>
      <div className="card wide"><h2>3. Pressure amplitude over distance</h2><p className="hint">Prefix transfer matrices estimate the pressure amplitude after each unit cell.</p><div className="chartBox"><ResponsiveContainer width="100%" height={280}><LineChart data={prof}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="x" label={{value:'unit-cell index',position:'insideBottom',offset:-4}}/><YAxis label={{value:'|p(x)|/|p_in|',angle:-90,position:'insideLeft'}}/><Tooltip/><Line type="monotone" dataKey="pressureAmp" name="pressure amplitude" strokeWidth={3} dot/></LineChart></ResponsiveContainer></div></div>
      <div className="card fullSpan"><h2>4. Frequency sweep from transfer matrix</h2><p className="hint">Red = current frequency, blue = Bragg estimate, orange = quarter-wave local-resonator estimate.</p><div className="chartBox"><ResponsiveContainer width="100%" height={330}><LineChart data={sw}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="f" label={{value:'frequency (Hz)',position:'insideBottom',offset:-4}}/><YAxis label={{value:'transmission |p_out|/|p_in|',angle:-90,position:'insideLeft'}}/><Tooltip/><Legend/><ReferenceLine x={round(p.frequency,0)} stroke="#ef4444" strokeWidth={2} label="current"/>{p.enableBragg&&<ReferenceLine x={round(m.fB,0)} stroke="#2563eb" strokeDasharray="6 4" label="Bragg"/>}{p.enableLocal&&<ReferenceLine x={round(m.fR,0)} stroke="#f97316" strokeDasharray="6 4" label="local"/>}<Line type="monotone" dataKey="T" name="transfer-matrix transmission" strokeWidth={3} dot={false}/></LineChart></ResponsiveContainer></div></div>
      <div className="card fullSpan"><h2>5. Challenge output</h2><p>Design the deepest transmission dip near a target frequency using Bragg scattering, local resonators, or both.</p><textarea readOnly value={code}/><button onClick={()=>navigator.clipboard?.writeText(code)}>Copy design code</button></div>
    </section>
  </main>
}
createRoot(document.getElementById('root')).render(<App/>)
