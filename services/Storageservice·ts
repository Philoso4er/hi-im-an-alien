import { ConversationMessage, AlienMemory } from '../types';

const STORAGE_KEYS = {
  ENCOUNTERS: 'alien_encounters',
  STATS: 'alien_stats',
  SETTINGS: 'alien_settings',
};

interface StoredEncounter {
  id: string;
  startTime: number;
  endTime: number;
  messages: ConversationMessage[];
  location?: { lat: number; lng: number };
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
}

interface GameStats {
  encounterCount: number;
  totalMessages: number;
  longestConversation: number;
  firstEncounterDate: number;
}

class StorageService {
  // Save encounter to local storage
  saveEncounter(encounter: StoredEncounter): void {
    try {
      const encounters = this.getEncounters();
      encounters.push(encounter);
      localStorage.setItem(STORAGE_KEYS.ENCOUNTERS, JSON.stringify(encounters));
      
      // Update stats
      this.updateStats(encounter);
    } catch (error) {
      console.error('Failed to save encounter:', error);
    }
  }

  // Get all encounters
  getEncounters(): StoredEncounter[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ENCOUNTERS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load encounters:', error);
      return [];
    }
  }

  // Get most recent encounters for alien memory
  getRecentMemories(limit: number = 3): AlienMemory[] {
    const encounters = this.getEncounters();
    return encounters
      .slice(-limit)
      .map(enc => ({
        encounterId: enc.id,
        location: enc.location || { lat: 0, lng: 0 },
        timestamp: enc.startTime,
        topics: this.extractTopics(enc.messages),
        messages: enc.messages,
        userMentioned: this.extractUserMentions(enc.messages),
      }));
  }

  // Extract topics from messages (simple keyword extraction)
  private extractTopics(messages: ConversationMessage[]): string[] {
    const keywords = new Set<string>();
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
    
    messages.forEach(msg => {
      if (msg.role === 'user') {
        const words = msg.content.toLowerCase().split(/\s+/);
        words.forEach(word => {
          word = word.replace(/[^a-z]/g, '');
          if (word.length > 3 && !commonWords.has(word)) {
            keywords.add(word);
          }
        });
      }
    });
    
    return Array.from(keywords).slice(0, 5);
  }

  // Extract what user mentioned (for alien memory)
  private extractUserMentions(messages: ConversationMessage[]): string[] {
    const mentions: string[] = [];
    
    messages.forEach(msg => {
      if (msg.role === 'user') {
        // Look for "I am/I'm", "my", etc.
        const content = msg.content.toLowerCase();
        if (content.includes('coffee')) mentions.push('coffee');
        if (content.includes('work')) mentions.push('work');
        if (content.includes('phone')) mentions.push('phone');
        if (content.includes('sleep')) mentions.push('sleep');
        // Add more patterns as needed
      }
    });
    
    return [...new Set(mentions)];
  }

  // Update stats after encounter
  private updateStats(encounter: StoredEncounter): void {
    const stats = this.getStats();
    stats.encounterCount++;
    stats.totalMessages += encounter.messages.length;
    stats.longestConversation = Math.max(
      stats.longestConversation,
      encounter.messages.length
    );
    
    if (!stats.firstEncounterDate) {
      stats.firstEncounterDate = encounter.startTime;
    }
    
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
  }

  // Get game stats
  getStats(): GameStats {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STATS);
      return data ? JSON.parse(data) : {
        encounterCount: 0,
        totalMessages: 0,
        longestConversation: 0,
        firstEncounterDate: 0,
      };
    } catch (error) {
      return {
        encounterCount: 0,
        totalMessages: 0,
        longestConversation: 0,
        firstEncounterDate: 0,
      };
    }
  }

  // Clear all data
  clearAll(): void {
    localStorage.removeItem(STORAGE_KEYS.ENCOUNTERS);
    localStorage.removeItem(STORAGE_KEYS.STATS);
  }

  // Get time of day
  getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  // Try to get user location
  async getLocation(): Promise<{ lat: number; lng: number } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          resolve(null);
        },
        { timeout: 5000 }
      );
    });
  }
}

export const storageService = new StorageService();
