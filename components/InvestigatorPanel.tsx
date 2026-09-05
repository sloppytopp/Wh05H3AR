"use client";

import { useRef, useState } from "react";

type Recording = { id: string; url: string; takenAt: number };

// Personal-voice sessions are scoped to audio the user attests they have
// the right to use — a recording of someone they knew, not a public
// figure. There's no search/browse of other people's voices and no
// built-in library of named individuals: that's a deliberate boundary,
// not a missing feature. See the consent copy below.
//
// The distance/signal reading lives in the always-visible corner
// DigitalMeter (components/DigitalMeter.tsx), not duplicated here.
export default function InvestigatorPanel() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [consented, setConsented] = useState(false);
  const [recordingUnsupported, setRecordingUnsupported] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setRecordings((prev) => [{ id: crypto.randomUUID(), url, takenAt: Date.now() }, ...prev]);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      setRecordingUnsupported(true);
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="rounded-2xl border border-edge bg-panel p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-white/50">
          EVP Recording
        </h3>
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`mt-3 w-full rounded-lg py-2 text-sm font-medium ${
            isRecording ? "bg-red-500/80 text-white" : "bg-signal/80 text-black"
          }`}
        >
          {isRecording ? "Stop & Save" : "Start Recording"}
        </button>
        {recordingUnsupported && (
          <p className="mt-2 text-xs text-red-300/70">
            Microphone access isn&apos;t available in this browser/context.
          </p>
        )}
        <ul className="mt-3 space-y-2 text-xs text-white/60">
          {recordings.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2">
              <span>{new Date(r.takenAt).toLocaleTimeString()}</span>
              <audio controls src={r.url} className="h-8 max-w-[10rem]" />
            </li>
          ))}
          {recordings.length === 0 && <li className="text-white/30">No sessions logged yet.</li>}
        </ul>
      </section>

      <section className="rounded-2xl border border-edge bg-panel p-5 md:col-span-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-white/50">
          Personal Voice
        </h3>
        <p className="mt-2 text-xs text-white/40">
          Upload a recording of someone you knew personally to use their
          voice in your sessions. This is limited to people you have the
          right to represent — we don&apos;t support uploading or searching
          for public figures, celebrities, or anyone else&apos;s likeness.
        </p>
        <div className="mt-4 flex flex-col gap-3">
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => setVoiceFile(e.target.files?.[0] ?? null)}
            className="text-xs text-white/60"
          />
          <label className="flex items-start gap-2 text-xs text-white/60">
            <input
              type="checkbox"
              checked={consented}
              onChange={(e) => setConsented(e.target.checked)}
              className="mt-0.5"
            />
            I confirm this is a recording of a person I knew personally, I
            have the right to use their voice this way, and this is not a
            public figure or celebrity.
          </label>
          <button
            disabled={!voiceFile || !consented}
            onClick={() => {
              // TODO: send voiceFile to the voice-cloning provider once
              // selected and its ToS for this use case is confirmed.
              // Never wire this input to a name-lookup or public-figure
              // voice library.
              alert("Voice sample queued. Cloning pipeline not yet connected.");
            }}
            className="w-fit rounded-lg bg-veil px-4 py-2 text-sm font-medium text-black disabled:opacity-30"
          >
            Use this voice
          </button>
        </div>
      </section>
    </div>
  );
}
