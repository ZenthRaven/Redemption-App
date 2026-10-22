// Renders the in-app alarm tones (src/features/calendar/tones.ts) to WAV files in android res/raw,
// so Android notification channels can play the same sounds. Run:
//   node --experimental-strip-types scripts/make-tones.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { TONES } from '../src/features/calendar/tones.ts';

const RATE = 22050;
const OUT = 'android/app/src/main/res/raw';
const REPEAT = 3; // alarms play the pattern a few times
const GAP = 0.35; // seconds between repeats

const wave = {
  sine: (p) => Math.sin(2 * Math.PI * p),
  triangle: (p) => 1 - 4 * Math.abs(((p + 0.25) % 1) - 0.5),
  square: (p) => (p % 1 < 0.5 ? 1 : -1),
  sawtooth: (p) => 2 * (p % 1) - 1,
};

function render(tone) {
  const gain = tone.wave === 'sine' || tone.wave === 'triangle' ? 0.6 : 0.22;
  const samples = [];
  for (let r = 0; r < REPEAT; r++) {
    for (const [freq, dur] of tone.notes) {
      const n = Math.round(dur * RATE);
      for (let i = 0; i < n; i++) {
        const t = i / RATE;
        // same shape as the Web Audio version: 20 ms attack, exponential decay to the note's end
        const env = t < 0.02 ? t / 0.02 : Math.exp(-5 * (t - 0.02) / dur);
        samples.push(freq ? wave[tone.wave](freq * t) * env * gain : 0);
      }
    }
    for (let i = 0; i < GAP * RATE; i++) samples.push(0);
  }
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.max(-1, Math.min(1, s)) * 32767, i * 2));
  const head = Buffer.alloc(44);
  head.write('RIFF', 0); head.writeUInt32LE(36 + data.length, 4); head.write('WAVE', 8);
  head.write('fmt ', 12); head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20); head.writeUInt16LE(1, 22);
  head.writeUInt32LE(RATE, 24); head.writeUInt32LE(RATE * 2, 28); head.writeUInt16LE(2, 32); head.writeUInt16LE(16, 34);
  head.write('data', 36); head.writeUInt32LE(data.length, 40);
  return Buffer.concat([head, data]);
}

mkdirSync(OUT, { recursive: true });
for (const tone of TONES) {
  writeFileSync(`${OUT}/tone_${tone.id}.wav`, render(tone));
  console.log(`tone_${tone.id}.wav`);
}
