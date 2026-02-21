import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, MapPin, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { ConversationMessage } from '../types';

interface EncounterData {
  id: string;
  startTime: number;
  endTime: number;
  messages: ConversationMessage[];
  location?: { lat: number; lng: number };
  timeOfDay: string;
}

interface EncounterCollectionProps {
  encounters: EncounterData[];
  onClose: () => void;
}

const EncounterCollection: React.FC<EncounterCollectionProps> = ({
  encounters,
  onClose
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDuration = (start: number, end: number) => {
    const seconds = Math.floor((end - start) / 1000);
    return `${seconds}s`;
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-black/80 border-b border-cyan-500/30 p-4 flex justify-between items-center z-10">
        <div>
          <h2 className="text-2xl font-bold text-cyan-400">Encounter Log</h2>
          <p className="text-sm text-gray-400 mt-1">
            {encounters.length} encounter{encounters.length !== 1 ? 's' : ''} recorded
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Encounters List */}
      <div className="p-4 space-y-3">
        {encounters.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">👽</div>
            <p className="text-gray-400 text-lg">No encounters yet</p>
            <p className="text-gray-500 text-sm mt-2">
              Start exploring to meet aliens!
            </p>
          </div>
        ) : (
          encounters.slice().reverse().map((encounter) => (
            <motion.div
              key={encounter.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-purple-900/20 to-cyan-900/20 border border-cyan-500/30 rounded-xl overflow-hidden"
            >
              <button
                onClick={() =>
                  setExpandedId(expandedId === encounter.id ? null : encounter.id)
                }
                className="w-full p-4 flex items-start justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2 text-cyan-400 font-mono text-sm mb-2">
                    <Clock className="w-4 h-4" />
                    {formatDate(encounter.startTime)}
                  </div>
                  
                  <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {encounter.messages.length} messages
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {getDuration(encounter.startTime, encounter.endTime)}
                    </div>
                    <div className="px-2 py-0.5 bg-purple-500/20 rounded-full">
                      {encounter.timeOfDay}
                    </div>
                  </div>
                </div>

                {expandedId === encounter.id ? (
                  <ChevronUp className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                )}
              </button>

              <AnimatePresence>
                {expandedId === encounter.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-cyan-500/20"
                  >
                    <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                      {encounter.messages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`${
                            msg.role === 'user'
                              ? 'text-right'
                              : 'text-left'
                          }`}
                        >
                          <div
                            className={`inline-block max-w-[85%] px-3 py-2 rounded-lg ${
                              msg.role === 'user'
                                ? 'bg-cyan-600/40 text-cyan-100'
                                : 'bg-purple-600/40 text-purple-100'
                            }`}
                          >
                            <p className="text-sm leading-relaxed">
                              {msg.content}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default EncounterCollection;
