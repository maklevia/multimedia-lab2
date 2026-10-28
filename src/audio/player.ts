import { INSTRUMENTS } from "../domain/instruments";
import { midiToFrequency } from "../domain/scales";
import type { MappingConfig, NoteEvent } from "../domain/types";
import type { PlaybackCallbacks } from "./types";

/**
 * A tiny Web Audio synthesizer. Every note gets its own oscillator stack,
 * gain envelope and stereo panner; the note events are the same objects that
 * feed the piano roll and the MIDI writer.
 */
export class WebAudioPlayer {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private voices: AudioScheduledSourceNode[] = [];
  private frame = 0;
  private playToken = 0;
  private volume = 0.8;
  private startTime = 0;
  private duration = 0;

  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.context && this.master) {
      this.master.gain.setTargetAtTime(
        this.volume,
        this.context.currentTime,
        0.015,
      );
    }
  }

  async play(
    notes: NoteEvent[],
    config: MappingConfig,
    callbacks: PlaybackCallbacks,
  ): Promise<void> {
    this.stop();

    if (notes.length === 0) {
      callbacks.onEnd();
      return;
    }

    const context = new AudioContext();
    this.context = context;
    const token = ++this.playToken;

    await context.resume();
    if (token !== this.playToken) {
      await context.close().catch(() => undefined);
      return;
    }

    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 24;
    compressor.ratio.value = 6;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.22;

    const master = context.createGain();
    master.gain.value = this.volume;
    master.connect(compressor);
    compressor.connect(context.destination);
    this.master = master;

    const secondsPerTick = 60 / Math.max(30, config.bpm) / config.ppq;
    const totalTicks = notes.reduce(
      (max, note) => Math.max(max, note.startTick + note.durationTicks),
      0,
    );
    const start = context.currentTime + 0.12;
    this.startTime = start;
    this.duration = Math.max(0.15, totalTicks * secondsPerTick + 0.18);

    const profile = INSTRUMENTS[config.instrument];

    for (const note of notes) {
      const when = start + note.startTick * secondsPerTick;
      const noteDuration = Math.max(
        0.05,
        note.durationTicks * secondsPerTick,
      );
      const peak =
        (note.velocity / 127) * profile.gain * 0.42;

      const panner = context.createStereoPanner();
      panner.pan.value = note.pan;
      panner.connect(master);

      const envelope = context.createGain();
      const attack = Math.min(profile.attack, noteDuration * 0.35);
      envelope.gain.setValueAtTime(0.0001, when);
      envelope.gain.exponentialRampToValueAtTime(
        Math.max(0.0002, peak),
        when + attack,
      );
      envelope.gain.exponentialRampToValueAtTime(
        0.0001,
        when + noteDuration,
      );

      let input: AudioNode = envelope;
      if (profile.filter) {
        const filter = context.createBiquadFilter();
        filter.type = profile.filter.type;
        filter.frequency.value = profile.filter.frequency;
        filter.Q.value = profile.filter.q;
        filter.connect(envelope);
        input = filter;
      }
      envelope.connect(panner);

      const frequency = midiToFrequency(note.pitch);
      for (const harmonic of profile.harmonics) {
        const oscillator = context.createOscillator();
        oscillator.type = harmonic.type;
        oscillator.frequency.value = frequency * harmonic.ratio;
        oscillator.detune.value = harmonic.ratio === 1 ? 0 : 2;
        const harmonicGain = context.createGain();
        harmonicGain.gain.value = harmonic.gain;
        oscillator.connect(harmonicGain);
        harmonicGain.connect(input);
        oscillator.start(when);
        oscillator.stop(when + noteDuration + 0.1);
        this.voices.push(oscillator);
      }
    }

    const tick = () => {
      if (token !== this.playToken || !this.context) return;
      const elapsed = this.context.currentTime - this.startTime;
      const progress = Math.max(
        0,
        Math.min(1, elapsed / Math.max(0.001, this.duration)),
      );
      callbacks.onProgress(progress);
      if (progress >= 1) {
        this.stop();
        callbacks.onEnd();
        return;
      }
      this.frame = requestAnimationFrame(tick);
    };

    callbacks.onProgress(0);
    this.frame = requestAnimationFrame(tick);
  }

  stop(): void {
    this.playToken += 1;
    cancelAnimationFrame(this.frame);
    this.frame = 0;

    for (const voice of this.voices) {
      try {
        voice.stop();
      } catch {
        // The source may already have ended; that is fine.
      }
    }
    this.voices = [];

    if (this.context) {
      const context = this.context;
      this.context = null;
      this.master = null;
      context.close().catch(() => undefined);
    }
  }
}
