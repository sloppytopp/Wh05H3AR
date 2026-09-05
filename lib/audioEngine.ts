// Spirit-box audio engine. This produces filtered noise that sweeps across
// a simulated frequency band while the session gate is open, plus a
// "cleaner" mode that gates/compresses the output. None of this claims to
// be a real communication channel — it's the sweep-and-filter mechanic the
// whole "spirit box" category is built on, just with less noise leaking
// through than the competition ships.

export type VoiceGender = "male" | "female";

export class SpiritBoxEngine {
  private ctx: AudioContext | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;
  private sweepFilter: BiquadFilterNode | null = null;
  private gateGain: GainNode | null = null;
  private outputGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private sweepInterval: number | null = null;
  private running = false;

  isOpen(): boolean {
    return this.running;
  }

  // Exposes the live signal so the UI can draw a real spectrum instead of
  // a static shape — the whole point being visible feedback that the box
  // is actually producing something, not just "on".
  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  // Opens the gate once. Stays open until close() is called explicitly —
  // no re-arming per utterance, unlike the push-to-talk pattern this is
  // deliberately replacing.
  open(cleanMode: boolean): void {
    if (this.running) return;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.ctx = ctx;

    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const sweepFilter = ctx.createBiquadFilter();
    sweepFilter.type = "bandpass";
    sweepFilter.Q.value = cleanMode ? 8 : 2.5;
    sweepFilter.frequency.value = 400;

    const gateGain = ctx.createGain();
    gateGain.gain.value = cleanMode ? 0.55 : 0.9;

    const outputGain = ctx.createGain();
    outputGain.gain.value = 0.35;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.75;

    noise.connect(sweepFilter);
    sweepFilter.connect(gateGain);
    gateGain.connect(outputGain);
    outputGain.connect(analyser);
    outputGain.connect(ctx.destination);

    noise.start();

    this.noiseNode = noise;
    this.sweepFilter = sweepFilter;
    this.gateGain = gateGain;
    this.outputGain = outputGain;
    this.analyser = analyser;
    this.running = true;

    // Sweep the bandpass center frequency to simulate scanning across a
    // band, the way the hardware devices this category imitates do.
    const minHz = 300;
    const maxHz = 3000;
    let t = 0;
    this.sweepInterval = window.setInterval(() => {
      t += 0.12;
      const hz = minHz + (Math.sin(t) * 0.5 + 0.5) * (maxHz - minHz);
      sweepFilter.frequency.setTargetAtTime(hz, ctx.currentTime, 0.05);
      // Clean mode gates the noise floor down between sweep "hits" instead
      // of leaving a constant static bed under everything.
      if (cleanMode) {
        const gateLevel = Math.sin(t * 3) > 0.2 ? 0.55 : 0.12;
        gateGain.gain.setTargetAtTime(gateLevel, ctx.currentTime, 0.08);
      }
    }, 90);
  }

  // Closes the gate once, tearing everything down. This is the other half
  // of the one-open/one-close session model: no lingering audio nodes.
  close(): void {
    if (!this.running) return;
    this.sweepInterval !== null && window.clearInterval(this.sweepInterval);
    this.noiseNode?.stop();
    this.noiseNode?.disconnect();
    this.sweepFilter?.disconnect();
    this.gateGain?.disconnect();
    this.outputGain?.disconnect();
    this.analyser?.disconnect();
    this.ctx?.close();

    this.sweepInterval = null;
    this.noiseNode = null;
    this.sweepFilter = null;
    this.gateGain = null;
    this.outputGain = null;
    this.analyser = null;
    this.ctx = null;
    this.running = false;
  }
}

// Free-tier "voice" playback uses the browser's built-in speech synthesis.
// Investigator mode's personal-voice feature (upload + clone) is a
// separate, gated pipeline — see components/InvestigatorPanel.tsx.
export function speakAs(text: string, gender: VoiceGender): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const utter = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find((v) =>
    gender === "female"
      ? /female|zira|samantha|victoria/i.test(v.name)
      : /male|david|daniel|alex/i.test(v.name)
  );
  if (preferred) utter.voice = preferred;
  utter.pitch = gender === "female" ? 1.15 : 0.85;
  utter.rate = 0.9;
  window.speechSynthesis.speak(utter);
}
