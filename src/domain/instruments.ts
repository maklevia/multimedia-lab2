import type { InstrumentId, InstrumentProfile } from "./types";

export const INSTRUMENTS: Record<InstrumentId, InstrumentProfile> = {
  piano: {
    id: "piano",
    label: "Soft piano",
    description: "Triangle fundamental with two quiet harmonics.",
    program: 0,
    harmonics: [
      { ratio: 1, type: "triangle", gain: 0.8 },
      { ratio: 2, type: "sine", gain: 0.16 },
      { ratio: 3, type: "sine", gain: 0.05 },
    ],
    attack: 0.006,
    gain: 0.9,
  },
  bell: {
    id: "bell",
    label: "Music box",
    description: "Sine partials with a long, glassy decay.",
    program: 10,
    harmonics: [
      { ratio: 1, type: "sine", gain: 0.75 },
      { ratio: 2.01, type: "sine", gain: 0.24 },
      { ratio: 3.99, type: "sine", gain: 0.09 },
    ],
    attack: 0.003,
    gain: 0.85,
  },
  pad: {
    id: "pad",
    label: "Warm pad",
    description: "Detuned saws through a low-pass filter.",
    program: 89,
    harmonics: [
      { ratio: 1, type: "sawtooth", gain: 0.34 },
      { ratio: 1.006, type: "sawtooth", gain: 0.3 },
      { ratio: 0.5, type: "sine", gain: 0.2 },
    ],
    attack: 0.11,
    gain: 0.65,
    filter: { type: "lowpass", frequency: 1500, q: 0.8 },
  },
  bass: {
    id: "bass",
    label: "Synth bass",
    description: "Square wave with a deep sine sub-octave.",
    program: 38,
    harmonics: [
      { ratio: 1, type: "square", gain: 0.55 },
      { ratio: 0.5, type: "sine", gain: 0.32 },
    ],
    attack: 0.006,
    gain: 0.75,
    filter: { type: "lowpass", frequency: 780, q: 1.2 },
  },
};

