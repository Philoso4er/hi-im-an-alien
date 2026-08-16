import React from 'react';
import { motion } from 'framer-motion';
import { Crosshair, MapPin } from 'lucide-react';

interface ARCalibrationProps {
  onPlace: () => void;
  motionSupported: boolean;
}

const ARCalibration: React.FC<ARCalibrationProps> = ({ onPlace, motionSupported }) => {
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-between py-16 px-6 pointer-events-none">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-black/60 backdrop-blur-sm px-5 py-3 rounded-2xl text-center max-w-xs pointer-events-auto"
      >
        <p className="text-cyan-400 font-bold text-sm uppercase tracking-wider mb-1">
          Set Up Your Space
        </p>
        <p className="text-gray-300 text-xs leading-relaxed">
          {motionSupported
            ? 'Hold your phone comfortably, then tap below to place your alien in this space.'
            : 'Tap below to summon your alien. (Motion tracking unavailable — alien will stay centered.)'}
        </p>
      </motion.div>

      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="flex items-center justify-center"
      >
        <Crosshair className="w-16 h-16 text-cyan-400/70" strokeWidth={1} />
      </motion.div>

      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileTap={{ scale: 0.95 }}
        onClick={onPlace}
        className="pointer-events-auto bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold py-4 px-8 rounded-full shadow-[0_0_40px_rgba(6,182,212,0.6)] flex items-center gap-2 uppercase tracking-wide"
      >
        <MapPin className="w-5 h-5" />
        Place Alien Here
      </motion.button>
    </div>
  );
};

export default ARCalibration;
