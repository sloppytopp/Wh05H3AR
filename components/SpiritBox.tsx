"use client";

import { useEffect, useRef, useState } from "react";
import Spectrometer from "./Spectrometer";
import DigitalMeter from "./DigitalMeter";
import VoicePicker from "./VoicePicker";
import PaywallModal from "./PaywallModal";
import InvestigatorPanel from "./InvestigatorPanel";
import { SpiritBoxEngine, speakAs, type VoiceGender } from "@/lib/audioEngine";
import { loadLog, saveLog, type SessionLogEntry } from "@/lib/session";

export default function SpiritBox() {
  const engineRef = useRef<SpiritBoxEngine | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [voice, setVoice] = useState<VoiceGender>("female");
  const [cleanMode, setCleanMode] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showInvestigator, setShowInvestigator] = useState(false);
  const [log, setLog] = useState<SessionLogEntry[]>([]);
  const currentEntryId = useRef<string | null>(null);

  useEffect(() => {
    engineRef.current = new SpiritBoxEngine();
    setLog(loadLog());
    return () => engineRef.current?.close();
  }, []);

  function toggleGate() {
    const engine = engineRef.current;
    if (!engine) return;

    if (!gateOpen) {
      engine.open(cleanMode);
      const entry: SessionLogEntry = {
        id: crypto.randomUUID(),
        startedAt: Date.now(),
        endedAt: null,
        note: "Session opened",
      };
      currentEntryId.current = entry.id;
      const next = [entry, ...log];
      setLog(next);
      saveLog(next);
      speakAs("I'm listening.", voice);
    } else {
      engine.close();
      const next = log.map((e) =>
        e.id === currentEntryId.current ? { ...e, endedAt: Date.now() } : e
      );
      setLog(next);
      saveLog(next);
      currentEntryId.current = null;
    }
    setGateOpen(!gateOpen);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 px-4 py-12">
      <DigitalMeter unlocked={unlocked} onLockedClick={() => setShowPaywall(true)} />

      <header className="text-center">
        <h1 className="text-2xl font-semibold text-white">wh05h3ar</h1>
        <p className="mt-1 text-sm text-white/50">
          Open the gate when you&apos;re ready to communicate. Close it when you&apos;re done.
        </p>
      </header>

      <div className="w-full max-w-md">
        <Spectrometer engine={engineRef.current} open={gateOpen} onToggle={toggleGate} />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <VoicePicker value={voice} onChange={setVoice} disabled={gateOpen} />
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            checked={cleanMode}
            disabled={gateOpen}
            onChange={(e) => setCleanMode(e.target.checked)}
          />
          Clean audio
        </label>
        <button
          onClick={() => (unlocked ? setShowInvestigator((v) => !v) : setShowPaywall(true))}
          className="rounded-full border border-edge px-4 py-1.5 text-sm text-white/70 hover:border-veil/60 hover:text-white"
        >
          {unlocked ? (showInvestigator ? "Hide Investigator Mode" : "Investigator Mode") : "Unlock Investigator Mode"}
        </button>
      </div>

      {unlocked && showInvestigator && (
        <div className="w-full">
          <InvestigatorPanel />
        </div>
      )}

      <section className="w-full rounded-2xl border border-edge bg-panel/60 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-white/40">
          Session Log
        </h3>
        <ul className="mt-2 space-y-1 text-xs text-white/50">
          {log.slice(0, 6).map((e) => (
            <li key={e.id}>
              {new Date(e.startedAt).toLocaleString()} —{" "}
              {e.endedAt ? `${Math.round((e.endedAt - e.startedAt) / 1000)}s` : "in progress"}
            </li>
          ))}
          {log.length === 0 && <li className="text-white/30">No sessions yet.</li>}
        </ul>
      </section>

      {showPaywall && (
        <PaywallModal
          onClose={() => setShowPaywall(false)}
          onUnlock={() => {
            // TODO: replace with real payment confirmation before shipping.
            setUnlocked(true);
            setShowPaywall(false);
          }}
        />
      )}
    </div>
  );
}
