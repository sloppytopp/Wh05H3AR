// Lightweight, honest DSP for cleaning up an EVP clip. No spectral
// subtraction or ML denoising here — just a high-pass/low-pass pair to cut
// rumble and hiss extremes, plus a soft noise gate. It's the same category
// of technique Tenacity/Audacity's basic noise-reduction tools use under
// the hood, scaled down to what a lightweight in-app pass needs to do.

export function trimBuffer(
  ctx: BaseAudioContext,
  buffer: AudioBuffer,
  startSec: number,
  endSec: number
): AudioBuffer {
  const start = Math.max(0, Math.min(startSec, buffer.duration));
  const end = Math.max(start, Math.min(endSec, buffer.duration));
  const startSample = Math.floor(start * buffer.sampleRate);
  const endSample = Math.floor(end * buffer.sampleRate);
  const length = Math.max(1, endSample - startSample);

  const out = ctx.createBuffer(buffer.numberOfChannels, length, buffer.sampleRate);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    out.getChannelData(ch).set(buffer.getChannelData(ch).subarray(startSample, endSample));
  }
  return out;
}

export function normalizeBuffer(
  ctx: BaseAudioContext,
  buffer: AudioBuffer,
  targetPeak = 0.95
): AudioBuffer {
  let peak = 0;
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
  }
  if (peak === 0) return buffer;
  const scale = targetPeak / peak;

  const out = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const src = buffer.getChannelData(ch);
    const dst = out.getChannelData(ch);
    for (let i = 0; i < src.length; i++) dst[i] = src[i] * scale;
  }
  return out;
}

function onePoleHighPass(data: Float32Array, sampleRate: number, cutoffHz: number): Float32Array {
  const dt = 1 / sampleRate;
  const rc = 1 / (2 * Math.PI * cutoffHz);
  const alpha = rc / (rc + dt);
  const out = new Float32Array(data.length);
  out[0] = data[0];
  for (let i = 1; i < data.length; i++) {
    out[i] = alpha * (out[i - 1] + data[i] - data[i - 1]);
  }
  return out;
}

function onePoleLowPass(data: Float32Array, sampleRate: number, cutoffHz: number): Float32Array {
  const dt = 1 / sampleRate;
  const rc = 1 / (2 * Math.PI * cutoffHz);
  const alpha = dt / (rc + dt);
  const out = new Float32Array(data.length);
  out[0] = data[0];
  for (let i = 1; i < data.length; i++) {
    out[i] = out[i - 1] + alpha * (data[i] - out[i - 1]);
  }
  return out;
}

// Soft gate: ramps gain down (not an instant cut) below a threshold set
// relative to the clip's own peak, using fast attack / slow release so it
// doesn't chop off the leading edge of quiet sounds or click on release.
function noiseGate(data: Float32Array, sampleRate: number, thresholdRatio: number): Float32Array {
  let peak = 0;
  for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
  const threshold = peak * thresholdRatio;
  if (threshold === 0) return data;

  const attackCoeff = Math.exp(-1 / (0.005 * sampleRate));
  const releaseCoeff = Math.exp(-1 / (0.12 * sampleRate));
  const out = new Float32Array(data.length);
  let envelope = 0;

  for (let i = 0; i < data.length; i++) {
    const rectified = Math.abs(data[i]);
    envelope =
      rectified > envelope
        ? attackCoeff * envelope + (1 - attackCoeff) * rectified
        : releaseCoeff * envelope + (1 - releaseCoeff) * rectified;
    const gain = envelope < threshold ? Math.max(0, envelope / threshold) : 1;
    out[i] = data[i] * gain;
  }
  return out;
}

export function reduceNoise(ctx: BaseAudioContext, buffer: AudioBuffer): AudioBuffer {
  const out = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    let data = buffer.getChannelData(ch).slice();
    data = onePoleHighPass(data, buffer.sampleRate, 90);
    data = onePoleLowPass(data, buffer.sampleRate, 3800);
    data = noiseGate(data, buffer.sampleRate, 0.035);
    out.getChannelData(ch).set(data);
  }
  return out;
}
