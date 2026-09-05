"use client";

import { useEffect, useRef } from "react";
import type { SpiritBoxEngine } from "@/lib/audioEngine";

type Props = {
  engine: SpiritBoxEngine | null;
  open: boolean;
  onToggle: () => void;
};

const BAR_COUNT = 28;
const BAR_GAP = 3;

// Live spectrum of the box's own output. Replaces a static circle with
// something that actually shows activity — you can see it's producing a
// signal, not just trust a color change.
export default function Spectrometer({ engine, open, onToggle }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx2d.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      ctx2d.clearRect(0, 0, width, height);
      const barWidth = (width - BAR_GAP * (BAR_COUNT - 1)) / BAR_COUNT;
      const analyser = open ? engine?.getAnalyser() ?? null : null;

      if (analyser) {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const step = Math.max(1, Math.floor(data.length / BAR_COUNT));
        for (let i = 0; i < BAR_COUNT; i++) {
          const value = data[i * step] / 255;
          const barHeight = Math.max(3, value * height);
          const x = i * (barWidth + BAR_GAP);
          ctx2d.fillStyle = `rgba(94, 234, 212, ${0.35 + value * 0.65})`;
          ctx2d.fillRect(x, height - barHeight, barWidth, barHeight);
        }
      } else {
        for (let i = 0; i < BAR_COUNT; i++) {
          const x = i * (barWidth + BAR_GAP);
          ctx2d.fillStyle = "rgba(255,255,255,0.07)";
          ctx2d.fillRect(x, height - 3, barWidth, 3);
        }
      }
      frameRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [engine, open]);

  return (
    <button
      onClick={onToggle}
      className={`w-full rounded-2xl border p-4 text-left transition-colors ${
        open ? "border-signal/50 bg-signal/5" : "border-edge bg-panel"
      }`}
    >
      <canvas ref={canvasRef} className="h-28 w-full" />
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-white/40">{open ? "Listening" : "Idle"}</span>
        <span className="text-sm font-medium tracking-wide text-white/80">
          {open ? "CLOSE" : "OPEN"}
        </span>
      </div>
    </button>
  );
}
