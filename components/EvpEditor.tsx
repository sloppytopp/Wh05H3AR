"use client";

import { useEffect, useRef, useState } from "react";
import { trimBuffer, normalizeBuffer, reduceNoise } from "@/lib/dsp";
import { bufferToWavBlob } from "@/lib/wav";

type Props = {
  sourceUrl: string;
  onSave: (newUrl: string) => void;
  onClose: () => void;
};

const SPECTRUM_BARS = 24;

// The lightweight review workflow this borrows from full editors like
// Tenacity: see the waveform, hear the frequency content while it plays,
// trim the dead air, clean it up, save. Not a multi-track editor — a
// single-clip pass sized for a phone screen.
export default function EvpEditor({ sourceUrl, onSave, onClose }: Props) {
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ctxRef = useRef<AudioContext | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const spectrumCanvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const frameRef = useRef<number>();
  const objectUrlsRef = useRef<string[]>([]);

  function getCtx(): AudioContext {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return ctxRef.current;
  }

  function makePreviewUrl(buf: AudioBuffer) {
    const blob = bufferToWavBlob(buf);
    const url = URL.createObjectURL(blob);
    objectUrlsRef.current.push(url);
    setPreviewUrl(url);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(sourceUrl);
        const arrayBuffer = await res.arrayBuffer();
        const ctx = getCtx();
        const decoded = await ctx.decodeAudioData(arrayBuffer);
        if (cancelled) return;
        setBuffer(decoded);
        setTrimStart(0);
        setTrimEnd(decoded.duration);
        makePreviewUrl(decoded);
      } catch {
        if (!cancelled) setError("Couldn't decode this recording for editing.");
      }
    })();
    return () => {
      cancelled = true;
      objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      ctxRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceUrl]);

  // Draw the static waveform whenever the working buffer changes.
  useEffect(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas || !buffer) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx2d.scale(dpr, dpr);

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const mid = height / 2;

    ctx2d.clearRect(0, 0, width, height);
    ctx2d.fillStyle = "rgba(94, 234, 212, 0.7)";
    for (let x = 0; x < width; x++) {
      let min = 1;
      let max = -1;
      for (let i = 0; i < step; i++) {
        const sample = data[x * step + i];
        if (sample === undefined) break;
        if (sample < min) min = sample;
        if (sample > max) max = sample;
      }
      const y1 = mid + min * mid;
      const y2 = mid + max * mid;
      ctx2d.fillRect(x, y1, 1, Math.max(1, y2 - y1));
    }

    // Trim overlay
    const startX = (trimStart / buffer.duration) * width;
    const endX = (trimEnd / buffer.duration) * width;
    ctx2d.fillStyle = "rgba(0,0,0,0.55)";
    ctx2d.fillRect(0, 0, startX, height);
    ctx2d.fillRect(endX, 0, width - endX, height);
  }, [buffer, trimStart, trimEnd]);

  // Live spectrum while the preview plays — same visual language as the
  // main spirit-box spectrometer, wired to actual playback this time.
  useEffect(() => {
    const audio = audioRef.current;
    const canvas = spectrumCanvasRef.current;
    if (!audio || !canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;
    const ctx = getCtx();

    if (!sourceNodeRef.current) {
      const node = ctx.createMediaElementSource(audio);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.7;
      node.connect(analyser);
      analyser.connect(ctx.destination);
      sourceNodeRef.current = node;
      analyserRef.current = analyser;
    }

    const draw = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      canvas.width = width;
      canvas.height = height;
      ctx2d.clearRect(0, 0, width, height);
      const barWidth = width / SPECTRUM_BARS - 2;
      const analyser = analyserRef.current;

      if (analyser && audio && !audio.paused) {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const step = Math.max(1, Math.floor(data.length / SPECTRUM_BARS));
        for (let i = 0; i < SPECTRUM_BARS; i++) {
          const value = data[i * step] / 255;
          const barHeight = Math.max(2, value * height);
          ctx2d.fillStyle = `rgba(167, 139, 250, ${0.4 + value * 0.6})`;
          ctx2d.fillRect(i * (barWidth + 2), height - barHeight, barWidth, barHeight);
        }
      } else {
        for (let i = 0; i < SPECTRUM_BARS; i++) {
          ctx2d.fillStyle = "rgba(255,255,255,0.07)";
          ctx2d.fillRect(i * (barWidth + 2), height - 2, barWidth, 2);
        }
      }
      frameRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewUrl]);

  async function handleNormalize() {
    if (!buffer) return;
    setBusy(true);
    const result = normalizeBuffer(getCtx(), buffer);
    setBuffer(result);
    makePreviewUrl(result);
    setBusy(false);
  }

  async function handleReduceNoise() {
    if (!buffer) return;
    setBusy(true);
    const result = reduceNoise(getCtx(), buffer);
    setBuffer(result);
    makePreviewUrl(result);
    setBusy(false);
  }

  async function handleTrim() {
    if (!buffer) return;
    setBusy(true);
    const result = trimBuffer(getCtx(), buffer, trimStart, trimEnd);
    setBuffer(result);
    setTrimStart(0);
    setTrimEnd(result.duration);
    makePreviewUrl(result);
    setBusy(false);
  }

  function handleSave() {
    if (!previewUrl) return;
    onSave(previewUrl);
    onClose();
  }

  if (error) {
    return (
      <div className="mt-3 rounded-xl border border-edge bg-black/30 p-4 text-xs text-red-300/80">
        {error}
      </div>
    );
  }

  if (!buffer) {
    return (
      <div className="mt-3 rounded-xl border border-edge bg-black/30 p-4 text-xs text-white/40">
        Loading clip for editing…
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-edge bg-black/30 p-4">
      <canvas ref={waveformCanvasRef} className="h-20 w-full rounded-lg bg-black/40" />
      <canvas ref={spectrumCanvasRef} className="h-12 w-full rounded-lg bg-black/40" />

      {previewUrl && (
        <audio
          ref={audioRef}
          src={previewUrl}
          controls
          className="w-full"
          onLoadedMetadata={() => {
            if (audioRef.current) audioRef.current.playbackRate = speed;
          }}
          onPlay={() => {
            // iOS leaves an AudioContext created outside the exact tap
            // that opened this editor in a suspended state — resume it
            // on the actual play gesture or the routed spectrum (and
            // the audio itself, once routed through the graph) stays
            // silent.
            ctxRef.current?.resume();
          }}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-white/50">
          Trim start ({trimStart.toFixed(1)}s)
          <input
            type="range"
            min={0}
            max={buffer.duration}
            step={0.05}
            value={trimStart}
            onChange={(e) => setTrimStart(Math.min(Number(e.target.value), trimEnd - 0.05))}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-white/50">
          Trim end ({trimEnd.toFixed(1)}s)
          <input
            type="range"
            min={0}
            max={buffer.duration}
            step={0.05}
            value={trimEnd}
            onChange={(e) => setTrimEnd(Math.max(Number(e.target.value), trimStart + 0.05))}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-white/50 sm:col-span-2">
          Playback speed ({speed.toFixed(2)}x — changes pitch, no time-stretch)
          <input
            type="range"
            min={0.5}
            max={1.5}
            step={0.05}
            value={speed}
            onChange={(e) => {
              const value = Number(e.target.value);
              setSpeed(value);
              if (audioRef.current) audioRef.current.playbackRate = value;
            }}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          disabled={busy}
          onClick={handleTrim}
          className="rounded-lg border border-edge px-3 py-1.5 text-xs text-white/70 hover:border-veil/60 hover:text-white disabled:opacity-40"
        >
          Apply Trim
        </button>
        <button
          disabled={busy}
          onClick={handleNormalize}
          className="rounded-lg border border-edge px-3 py-1.5 text-xs text-white/70 hover:border-veil/60 hover:text-white disabled:opacity-40"
        >
          Normalize Volume
        </button>
        <button
          disabled={busy}
          onClick={handleReduceNoise}
          className="rounded-lg border border-edge px-3 py-1.5 text-xs text-white/70 hover:border-veil/60 hover:text-white disabled:opacity-40"
        >
          Reduce Noise
        </button>
        <div className="flex-1" />
        <button
          onClick={onClose}
          className="rounded-lg px-3 py-1.5 text-xs text-white/50 hover:text-white"
        >
          Cancel
        </button>
        {previewUrl && (
          <a
            href={previewUrl}
            download="evp-session.wav"
            className="rounded-lg border border-edge px-3 py-1.5 text-xs text-white/70 hover:border-veil/60 hover:text-white"
          >
            Download
          </a>
        )}
        <button
          disabled={busy}
          onClick={handleSave}
          className="rounded-lg bg-veil px-3 py-1.5 text-xs font-medium text-black disabled:opacity-40"
        >
          Save Edited Clip
        </button>
      </div>
    </div>
  );
}
