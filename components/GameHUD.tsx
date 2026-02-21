import React from 'react';
import { GameStats } from '../types';
import { Trophy, Flame } from 'lucide-react';
import { motion } from 'framer-motion';

interface GameHUDProps {
  stats: GameStats;
  timeLeft: number;
  streak: number;
}

const GameHUD: React.FC<GameHUDProps> = ({ stats, streak }) => {
  return (
    <div className="absolute top-0 left-0 right-0 p-4 z-40 pointer-events-none">
      <div className="flex justify-between items-start">
        {/* Score */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-cyan-500/30">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="text-xl font-bold font-mono text-cyan-50">
              {stats.score.toLocaleString()}
            </span>
          </div>
          <div className="text-xs text-cyan-300/80 px-2 font-mono">
            ENCOUNTERS: {stats.aliensEncountered}
          </div>
        </div>

        {/* Streak */}
        <div className="flex flex-col items-end">
          <motion.div 
            key={streak}
            initial={{ scale: 1.5 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-1 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-purple-500/30"
          >
            <Flame className={`w-4 h-4 ${
              streak > 0 ? 'text-orange-400 fill-orange-400' : 'text-gray-400'
            }`} />
            <span className="text-xl font-bold font-mono text-white">x{streak}</span>
          </motion.div>
          {streak > 2 && (
            <motion.span 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-orange-300 font-bold mt-1"
            >
              ON FIRE!
            </motion.span>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameHUD;
