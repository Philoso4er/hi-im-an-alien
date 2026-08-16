class VoiceService {
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis | null = null;
  private isListening: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';
    }

    if ('speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
    }
  }

  isSupported(): boolean {
    return this.recognition !== null && this.synthesis !== null;
  }

  startListening(
    onResult: (transcript: string) => void,
    onError?: (error: string) => void
  ): void {
    if (!this.recognition || this.isListening) return;

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
      this.isListening = false;
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (onError) {
        onError(event.error);
      }
      this.isListening = false;
    };

    this.recognition.onend = () => {
      this.isListening = false;
    };

    try {
      this.recognition.start();
      this.isListening = true;
    } catch (error) {
      console.error('Failed to start recognition:', error);
      this.isListening = false;
    }
  }

  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  // Voices ranked by preference — deeper/male/neutral voices first,
  // ordered by how commonly they're available across Chrome/Safari/Edge
  private findBestVoice(): SpeechSynthesisVoice | undefined {
    if (!this.synthesis) return undefined;
    const voices = this.synthesis.getVoices();

    const preferredNames = [
      'Google UK English Male',
      'Microsoft David',
      'Microsoft Guy',
      'Daniel',
      'Alex',
      'Fred',
      'Male'
    ];

    for (const name of preferredNames) {
      const match = voices.find(v => v.name.includes(name));
      if (match) return match;
    }

    // Fallback: any voice NOT explicitly flagged female, prefer English
    const nonFemale = voices.find(
      v => v.lang.startsWith('en') && !v.name.toLowerCase().includes('female')
        && !v.name.includes('Samantha') && !v.name.includes('Victoria') && !v.name.includes('Karen')
    );
    if (nonFemale) return nonFemale;

    return voices[0];
  }

  speak(
    text: string,
    onStart?: () => void,
    onEnd?: () => void
  ): void {
    if (!this.synthesis) return;

    this.synthesis.cancel();

    this.currentUtterance = new SpeechSynthesisUtterance(text);

    // Deeper, slower, more deliberate — reads as unsettling/otherworldly
    // rather than a standard assistant voice
    this.currentUtterance.rate = 0.82;
    this.currentUtterance.pitch = 0.6;
    this.currentUtterance.volume = 0.85;

    const preferredVoice = this.findBestVoice();
    if (preferredVoice) {
      this.currentUtterance.voice = preferredVoice;
    }

    this.currentUtterance.onstart = () => {
      if (onStart) onStart();
    };

    this.currentUtterance.onend = () => {
      if (onEnd) onEnd();
    };

    this.synthesis.speak(this.currentUtterance);
  }

  stopSpeaking(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }

  getListeningState(): boolean {
    return this.isListening;
  }
}

export const voiceService = new VoiceService();
