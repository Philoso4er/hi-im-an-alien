export enum GameScreen {
  SPLASH = 'SPLASH',
  MENU = 'MENU',
  HOW_TO = 'HOW_TO',
  PLAYING = 'PLAYING',
  CONVERSATION = 'CONVERSATION',
  RESULTS = 'RESULTS',
  SETTINGS = 'SETTINGS'
}

export enum GameMode {
  ARCADE = 'ARCADE',
  CHILL = 'CHILL'
}

export type AlienStatus =
  | 'IDLE'
  | 'NOTICED'
  | 'MISSED'
  | 'LISTENING'
  | 'THINKING'
  | 'TALKING';

export interface GameStats {
  score: number;
  successfulPings: number;
  misses: number;
  longestStreak: number;
  averageReactionTimeMs: number;
  aliensEncountered: number;
  totalConversationTime: number;
}

export interface Settings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  vibrationEnabled: boolean;
  voiceEnabled: boolean;
}

export interface AlienPosition {
  top: string;
  left: string;
  edge: 'top' | 'bottom' | 'left' | 'right';
}

export type SoundType =
  | 'portal'
  | 'spawn'
  | 'success'
  | 'miss'
  | 'click'
  | 'gameover'
  | 'conversation_start'
  | 'conversation_end';

export interface ConversationMessage {
  role: 'user' | 'alien';
  content: string;
  timestamp: number;
}

export interface AlienMemory {
  encounterId: string;
  location: { lat: number; lng: number };
  timestamp: number;
  topics: string[];
  messages: ConversationMessage[];
  userMentioned: string[]; // Things user talked about
}

export interface AlienPersonality {
  name: string;
  traits: string[];
  quirks: string[];
}
