// Chiptune-style sound effects synthesized with the Web Audio API.

import type { PokemonSpecies } from "./pokemon";

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  // Creates the audio context on first use and resumes it if the browser
  // suspended it. Mobile browsers only allow this inside a user gesture.
  private context(): AudioContext | null {
    if (!this.ctx) {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx?.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  unlock() {
    this.context();
  }

  isMuted() {
    return this.muted;
  }

  toggle() {
    this.muted = !this.muted;
    return this.muted;
  }

  // One note with a quick attack and decay. `when` is a delay in seconds,
  // and `freqEnd` slides the pitch over the note.
  private beep(
    freq: number,
    durationMs: number,
    type: OscillatorType = "square",
    volume = 0.05,
    when = 0,
    freqEnd?: number
  ) {
    if (this.muted) return;
    const ctx = this.context();
    if (!ctx) return;
    const start = ctx.currentTime + when;
    const end = start + durationMs / 1000;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (freqEnd !== undefined) osc.frequency.exponentialRampToValueAtTime(freqEnd, end);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(end + 0.02);
  }

  private arpeggio(notes: number[], durationMs: number, gap: number, type: OscillatorType, volume: number, when = 0) {
    notes.forEach((n, i) => this.beep(n, durationMs, type, volume, when + i * gap));
  }

  step() {
    this.beep(160, 30, "square", 0.015);
  }

  talk() {
    this.beep(880, 40, "square", 0.05);
    this.beep(1200, 40, "square", 0.04, 0.045);
  }

  select() {
    this.beep(1200, 60, "square", 0.06);
  }

  door() {
    this.beep(520, 50, "square", 0.04);
    this.beep(390, 70, "square", 0.04, 0.06);
  }

  encounter() {
    this.beep(880, 220, "sawtooth", 0.06, 0, 220);
    this.arpeggio([440, 660, 880], 100, 0.12, "square", 0.06, 0.24);
    this.beep(1100, 160, "square", 0.06, 0.6);
  }

  victory() {
    this.arpeggio([523, 659, 784, 1046], 120, 0.11, "square", 0.05);
    this.beep(1046, 300, "triangle", 0.05, 0.44);
    this.beep(1319, 400, "triangle", 0.04, 0.52);
  }

  defeat() {
    this.arpeggio([392, 311, 247], 220, 0.18, "triangle", 0.06);
    this.beep(196, 400, "sawtooth", 0.05, 0.6);
  }

  catchSound() {
    this.beep(660, 50, "square", 0.06);
    this.beep(880, 50, "square", 0.06, 0.06);
    for (const n of [784, 988, 1174]) this.beep(n, 260, "triangle", 0.04, 0.2);
  }

  faint() {
    this.beep(330, 200, "sawtooth", 0.06, 0, 220);
    this.beep(220, 220, "sawtooth", 0.06, 0.18, 150);
    this.beep(150, 320, "sawtooth", 0.06, 0.38, 90);
  }

  give() {
    this.arpeggio([523, 659, 784, 1046], 90, 0.08, "square", 0.05);
    this.beep(1319, 300, "triangle", 0.04, 0.34);
  }

  levelUp() {
    this.arpeggio([784, 988, 1175, 1568], 70, 0.06, "square", 0.045);
  }

  honour() {
    this.arpeggio([523, 659, 784, 1046, 784, 1046, 1319], 160, 0.15, "triangle", 0.05);
  }

  tunnel() {
    for (let i = 0; i < 6; i++) {
      this.beep(150, 50, "square", 0.03, i * 0.3);
      this.beep(150, 50, "square", 0.012, i * 0.3 + 0.12);
    }
  }

  trainBell() {
    this.beep(1320, 180, "triangle", 0.05);
    this.beep(1320, 220, "triangle", 0.05, 0.25);
  }

  // Each species gets a recognisable cry: the tone pattern comes from its
  // shape, and the pitch from a hash of its id.
  pokemonCry(species: PokemonSpecies) {
    if (species.isLegendary) {
      this.arpeggio([880, 1100, 1320], 180, 0.14, "square", 0.06);
      this.beep(1760, 320, "triangle", 0.05, 0.5);
      this.beep(2200, 320, "triangle", 0.04, 0.62);
      return;
    }
    let hash = 0;
    for (const ch of species.id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    const base = 260 + (hash % 320);

    switch (species.shape) {
      case "blob":
        this.beep(base, 100, "sine", 0.05, 0, base * 1.3);
        this.beep(base * 0.9, 80, "sine", 0.04, 0.1);
        break;
      case "bug":
        this.beep(base + 150, 60, "sawtooth", 0.045);
        this.beep(base + 250, 60, "sawtooth", 0.045, 0.06);
        this.beep(base + 200, 90, "sawtooth", 0.04, 0.13);
        break;
      case "sparky":
        this.beep(base + 200, 60, "square", 0.05);
        this.beep(base + 400, 60, "square", 0.05, 0.06);
        this.beep(base + 300, 80, "square", 0.04, 0.13);
        break;
      case "aqua":
        this.beep(base, 130, "sine", 0.05, 0, base * 0.7);
        this.beep(base * 0.8, 100, "sine", 0.04, 0.14);
        break;
      case "brick":
        this.beep(base * 0.6, 140, "triangle", 0.06);
        this.beep(base * 0.5, 180, "sawtooth", 0.05, 0.14);
        break;
      case "leaf":
        this.beep(base + 100, 90, "triangle", 0.05);
        this.beep(base + 200, 60, "sine", 0.04, 0.09);
        this.beep(base + 150, 80, "triangle", 0.04, 0.16);
        break;
      case "goose":
        this.beep(330, 160, "sawtooth", 0.06, 0, 260);
        this.beep(350, 200, "sawtooth", 0.06, 0.22, 250);
        break;
      case "codey":
        this.beep(700, 70, "sine", 0.05, 0, 1100);
        this.beep(800, 90, "sine", 0.05, 0.1, 1250);
        break;
    }
  }
}

export const sounds = new SoundEngine();
