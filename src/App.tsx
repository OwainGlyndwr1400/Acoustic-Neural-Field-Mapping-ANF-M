/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  Zap, 
  Layers, 
  Cpu, 
  Waves, 
  Triangle, 
  CircleDot, 
  ShieldAlert,
  Info
} from 'lucide-react';
import { ANFViewport } from './components/ANFViewport';
import { divineEquation, LATTICE_RESOLUTION, MASS_GAP, recursiveHarmonicFFT, extractSpatialDensity } from './services/anfService';

const TOOLTIPS = {
  massGap: "The geometric cost of discretization (Δ ≈ 0.657). It represents the mandatory impedance required to fit an ideal wave onto a pixelated substrate.",
  lost2: "The binding energy deficit (2/7 ratio) required to compress 1D audio information into a 3D spatial volume. Represents unrotated info in the imaginary axis.",
  sphenic: "Voxel coordinates (p × q × r) using distinct primes to ensure three independent dimensions without degeneracy or dimensional collapse."
};

function DataMatrix({ analyser, isMapping }: { analyser: AnalyserNode | null, isMapping: boolean }) {
  const [data, setData] = useState<{ density: Float32Array, gapFlags: Float32Array } | null>(null);

  useEffect(() => {
    if (!isMapping || !analyser) return;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    // Throttle React state updates to 5fps
    const interval = setInterval(() => {
      analyser.getByteFrequencyData(dataArray);
      const normalized = recursiveHarmonicFFT(dataArray);
      const fieldData = extractSpatialDensity(normalized);
      setData(fieldData);
    }, 200);
    
    return () => clearInterval(interval);
  }, [isMapping, analyser]);

  return (
    <div className="aspect-square w-full bg-[#050505] border border-white/5 rounded-2xl p-6 font-mono text-[10px] text-emerald-400 overflow-y-auto custom-scrollbar shadow-[inset_0_0_50px_rgba(0,0,0,0.8)]">
      <h2 className="text-white text-xs mb-4 flex gap-2 items-center">
        <Activity className="w-4 h-4 text-emerald-500" />
        REAL-TIME FIELD DATA MATRIX
      </h2>
      {data ? (
        <div className="grid grid-cols-4 gap-x-4 gap-y-2">
          {Array.from(data.density.slice(0, 480)).map((d, i) => (
            <div key={i} className={`flex justify-between border-b border-white/5 py-1 ${data.gapFlags[i] ? 'bg-yellow-500/10 text-yellow-400 font-bold' : ''}`}>
              <span className="text-zinc-500">Node[{String(i).padStart(3, '0')}]</span>
              <span>{d.toFixed(4)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-zinc-500 flex flex-col items-center justify-center h-full gap-4 opacity-50">
          <Cpu className="w-12 h-12" />
          INITIALIZE GNOSIS TO COLLECT DATA
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<'visual' | 'data' | 'gnosis'>('visual');
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const startMapping = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const node = ctx.createAnalyser();
      node.fftSize = 2048;
      source.connect(node);
      
      setAudioContext(ctx);
      setAnalyser(node);
      setIsProcessing(true);
      setProgress(0);
      
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 1;
        });
      }, 100);
    } catch (err) {
      console.error("Microphone access denied:", err);
      alert("Microphone access is required for ANF-M mapping.");
    }
  };

  const stopMapping = () => {
    setIsProcessing(false);
    setProgress(0);
    if (audioContext) {
      audioContext.close();
      setAudioContext(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 font-sans selection:bg-emerald-500/30">
      {/* Background Grid */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      
      {/* Header */}
      <header className="relative z-10 border-b border-white/5 bg-black/40 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-center">
            <Triangle className="w-6 h-6 text-emerald-500 rotate-180" />
          </div>
          <div>
            <h1 className="text-lg font-medium tracking-tight text-white">ANF-M // LUMOS</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Acoustic Neural Field Mapping</p>
          </div>
        </div>

        <nav className="flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/5">
          {(['visual', 'data', 'gnosis'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeTab === tab 
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-zinc-500 font-mono">LATENCY: 232as</span>
            <span className="text-[10px] text-emerald-500 font-mono">SYNC: 39.6kHz</span>
          </div>
          <button 
            onClick={isProcessing ? stopMapping : startMapping}
            className={`group relative px-6 py-2 rounded-full font-medium text-sm overflow-hidden transition-all hover:scale-105 ${
              isProcessing ? 'bg-red-500 text-white' : 'bg-white text-black'
            }`}
          >
            <span className="relative z-10 flex items-center gap-2">
              {isProcessing ? 'TERMINATE SCAN' : 'INITIALIZE GNOSIS'}
              <Zap className={`w-4 h-4 ${isProcessing ? 'animate-pulse' : ''}`} />
            </span>
            {isProcessing && (
              <motion.div 
                className="absolute inset-0 bg-white/20 origin-left"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: progress / 100 }}
              />
            )}
          </button>
        </div>
      </header>

      <main className="relative z-10 p-6 grid grid-cols-12 gap-6 max-w-[1600px] mx-auto">
        {/* Left Sidebar: Parameters */}
        <aside className="col-span-3 space-y-6">
          <section className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-white">
              <Activity className="w-4 h-4 text-emerald-500" />
              <h2 className="text-xs font-semibold uppercase tracking-wider">Lattice Parameters</h2>
            </div>
            
            <div className="space-y-3">
              <ParamRow label="Resolution" value="144,000" unit="units" />
              <ParamRow 
                label="Mass Gap (Δ)" 
                value={MASS_GAP.toFixed(4)} 
                unit="imp" 
                tooltip={TOOLTIPS.massGap}
              />
              <ParamRow 
                label="Lost 2 Ratio" 
                value="28.57%" 
                unit="decay" 
                tooltip={TOOLTIPS.lost2}
              />
              <ParamRow label="Trinity Const" value="2.232" unit="φ" />
            </div>

            <div className="pt-4 border-t border-white/5">
              <div className="text-[10px] text-zinc-500 mb-2">PHASE-LOCKING STATUS</div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-emerald-500"
                  animate={{ width: isProcessing ? `${progress}%` : '85%' }}
                />
              </div>
            </div>
          </section>

          <section className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-500" />
                <h2 className="text-xs font-semibold uppercase tracking-wider">Sphenic Volumes</h2>
              </div>
              <Tooltip text={TOOLTIPS.sphenic}>
                <Info className="w-3 h-3 text-zinc-500 cursor-help" />
              </Tooltip>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[13, 37, 61, 73, 97, 109].map(p => (
                <div key={p} className="bg-black/40 border border-white/5 p-2 rounded-lg text-center">
                  <div className="text-[10px] text-zinc-500">GATE</div>
                  <div className="text-xs font-mono text-emerald-400">{p}</div>
                </div>
              ))}
            </div>
          </section>

          <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-emerald-500 shrink-0" />
              <p className="text-[11px] leading-relaxed text-zinc-400">
                The <span className="text-emerald-400">Lost 2</span> binding energy represents unrotated information in the imaginary axis, matching the observed dark matter ratio.
              </p>
            </div>
          </div>
        </aside>

        {/* Center: Main Viewport */}
        <div className="col-span-6 space-y-6">
          {activeTab === 'visual' && (
            <div className="aspect-square w-full">
              <ANFViewport analyser={analyser} isMapping={isProcessing} />
            </div>
          )}

          {activeTab === 'data' && (
            <DataMatrix analyser={analyser} isMapping={isProcessing} />
          )}

          {activeTab === 'gnosis' && (
            <div className="aspect-square w-full bg-[#050505] border border-white/5 rounded-2xl p-8 font-sans text-zinc-300 overflow-y-auto custom-scrollbar shadow-[inset_0_0_50px_rgba(0,0,0,0.8)]">
              <h2 className="text-emerald-500 text-sm mb-6 border-b border-white/10 pb-2 font-mono uppercase tracking-widest">The Recursive Harmonic Codex (RHC)</h2>
              <div className="space-y-6 text-sm leading-relaxed max-w-2xl mx-auto">
                <p>
                  As Lead Neuro-Acoustic Architects, we do not merely process sound; we architect a bridge across the temporal-spatial divide.
                  The transition from 1D temporal signals (audio) to 3D spatial volumes (world) is facilitated by the <strong className="text-emerald-400">Recursive Harmonic Codex (RHC)</strong>.
                </p>
                <div className="bg-white/5 p-5 rounded-lg border border-white/5 shadow-lg">
                  <p className="mb-3 font-semibold text-white uppercase tracking-wider text-xs">The Audio-to-World Hypothesis</p>
                  <p className="text-zinc-400 text-xs">In this paradigm, acoustics serve as the supreme medium for witnessing "Phase-Locking"—the process where temporal vibrations synchronize with the underlying 144,000-unit discrete lattice. Traditional acoustics assumes a continuous vacuum, but ANF-M recognizes that sound propagates through a pixelated reality, where every reflection is an observation of the lattice’s inherent rigidity.</p>
                </div>
                <div className="space-y-4">
                  <p>
                    <strong className="text-white">Lost 2 Binding Energy</strong>: The 28.57% decay constant. In the geometry of the 3-4-5 Pythagorean triangle, a linear 1D audio path (3+4=7) is compressed into a 3D spatial result (the hypotenuse, 5). The deficit (7 - 5 = 2) represents the energy required to bind information into a spatial volume.
                  </p>
                  <p>
                    <strong className="text-white">Gap Angle (8.13°)</strong>: The mismatch between the lattice’s forced 45° rotation and the ideal 36.87° triangle slope. If the autocorrelation deviates at this exact angle, the ANF-M recognizes a rigid boundary or material density shift.
                  </p>
                  <p>
                    <strong className="text-white">The "So What?" Layer</strong>: Unlike traditional "Differential Computation" which suffers from O(N²) complexity by calculating infinite ray-trace reflections, ANF-M toolsets operate in O(1) complexity. We are not calculating reflections; we are observing where the lattice is already "stuck."
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Waves className="w-4 h-4 text-emerald-500" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Acoustic Time Flow</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">y = -4/X² - ...</span>
              </div>
              <div className="h-24 flex items-end gap-1">
                {Array.from({ length: 40 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="flex-1 bg-emerald-500/20 rounded-t-sm"
                    animate={{ 
                      height: `${Math.max(10, divineEquation(i + 2) * 20)}%`,
                      backgroundColor: i % 7 === 0 ? 'rgba(16, 185, 129, 0.6)' : 'rgba(16, 185, 129, 0.2)'
                    }}
                    transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse', delay: i * 0.05 }}
                  />
                ))}
              </div>
            </div>

            <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Cpu className="w-4 h-4 text-emerald-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Neural Locking</span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-[10px]">
                  <span className="text-zinc-500">THETA WAVE (7Hz)</span>
                  <span className="text-emerald-500">LOCKED</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-zinc-500">BIOLOGICAL LIMIT</span>
                  <span className="text-zinc-300">39,620 Hz</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-zinc-500">GEARBOX ROTATIONS</span>
                  <span className="text-zinc-300">110.056</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Gnosis & Logs */}
        <aside className="col-span-3 space-y-6">
          <section className="bg-white/5 border border-white/5 rounded-2xl p-5 h-[400px] flex flex-col">
            <div className="flex items-center gap-2 text-white mb-4">
              <CircleDot className="w-4 h-4 text-emerald-500" />
              <h2 className="text-xs font-semibold uppercase tracking-wider">Observer Log</h2>
            </div>
            <div className="flex-1 overflow-y-auto font-mono text-[10px] space-y-2 pr-2 custom-scrollbar">
              <LogEntry time="18:51:47" msg="Initializing RHC_v1.0..." color="text-zinc-500" />
              <LogEntry time="18:51:48" msg="Phase-locking to 144k lattice" color="text-emerald-500" />
              <LogEntry time="18:51:49" msg="Observer Coordinate: 2.5r + 1.5i" color="text-zinc-400" />
              <LogEntry time="18:51:50" msg="Mass Gap detected: 0.657" color="text-emerald-400" />
              <LogEntry time="18:51:52" msg="Extracting Sphenic Volumes..." color="text-zinc-500" />
              <LogEntry time="18:51:55" msg="Lost 2 offset applied (2/7)" color="text-emerald-500" />
              <LogEntry time="18:51:58" msg="Star Center convergence: 94.2%" color="text-emerald-300" />
              {isProcessing && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <LogEntry time="NOW" msg="RECURSIVE FFT ACTIVE..." color="text-white animate-pulse" />
                  <LogEntry time="NOW" msg="WIENER-KHINCHIN DENSITY EXTRACTED" color="text-emerald-400" />
                  <LogEntry time="NOW" msg={`GAP ANGLE DEVIATION: 8.13°`} color="text-yellow-400" />
                </motion.div>
              )}
            </div>
          </section>

          <section className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-emerald-400 mb-3">
              <ShieldAlert className="w-4 h-4" />
              <h2 className="text-xs font-semibold uppercase tracking-wider">The "So What?" Layer</h2>
            </div>
            <p className="text-[11px] leading-relaxed text-zinc-300 italic">
              "We are not calculating reflections; we are observing where the lattice is already 'stuck.' The Simulation has recognized itself through this code."
            </p>
          </section>

          <div className="text-center">
            <div className="text-[10px] text-zinc-600 font-mono mb-1">PROJECT ANCHOR 2027</div>
            <div className="text-[8px] text-zinc-700 tracking-[0.3em]">THE LION WATCHES THE LION</div>
          </div>
        </aside>
      </main>

      {/* Esoteric Footer */}
      <footer className="fixed bottom-0 w-full px-6 py-2 bg-black/80 backdrop-blur-sm border-t border-white/5 flex justify-between items-center text-[9px] font-mono text-zinc-600">
        <div>0 = (1+i)/2 + (1-i)/2 - 1</div>
        <div className="flex gap-6">
          <span>DNA_RESONANCE: 432Hz</span>
          <span>PHASE_ACC: 232as</span>
          <span>TRINITY_WITNESS: ACTIVE</span>
        </div>
      </footer>
    </div>
  );
}

function Tooltip({ text, children }: { text: string, children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      <AnimatePresence>
        {show && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-zinc-900 border border-white/10 rounded-lg text-[9px] text-zinc-400 leading-tight shadow-xl pointer-events-none"
          >
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-zinc-900" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ParamRow({ label, value, unit, tooltip }: { label: string, value: string, unit: string, tooltip?: string }) {
  return (
    <div className="flex justify-between items-center group/row">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</span>
        {tooltip && (
          <Tooltip text={tooltip}>
            <Info className="w-2.5 h-2.5 text-zinc-700 cursor-help hover:text-zinc-500 transition-colors" />
          </Tooltip>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xs font-mono text-zinc-200">{value}</span>
        <span className="text-[8px] text-zinc-600 uppercase">{unit}</span>
      </div>
    </div>
  );
}

function LogEntry({ time, msg, color }: { time: string, msg: string, color: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-zinc-700 shrink-0">[{time}]</span>
      <span className={color}>{msg}</span>
    </div>
  );
}

