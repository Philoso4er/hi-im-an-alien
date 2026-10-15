/**
 * Everything the game remembers between sessions that isn't a conversation:
 * settings, first-run flag, daily streak, sighting counters, discovered
 * variants. All localStorage, no backend. Conversations themselves stay in
 * storageService (alien_encounters) so older saves keep working.
 */
import { storageService } from './storageService';

const KEYS = {
  SETTINGS: 'alien_settings',
  PROGRESS: 'alien_progress',
  ONBOARDED: 'alien_onboarded_v1'
};

export interface AppSettings {
  soundEnabled: boolean;
  /** Alien speaks its lines out loud + mic button in chat. */
  voiceEnabled: boolean;
  vibrationEnabled: boolean;
  /** Use the rear camera as the backdrop (off = star-room). */
  cameraEnabled: boolean;
}

export interface VariantRecord {
  count: number;
  firstSeen: number;
}

export interface Progress {
  /** Alien appeared on screen. */
  sightings: number;
  /** User said hi in time. */
  contacts: number;
  /** Alien vanished before the user said hi. */
  misses: number;
  /** Fastest "Say hi" after spawn, ms. */
  fastestHiMs: number | null;
  /** Total seconds spent talking. */
  talkSeconds: number;
  /** Messages sent by the user. */
  messagesSent: number;
  /** Daily streak (consecutive local days with at least one contact). */
  streak: number;
  bestStreak: number;
  /** YYYY-MM-DD local date of the last contact. */
  lastContactDay: string | null;
  variants: Record<string, VariantRecord>;
}

const DEFAULT_PROGRESS: Progress = {
  sightings: 0,
  contacts: 0,
  misses: 0,
  fastestHiMs: null,
  talkSeconds: 0,
  messagesSent: 0,
  streak: 0,
  bestStreak: 0,
  lastContactDay: null,
  variants: {}
};

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full / private mode: game still works, just forgets */
  }
};

export const dayKey = (d: Date = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const daysBetween = (a: string, b: string) => {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
};

class ProgressService {
  getSettings(defaults: AppSettings): AppSettings {
    return read<AppSettings>(KEYS.SETTINGS, defaults);
  }
  saveSettings(s: AppSettings) {
    write(KEYS.SETTINGS, s);
  }

  isOnboarded(): boolean {
    try {
      return localStorage.getItem(KEYS.ONBOARDED) === '1';
    } catch {
      return false;
    }
  }
  setOnboarded() {
    try {
      localStorage.setItem(KEYS.ONBOARDED, '1');
    } catch {
      /* ignore */
    }
  }

  get(): Progress {
    const p = read<Progress>(KEYS.PROGRESS, DEFAULT_PROGRESS);
    // A streak only counts if it was kept up until yesterday or today.
    if (p.lastContactDay && daysBetween(p.lastContactDay, dayKey()) > 1) {
      return { ...p, streak: 0 };
    }
    return p;
  }
  private update(fn: (p: Progress) => Progress): Progress {
    const next = fn(read<Progress>(KEYS.PROGRESS, DEFAULT_PROGRESS));
    write(KEYS.PROGRESS, next);
    return next;
  }

  recordSighting() {
    return this.update(p => ({ ...p, sightings: p.sightings + 1 }));
  }
  recordMiss() {
    return this.update(p => ({ ...p, misses: p.misses + 1 }));
  }

  /** Say-hi in time. Returns the new progress and whether the variant is new. */
  recordContact(variantId: string, reactionMs: number): { progress: Progress; newVariant: boolean; streakUp: boolean } {
    let newVariant = false;
    let streakUp = false;
    const progress = this.update(p => {
      const today = dayKey();
      let streak = p.streak;
      if (!p.lastContactDay) {
        streak = 1;
        streakUp = true;
      } else {
        const gap = daysBetween(p.lastContactDay, today);
        if (gap === 1) {
          streak = p.streak + 1;
          streakUp = true;
        } else if (gap > 1) {
          streak = 1;
          streakUp = true;
        }
      }
      const prev = p.variants[variantId];
      newVariant = !prev;
      return {
        ...p,
        contacts: p.contacts + 1,
        fastestHiMs: p.fastestHiMs == null ? reactionMs : Math.min(p.fastestHiMs, reactionMs),
        streak,
        bestStreak: Math.max(p.bestStreak, streak),
        lastContactDay: today,
        variants: {
          ...p.variants,
          [variantId]: { count: (prev?.count || 0) + 1, firstSeen: prev?.firstSeen || Date.now() }
        }
      };
    });
    return { progress, newVariant, streakUp };
  }

  recordConversation(seconds: number, userMessages: number) {
    return this.update(p => ({
      ...p,
      talkSeconds: p.talkSeconds + Math.max(0, Math.round(seconds)),
      messagesSent: p.messagesSent + userMessages
    }));
  }

  /** Wipes everything: encounters, stats, progress, settings, onboarding. */
  resetAll() {
    storageService.clearAll();
    try {
      [KEYS.PROGRESS, KEYS.SETTINGS, KEYS.ONBOARDED, 'alien_install_dismissed'].forEach(k =>
        localStorage.removeItem(k)
      );
    } catch {
      /* ignore */
    }
  }
}

export const progressService = new ProgressService();

/** Pick the alien line most worth remembering from a conversation. */
export function pickMemorableLine(messages: { role: string; content: string }[]): string | undefined {
  const alien = messages.filter(m => m.role === 'alien').map(m => m.content.trim());
  if (!alien.length) return undefined;
  // Prefer a question of medium length; skip the very first greeting if there's more.
  const pool = alien.length > 1 ? alien.slice(1) : alien;
  const scored = pool
    .map(text => {
      const sentences = text.split(/(?<=[.?!])\s+/).filter(Boolean);
      const q = sentences.reverse().find(s => s.includes('?')) || sentences[0] || text;
      const len = q.length;
      const score = (q.includes('?') ? 20 : 0) - Math.abs(len - 90) / 4;
      return { q, score };
    })
    .sort((a, b) => b.score - a.score);
  return scored[0]?.q;
}
