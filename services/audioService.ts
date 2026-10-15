import { SoundType } from '../types';

class AudioService {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private musicEnabled: boolean = true;

  constructor() {
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  setSettings(sound: boolean, music: boolean) {
    this.soundEnabled = sound;
    this.musicEnabled = music;
  }

  async init() {
    if (this.ctx?.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  play(type: SoundType) {
    if (!this.soundEnabled || !this.ctx) return;
    this.init();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    const now = this.ctx.currentTime;

    switch (type) {
      case 'portal':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.6);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.1);
        gain.gain.linearRampToValueAtTime(0, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
        break;

      case 'spawn':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.linearRampToValueAtTime(1200, now + 0.1);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;

      case 'success':
        this.playNote(523.25, 0, 0.1);
        this.playNote(659.25, 0.1, 0.1);
        this.playNote(783.99, 0.2, 0.2);
        break;

      case 'miss':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.3);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;

      case 'click':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
        break;
        
      case 'gameover':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(100, now + 1);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0, now + 1);
        osc.start(now);
        osc.stop(now + 1);
        break;

      case 'conversation_start':
        this.playNote(400, 0, 0.15);
        this.playNote(500, 0.1, 0.15);
        this.playNote(600, 0.2, 0.2);
        this.playNote(800, 0.3, 0.3);
        break;

      case 'rare':
        // Shimmering arpeggio for a rare sighting.
        [660, 880, 990, 1320].forEach((f, i) => this.playNote(f, i * 0.09, 0.35));
        break;

      case 'pause':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.18);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
        break;

      case 'conversation_end':
        this.playNote(800, 0, 0.15);
        this.playNote(600, 0.1, 0.15);
        this.playNote(400, 0.2, 0.3);
        break;
    }
  }

  /**
   * Sonar ping for the radar. pan -1 (left) .. 1 (right), strength 0..1
   * (closer to facing the alien = louder, higher, brighter).
   */
  ping(pan: number, strength: number) {
    if (!this.soundEnabled || !this.ctx) return;
    this.init();
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const panner = (ctx as any).createStereoPanner ? ctx.createStereoPanner() : null;
    osc.type = 'sine';
    const f = 520 + strength * 520;
    osc.frequency.setValueAtTime(f, now);
    osc.frequency.exponentialRampToValueAtTime(f * 0.82, now + 0.35);
    const vol = 0.025 + strength * 0.11;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.45);
    osc.connect(gain);
    if (panner) {
      panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), now);
      gain.connect(panner);
      panner.connect(ctx.destination);
    } else {
      gain.connect(ctx.destination);
    }
    osc.start(now);
    osc.stop(now + 0.5);
  }

  private playNote(freq: number, startTimeOffset: number, duration: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    const now = this.ctx.currentTime;
    osc.frequency.value = freq;
    osc.type = 'sine';
    
    gain.gain.setValueAtTime(0, now + startTimeOffset);
    gain.gain.linearRampToValueAtTime(0.2, now + startTimeOffset + 0.05);
    gain.gain.linearRampToValueAtTime(0, now + startTimeOffset + duration);
    
    osc.start(now + startTimeOffset);
    osc.stop(now + startTimeOffset + duration);
  }
}

export const audioService = new AudioService();
