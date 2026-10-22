// Alarm tones synthesized with Web Audio: no sound files to ship. [frequency Hz, duration s] per note.
export const TONES: { id: string; name: string; notes: [number, number][]; wave: OscillatorType }[] = [
  { id: 'chime', name: 'Chime', wave: 'sine', notes: [[880, 0.18], [1175, 0.18], [1568, 0.35]] },
  { id: 'bell', name: 'Bell', wave: 'triangle', notes: [[1046, 0.5], [784, 0.6]] },
  { id: 'pulse', name: 'Pulse', wave: 'square', notes: [[660, 0.1], [0, 0.08], [660, 0.1], [0, 0.08], [660, 0.1]] },
  { id: 'radar', name: 'Radar', wave: 'sawtooth', notes: [[520, 0.12], [780, 0.12], [520, 0.12], [780, 0.12]] },
  { id: 'soft', name: 'Soft', wave: 'sine', notes: [[523, 0.4], [659, 0.4], [784, 0.6]] },
];

let ctx: AudioContext | null = null;

export function playTone(id: string) {
  const tone = TONES.find((t) => t.id === id) ?? TONES[0];
  ctx ??= new AudioContext();
  let t = ctx.currentTime + 0.02;
  for (const [freq, dur] of tone.notes) {
    if (freq) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = tone.wave;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(tone.wave === 'sine' ? 0.25 : 0.08, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    }
    t += dur;
  }
}

export const toneName = (id: string) => TONES.find((t) => t.id === id)?.name ?? 'Chime';
