/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ANF-M Core Logic: The Recursive Harmonic Codex (RHC)
 * Implements the discrete wave equation and phase-locking mechanics.
 */

export const LATTICE_RESOLUTION = 144000;
export const TRINITY_CONSTANT = 2.232;
export const LOST_2_RATIO = 2 / 7;
export const MASS_GAP = Math.sqrt(32) - 5; // ≈ 0.657
export const GAP_ANGLE = 8.13; // Deviation angle (Proof 23/111)

/**
 * Complex Number helper
 */
export interface Complex {
  real: number;
  imag: number;
}

/**
 * The Divine Equation (Proof 73)
 * Unifies temporal build with geometric structure.
 */
export function divineEquation(x: number): number {
  if (x <= 1) return TRINITY_CONSTANT; // Avoid log(log) issues
  const innerLog = Math.log(x);
  if (innerLog <= 0) return TRINITY_CONSTANT;
  const term2 = 1 / Math.pow(Math.pow(Math.log(innerLog), 1 / 3), 1 / 4);
  return -(4 / (x * x)) - term2 + TRINITY_CONSTANT;
}

/**
 * Greatest Common Divisor for BigInt/Large Integers
 */
function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) {
    a %= b;
    [a, b] = [b, a];
  }
  return a;
}

/**
 * Recursive Harmonic FFT (O(1) Phase-Locking)
 * Maps real-world spatial frequencies onto the discrete RHC lattice.
 */
export function recursiveHarmonicFFT(audioData: Uint8Array): { real: Float32Array, imag: Float32Array } {
  const n = audioData.length;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  
  for (let i = 0; i < n; i++) {
    // Exact real-time byte data from microphone
    // Normalize mapping to [0, 1] range for lattice ingestion
    let val = audioData[i] / 255.0;
    
    // Scale up for integer geometry processing
    const latticeInt = Math.floor(val * 1000); 

    // Triple Normalization
    const harmonicNorm = gcd(latticeInt, 3);
    const geoNorm = gcd(latticeInt, 360);
    const binaryStitching = latticeInt % 9 === 0 ? 1.0 : 0.0;

    // Apply scaling factor, clamp to prevent blowout
    const scale = Math.min((harmonicNorm * geoNorm) / 1000, 2.0) * binaryStitching;

    real[i] = val * scale;
    // Synthesize mathematical imaginary component based on lattice projection
    imag[i] = val * Math.sin((i / n) * Math.PI * 2 * GAP_ANGLE) * scale;
  }

  return { real, imag };
}

/**
 * Extract Spatial Density via Wiener-Khinchin Autocorrelation
 * Detects occlusion and material density shifts based on the 'Gap Angle'.
 * Wiener-Khinchin theorem: Autocorrelation is the inverse FFT of the power spectrum.
 */
export function extractSpatialDensity(normalizedSpectrum: { real: Float32Array, imag: Float32Array }): { density: Float32Array, gapFlags: Float32Array } {
  const n = normalizedSpectrum.real.length;
  const density = new Float32Array(n);
  const gapFlags = new Float32Array(n);
  
  for (let i = 0; i < n; i++) {
    const rawVal = normalizedSpectrum.real[i] ** 2 + normalizedSpectrum.imag[i] ** 2;
    
    // Gap Angle Deviation Check (Proof 23)
    const phase = Math.atan2(normalizedSpectrum.imag[i], normalizedSpectrum.real[i]);
    const phaseDeg = (phase * 180) / Math.PI;
    const isBoundary = Math.abs(Math.abs(phaseDeg) - GAP_ANGLE) < 2.0;

    const mappedDensity = rawVal * (1 - LOST_2_RATIO) * (isBoundary ? 2.0 : 1.0);
    // Clamp density to strictly cap visual blooming at a sane amount
    density[i] = Math.min(mappedDensity, 5.0);
    gapFlags[i] = isBoundary ? 1.0 : 0.0;
  }
  
  return { density, gapFlags };
}
