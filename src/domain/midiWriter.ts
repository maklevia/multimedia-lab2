import { INSTRUMENTS } from "./instruments";
import type { MappingConfig, NoteEvent } from "./types";

interface MidiEvent {
  tick: number;
  priority: number;
  bytes: number[];
}

const NOTE_OFF_PRIORITY = 0;
const CONTROL_PRIORITY = 1;
const NOTE_ON_PRIORITY = 2;
const END_PRIORITY = 9;

/**
 * MIDI variable-length quantity. Values in [0, 0x0FFFFFFF] are supported.
 */
export function encodeVLQ(value: number): number[] {
  if (!Number.isInteger(value) || value < 0 || value > 0x0fffffff) {
    throw new Error(`Cannot encode VLQ value: ${value}`);
  }

  let buffer = value & 0x7f;
  const bytes = [buffer];

  while ((value >>= 7) > 0) {
    buffer = (value & 0x7f) | 0x80;
    bytes.unshift(buffer);
  }

  return bytes;
}

function uint32(value: number): number[] {
  return [
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ];
}

function asciiText(text: string): string {
  const normalized = text
    .normalize("NFKD")
    .replace(/[^\x20-\x7e]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return normalized || "Data Sonification";
}

function textMeta(type: number, text: string): number[] {
  const bytes = Array.from(new TextEncoder().encode(asciiText(text)));
  return [0xff, type, ...encodeVLQ(bytes.length), ...bytes];
}

function tempoMeta(bpm: number): number[] {
  const safeBpm = Math.max(20, Math.min(400, bpm));
  const microseconds = Math.round(60_000_000 / safeBpm);
  return [
    0xff,
    0x51,
    0x03,
    (microseconds >>> 16) & 0xff,
    (microseconds >>> 8) & 0xff,
    microseconds & 0xff,
  ];
}

function timeSignatureMeta(): number[] {
  // 4/4, 24 MIDI clocks per metronome click, 8 32nd notes per quarter.
  return [0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08];
}

function panToCC(pan: number): number {
  return Math.max(0, Math.min(127, Math.round(((pan + 1) / 2) * 127)));
}

export function writeMidi(
  notes: NoteEvent[],
  config: MappingConfig,
  title = "Data Sonification",
): Uint8Array {
  const events: MidiEvent[] = [
    { tick: 0, priority: -2, bytes: textMeta(0x03, title) },
    { tick: 0, priority: -2, bytes: tempoMeta(config.bpm) },
    { tick: 0, priority: -2, bytes: timeSignatureMeta() },
    {
      tick: 0,
      priority: -1,
      bytes: [0xc0, INSTRUMENTS[config.instrument].program],
    },
  ];

  const panIsMapped = Boolean(config.assignments.pan);

  for (const note of notes) {
    const start = Math.max(0, Math.round(note.startTick));
    const duration = Math.max(1, Math.round(note.durationTicks));
    const pitch = Math.max(0, Math.min(127, Math.round(note.pitch)));
    const velocity = Math.max(1, Math.min(127, Math.round(note.velocity)));

    if (panIsMapped) {
      events.push({
        tick: start,
        priority: CONTROL_PRIORITY,
        bytes: [0xb0, 0x0a, panToCC(note.pan)],
      });
    }

    events.push({
      tick: start,
      priority: NOTE_ON_PRIORITY,
      bytes: [0x90, pitch, velocity],
    });
    events.push({
      tick: start + duration,
      priority: NOTE_OFF_PRIORITY,
      bytes: [0x80, pitch, 0x00],
    });
  }

  const totalTicks = notes.reduce(
    (max, note) => Math.max(max, note.startTick + note.durationTicks),
    0,
  );

  events.push({
    tick: totalTicks + 1,
    priority: END_PRIORITY,
    bytes: [0xff, 0x2f, 0x00],
  });

  events.sort((left, right) => {
    if (left.tick !== right.tick) return left.tick - right.tick;
    return left.priority - right.priority;
  });

  const trackData: number[] = [];
  let previousTick = 0;

  for (const event of events) {
    const delta = Math.max(0, event.tick - previousTick);
    trackData.push(...encodeVLQ(delta), ...event.bytes);
    previousTick = event.tick;
  }

  const ppq = Math.max(24, Math.min(960, Math.round(config.ppq)));
  const header = [
    0x4d,
    0x54,
    0x68,
    0x64, // MThd
    0x00,
    0x00,
    0x00,
    0x06,
    0x00,
    0x00, // format 0
    0x00,
    0x01, // one track
    (ppq >>> 8) & 0xff,
    ppq & 0xff,
  ];

  const track = [
    0x4d,
    0x54,
    0x72,
    0x6b, // MTrk
    ...uint32(trackData.length),
    ...trackData,
  ];

  return new Uint8Array([...header, ...track]);
}
