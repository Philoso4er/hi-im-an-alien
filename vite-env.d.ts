/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// Web Speech API recognition types aren't in TypeScript's DOM lib.
type SpeechRecognition = any;
type SpeechRecognitionEvent = any;
