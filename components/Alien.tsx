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
  // Depth illusion based on vertical position
  const topPercent = parseFloat(position.top);
  const depthNorm = clamp((topPercent - 20) / 40, 0, 1);

  const scale = 0.85 + depthNorm * 0.3;
  const blur = (1 - depthNorm) * 1.5;
  const shadowStrength = 20 + depthNorm * 30;

  // ANIMATION VARIANTS
  const bodyVariants = {
    IDLE: { 
      scale: [1, 1.02, 1],
      rotate: [0, 2, -2, 0],
      transition: { repeat: Infinity, duration: 3, ease: 'easeInOut' }
    },
    NOTICED: { 
      scale: 1.1,
      rotate: 5,
      y: -10,
      transition: { type: 'spring', stiffness: 300 }
    },
    LISTENING: { 
      scale: 1.05,
      transition: { duration: 0.3 }
    },
    THINKING: { 
      scale: [1.05, 1.08, 1.05],
      transition: { repeat: Infinity, duration: 1.5 }
    },
    TALKING: { 
      scale: [1, 1.03, 1],
      transition: { repeat: Infinity, duration: 0.5 }
    },
    MISSED: { 
      scale: 0.9,
      opacity: 0.6,
      y: 10,
      transition: { duration: 0.4 }
    }
  };

  const rightArmVariants = {
    IDLE: { rotate: [0, 20, -10, 0], transition: { repeat: Infinity, duration: 2 } },
    NOTICED: { rotate: 160, y: -8, transition: { type: 'spring', stiffness: 200 } },
    LISTENING: { rotate: 25, transition: { duration: 0.3 } },
    THINKING: { rotate: [25, 35, 25], transition: { repeat: Infinity, duration: 1 } },
    TALKING: { rotate: [20, 30, 20], transition: { repeat: Infinity, duration: 0.6 } },
    MISSED: { rotate: 40, opacity: 0.5 }
  };

  const leftArmVariants = {
    IDLE: { rotate: [5, -5, 5], transition: { repeat: Infinity, duration: 2.5 } },
    NOTICED: { rotate: -160, y: -8, transition: { type: 'spring', stiffness: 200 } },
    LISTENING: { rotate: -20, transition: { duration: 0.3 } },
    THINKING: { rotate: -20 },
    TALKING: { rotate: [-15, -25, -15], transition: { repeat: Infinity, duration: 0.7 } },
    MISSED: { rotate: -40, opacity: 0.5 }
  };

  const eyeVariants = {
    IDLE: {},
    NOTICED: { scale: 1.2 },
    LISTENING: { scaleY: 1.1 },
    THINKING: { 
      scaleY: [1, 0.2, 1],
      transition: { repeat: Infinity, duration: 2, repeatDelay: 1 }
    },
    TALKING: {},
    MISSED: { scaleY: 0.3 }
  };

  const mouthVariants = {
    IDLE: { d: 'M38 62 Q50 68 62 62' },
    NOTICED: { d: 'M35 58 Q50 75 65 58' },
    LISTENING: { d: 'M42 64 Q50 64 58 64' },
    THINKING: { d: 'M45 65 Q50 60 55 65' },
    TALKING: {
      d: [
        'M38 62 Q50 70 62 62',
        'M38 60 Q50 75 62 60',
        'M40 64 Q50 60 60 64'
      ],
      transition: { repeat: Infinity, duration: 0.3 }
    },
    MISSED: { d: 'M40 68 Q50 63 60 68' }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <div
          className="absolute w-40 h-40 pointer-events-none"
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
          {/* Portal Ring */}
          <motion.div
            initial={{ scale: 0, opacity: 0, rotate: 0 }}
            animate={{ scale: 1, opacity: 1, rotate: 360 }}
            exit={{ scale: 0, opacity: 0, rotate: 720 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div
              className="w-40 h-40 rounded-full border-4 border-dashed border-cyan-400 opacity-60"
              style={{
                boxShadow: `0 0 ${shadowStrength}px rgba(34,211,238,0.6)`,
                background: 'radial-gradient(circle, rgba(34,211,238,0.1) 0%, transparent 70%)'
              }}
            />
          </motion.div>

          {/* Speech Bubble */}
          {message && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute -top-32 left-1/2 -translate-x-1/2 bg-white/95 text-black px-4 py-3 rounded-2xl rounded-bl-none w-56 z-20 shadow-lg"
            >
              <p className="text-sm font-mono font-bold leading-snug">{message}</p>
            </motion.div>
          )}

          {/* Alien Body */}
          <motion.div
            initial={{ y: 40, scale: 0 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 40, scale: 0 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              variants={bodyVariants}
            >
              <svg width="120" height="120" viewBox="0 0 100 100">
                {/* Holographic gradient definition */}
                <defs>
                  <linearGradient id="holographic" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" /> {/* cyan */}
                    <stop offset="33%" stopColor="#a855f7" /> {/* purple */}
                    <stop offset="66%" stopColor="#ec4899" /> {/* pink */}
                    <stop offset="100%" stopColor="#fb923c" /> {/* orange */}
                  </linearGradient>
                  
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>

                {/* Body */}
                <motion.ellipse
                  cx="50"
                  cy="55"
                  rx="22"
                  ry="30"
                  fill="url(#holographic)"
                  filter="url(#glow)"
                  opacity="0.9"
                  animate={status}
                  variants={bodyVariants}
                />

                {/* Head */}
                <motion.ellipse
                  cx="50"
                  cy="30"
                  rx="28"
                  ry="25"
                  fill="url(#holographic)"
                  filter="url(#glow)"
                  opacity="0.9"
                  animate={status}
                  variants={bodyVariants}
                />

                {/* Eyes */}
                <motion.g animate={status} variants={eyeVariants}>
                  <ellipse cx="42" cy="28" rx="4" ry="6" fill="#1e293b" />
                  <ellipse cx="58" cy="28" rx="4" ry="6" fill="#1e293b" />
                  <ellipse cx="43" cy="26" rx="1.5" ry="2" fill="white" opacity="0.8" />
                  <ellipse cx="59" cy="26" rx="1.5" ry="2" fill="white" opacity="0.8" />
                </motion.g>

                {/* Mouth */}
                <motion.path
                  fill="none"
                  stroke="#166534"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  variants={mouthVariants}
                  animate={status}
                />

                {/* Left Arm */}
                <motion.g
                  animate={status}
                  variants={leftArmVariants}
                  style={{ originX: '35px', originY: '60px' }}
                >
                  <ellipse
                    cx="35"
                    cy="60"
                    rx="5"
                    ry="15"
                    fill="url(#holographic)"
                    opacity="0.85"
                    filter="url(#glow)"
                  />
                  <circle cx="35" cy="72" r="4" fill="url(#holographic)" opacity="0.9" />
                </motion.g>

                {/* Right Arm */}
                <motion.g
                  animate={status}
                  variants={rightArmVariants}
                  style={{ originX: '65px', originY: '60px' }}
                >
                  <ellipse
                    cx="65"
                    cy="60"
                    rx="5"
                    ry="15"
                    fill="url(#holographic)"
                    opacity="0.85"
                    filter="url(#glow)"
                  />
                  <circle cx="65" cy="72" r="4" fill="url(#holographic)" opacity="0.9" />
                </motion.g>
              </svg>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Alien;
