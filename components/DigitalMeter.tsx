"use client";

import { useHeading } from "@/lib/useHeading";

type Props = {
  unlocked: boolean;
  onLockedClick: () => void;
  corner?: "top-left" | "top-right";
};

// Always in the same spot, always the same shape — a digital LCD-style
// readout instead of a number buried in a scroll-down panel. Locked state
// is a visible upsell, not a hidden feature. On iPhone, unlocked-but-not-
// yet-permitted is a third state: tapping it is what triggers iOS's
// sensor permission prompt.
export default function DigitalMeter({ unlocked, onLockedClick, corner = "top-right" }: Props) {
  const { heading, supported, permission, needsIOSPermission, requestPermission } =
    useHeading(unlocked);
  const sideClass = corner === "top-right" ? "right-4" : "left-4";

  const awaitingTap = unlocked && needsIOSPermission && permission === "prompt";
  const denied = unlocked && needsIOSPermission && permission === "denied";

  const display = !unlocked
    ? "LOCKED"
    : !supported || denied
      ? "N/A"
      : awaitingTap
        ? "TAP"
        : heading !== null
          ? `${heading.toFixed(0).padStart(3, "0")}°`
          : "---°";

  function handleClick() {
    if (!unlocked) return onLockedClick();
    if (awaitingTap) return requestPermission();
  }

  return (
    <button
      onClick={handleClick}
      className={`fixed top-4 ${sideClass} z-40 flex flex-col items-end rounded-xl border border-edge bg-panel/90 px-3 py-2 backdrop-blur transition-colors ${
        !unlocked || awaitingTap ? "cursor-pointer hover:border-veil/50" : "cursor-default"
      }`}
    >
      <span className="text-[10px] uppercase tracking-widest text-white/40">Signal</span>
      <span
        className={`font-mono text-lg tabular-nums ${
          unlocked ? "text-signal" : "text-white/30"
        }`}
      >
        {display}
      </span>
    </button>
  );
}
