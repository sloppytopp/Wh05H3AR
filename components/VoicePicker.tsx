"use client";

import type { VoiceGender } from "@/lib/audioEngine";

type Props = {
  value: VoiceGender;
  onChange: (v: VoiceGender) => void;
  disabled?: boolean;
};

export default function VoicePicker({ value, onChange, disabled }: Props) {
  return (
    <div className="flex items-center gap-2 text-sm text-white/70">
      <span>Voice</span>
      <div className="flex rounded-full border border-edge bg-panel p-1">
        {(["female", "male"] as VoiceGender[]).map((g) => (
          <button
            key={g}
            disabled={disabled}
            onClick={() => onChange(g)}
            className={`rounded-full px-3 py-1 capitalize transition-colors ${
              value === g ? "bg-veil/30 text-white" : "text-white/50"
            }`}
          >
            {g}
          </button>
        ))}
      </div>
    </div>
  );
}
