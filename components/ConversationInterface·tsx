import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Mic, MicOff, X } from 'lucide-react';
import { ConversationMessage } from '../types';

interface ConversationInterfaceProps {
  messages: ConversationMessage[];
  timeLeft: number;
  isVoiceEnabled: boolean;
  isListening: boolean;
  onSendMessage: (message: string) => void;
  onStartVoice: () => void;
  onStopVoice: () => void;
  onEndConversation: () => void;
}

const ConversationInterface: React.FC<ConversationInterfaceProps> = ({
  messages,
  timeLeft,
  isVoiceEnabled,
  isListening,
  onSendMessage,
  onStartVoice,
  onStopVoice,
  onEndConversation
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-md">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-cyan-500/30">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-cyan-400 font-mono font-bold">
            ALIEN CONNECTED
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={`px-3 py-1 rounded-full font-mono text-sm ${
            timeLeft <= 20 
              ? 'bg-red-500/20 text-red-400 animate-pulse' 
              : 'bg-cyan-500/20 text-cyan-400'
          }`}>
            {timeLeft}s
          </div>
          
          <button
            onClick={onEndConversation}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] px-4 py-3 rounded-2xl ${
                msg.role === 'user'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-purple-600/30 text-purple-100 border border-purple-500/30'
              }`}
            >
              <p className="text-sm leading-relaxed">{msg.content}</p>
              <span className="text-xs opacity-60 mt-1 block">
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </motion.div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-cyan-500/30">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-white/10 border border-cyan-500/30 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          />
          
          {isVoiceEnabled && (
            <button
              type="button"
              onClick={isListening ? onStopVoice : onStartVoice}
              className={`p-3 rounded-xl transition-all ${
                isListening
                  ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              {isListening ? (
                <MicOff className="w-6 h-6" />
              ) : (
                <Mic className="w-6 h-6" />
              )}
            </button>
          )}
          
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-3 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:opacity-50 rounded-xl transition-colors"
          >
            <Send className="w-6 h-6" />
          </button>
        </form>
        
        {isListening && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 text-center text-sm text-cyan-400 flex items-center justify-center gap-2"
          >
            <div className="flex gap-1">
              <div className="w-1 h-4 bg-cyan-400 animate-pulse" style={{ animationDelay: '0s' }} />
              <div className="w-1 h-4 bg-cyan-400 animate-pulse" style={{ animationDelay: '0.1s' }} />
              <div className="w-1 h-4 bg-cyan-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
            </div>
            Listening...
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ConversationInterface;
