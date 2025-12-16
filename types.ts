export enum GameScreen {
  SPLASH = 'SPLASH',
  MENU = 'MENU',
  HOW_TO = 'HOW_TO',
  PLAYING = 'PLAYING',
  RESULTS = 'RESULTS',
  SETTINGS = 'SETTINGS'
}

export enum GameMode {
  ARCADE = 'ARCADE',
  CHILL = 'CHILL'
}

export type AlienStatus = 'IDLE' | 'HIT' | 'MISSED' | 'LISTENING' | 'THINKING' | 'TALKING';

export interface GameStats {
  score: number;
  successfulPings: number;
  misses: number;
  longestStreak: number;
  averageReactionTimeMs: number;
}

export interface Settings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  vibrationEnabled: boolean;
}

export interface AlienPosition {
  top: string;
  left: string;
}

export type SoundType = 'portal' | 'spawn' | 'success' | 'miss' | 'click' | 'gameover' | 'talk';