import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Mic, MicOff, X } from 'lucide-react';
import { ConversationMessage } from '../types';
import { Rect } from './alienStage';

interface ConversationInterfaceProps {
  messages: ConversationMessage[];
  timeLeft: number;
  isVoiceEnabled: boolean;
  isListening: boolean;
  isThinking?: boolean;
  /** Where the panel goes — next to the alien, in the direction it gestures. */
  rect: Rect;
  onSendMessage: (message: string) => void;
  onStartVoice: () => void;
  onStopVoice: () => void;
  onEndConversation: () => void;
}

/**
 * Compact chat panel that "pops out" of the alien's presenting gesture.
 * It never covers the alien: its position/size come from the stage layout.
 */
const ConversationInterface: React.FC<ConversationInterfaceProps> = ({
  messages,
  timeLeft,
  isVoiceEnabled,
  isListening,
  isThinking,
  rect,
  onSendMessage,
  onStartVoice,
  onStopVoice,
  onEndConversation
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isThinking]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  const waitingForAlien = messages.length === 0 || isThinking;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.2 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.2, transition: { duration: 0.25 } }}
      transition={{ type: 'spring', damping: 20, stiffness: 220 }}
      className="absolute z-50 flex flex-col bg-black/60 backdrop-blur-md border border-cyan-400/40 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.25)] overflow-hidden"
      style={{
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        // Grows out of the bottom-right corner, where the alien's palms are.
        transformOrigin: 'bottom right'
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-center px-3 py-2 border-b border-cyan-500/30">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
          <span className="text-cyan-400 font-mono font-bold text-xs truncate">ALIEN CONNECTED</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div
            className={`px-2 py-0.5 rounded-full font-mono text-xs ${
              timeLeft <= 20 ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-cyan-500/20 text-cyan-400'
            }`}
          >
            {timeLeft}s
          </div>
          <button
            onClick={onEndConversation}
            aria-label="End conversation"
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
        {messages.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] px-3 py-2 rounded-2xl ${
                msg.role === 'user'
                  ? 'bg-cyan-600 text-white rounded-br-sm'
                  : 'bg-purple-600/40 text-purple-50 border border-purple-400/30 rounded-bl-sm'
              }`}
            >
              <p className="text-sm leading-snug">{msg.content}</p>
              <span className="text-[10px] opacity-60 mt-0.5 block">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </motion.div>
        ))}
        {waitingForAlien && (
          <div className="flex justify-start">
            <div className="px-3 py-2 rounded-2xl bg-purple-600/30 border border-purple-400/20 flex gap-1">
              {[0, 0.15, 0.3].map(d => (
                <span
                  key={d}
                  className="w-1.5 h-1.5 rounded-full bg-purple-200 animate-bounce"
                  style={{ animationDelay: `${d}s` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-2 border-t border-cyan-500/30">
        <form onSubmit={handleSubmit} className="flex gap-1.5">
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Say something..."
            className="flex-1 min-w-0 bg-white/10 border border-cyan-500/30 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          />

          {isVoiceEnabled && (
            <button
              type="button"
              onClick={isListening ? onStopVoice : onStartVoice}
              aria-label={isListening ? 'Stop listening' : 'Speak'}
              className={`p-2 rounded-xl transition-all shrink-0 ${
                isListening ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          )}

          <button
            type="submit"
            disabled={!inputText.trim()}
            aria-label="Send"
            className="p-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:opacity-50 rounded-xl transition-colors shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>

        {isListening && (
          <div className="mt-1.5 text-center text-xs text-cyan-400">Listening...</div>
        )}
      </div>
    </motion.div>
  );
};

export default ConversationInterface;
