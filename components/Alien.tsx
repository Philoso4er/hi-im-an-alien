import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlienStatus } from '../types';

interface AlienProps {
  isVisible: boolean;
  status: AlienStatus;
  position: { top: string; left: string };
  offsetX?: number;
  offsetY?: number;
  message?: string | null;
}

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

const Alien: React.FC<AlienProps> = ({
  isVisible,
  status,
  position,
  offsetX = 0,
  offsetY = 0,
  message
}) => {
  /**
   * DEPTH ILLUSION
   * We infer depth from vertical position (top %).
   * Higher = farther, Lower = closer
   */
  const topPercent = parseFloat(position.top); // e.g. 20–60
  const depthNorm = clamp((topPercent - 20) / 40, 0, 1); // 0..1

  // Visual depth mapping
  const scale = 0.85 + depthNorm * 0.3;          // 0.85 → 1.15
  const blur = (1 - depthNorm) * 1.5;            // Far = blurrier
  const shadowStrength = 20 + depthNorm * 30;    // Stronger when closer

  // ---------------- ANIMATION VARIANTS ----------------

  const armVariants = {
    IDLE: { rotate: [0, 20, -10, 0], transition: { repeat: Infinity, duration: 1.2 } },
    HIT: { rotate: 160, y: -5, transition: { type: 'spring', stiffness: 200 } },
    MISSED: { rotate: 130, transition: { duration: 0.3 } },
    LISTENING: { rotate: 10 },
    THINKING: { rotate: [10, 30, 10], transition: { repeat: Infinity, duration: 1 } },
    TALKING: { rotate: [10, 15, 10], transition: { repeat: Infinity, duration: 0.2 } }
  };

  const leftArmVariants = {
    IDLE: { rotate: [5, -5, 5], transition: { repeat: Infinity, duration: 2 } },
    HIT: { rotate: -160, y: -5, transition: { type: 'spring', stiffness: 200 } },
    MISSED: { rotate: -130 },
    LISTENING: { rotate: -20 },
    THINKING: { rotate: -20 },
    TALKING: { rotate: [-5, 5], transition: { repeat: Infinity, duration: 0.5 } }
  };

  const mouthVariants = {
    IDLE: { d: 'M38 62 Q50 68 62 62' },
    HIT: { d: 'M35 60 Q50 80 65 60' },
    MISSED: { d: 'M40 65 Q50 60 60 65' },
    LISTENING: { d: 'M42 64 Q50 64 58 64' },
    THINKING: { d: 'M45 65 Q50 60 55 65' },
    TALKING: {
      d: [
        'M38 62 Q50 68 62 62',
        'M38 60 Q50 75 62 60',
        'M40 64 Q50 60 60 64'
      ],
      transition: { repeat: Infinity, duration: 0.2 }
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <div
          className="absolute w-40 h-40"
          style={{
            top: position.top,
            left: position.left,
            transform: `translate3d(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px), 0)
                        scale(${scale})`,
            filter: `blur(${blur}px)`,
            zIndex: Math.round(10 + depthNorm * 10),
            transition: 'transform 0.15s linear, filter 0.15s linear'
          }}
        >
          {/* Portal */}
          <motion.div
            initial={{ scale: 0, opacity: 0, rotate: 0 }}
            animate={{ scale: 1, opacity: 1, rotate: 360 }}
            exit={{ scale: 0, opacity: 0, rotate: 720 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div
              className="w-40 h-40 rounded-full border-4 border-dashed border-cyan-400 opacity-60"
              style={{
                boxShadow: `0 0 ${shadowStrength}px rgba(34,211,238,0.6)`
              }}
            />
          </motion.div>

          {/* Speech Bubble */}
          {message && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute -top-32 left-1/2 -translate-x-1/2 bg-white/90 text-black px-4 py-3 rounded-2xl rounded-bl-none w-48 z-20"
            >
              <p className="text-sm font-mono font-bold leading-tight">{message}</p>
            </motion.div>
          )}

          {/* Alien Body */}
          <motion.div
            initial={{ y: 40, scale: 0 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 40, scale: 0 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            >
              <svg width="120" height="120" viewBox="0 0 100 100">
                <motion.g animate={status} variants={leftArmVariants} />
                <motion.g animate={status} variants={armVariants} />
                <motion.path
                  fill="none"
                  stroke="#166534"
                  strokeWidth="3"
                  strokeLinecap="round"
                  variants={mouthVariants}
                  animate={status}
                />
              </svg>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Alien;
