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

  // Resume context if suspended (browser autoplay policy)
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
        // Swirling sci-fi sound
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
        // High pitch ping
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
        // Cheerful major chord arpeggio
        this.playNote(523.25, 0, 0.1); // C5
        this.playNote(659.25, 0.1, 0.1); // E5
        this.playNote(783.99, 0.2, 0.2); // G5
        break;

      case 'miss':
        // Low disappointed buzz
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.3);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;

      case 'click':
        // Short blip
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
    }
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
