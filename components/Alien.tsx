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
  const shadowStrength = 30 + depthNorm * 40;

  // ANIMATION VARIANTS
  const bodyVariants = {
    IDLE: { 
      y: [0, -15, 0],
      rotate: [0, 3, -3, 0],
      transition: { repeat: Infinity, duration: 4, ease: 'easeInOut' }
    },
    NOTICED: { 
      scale: 1.15,
      y: -20,
      transition: { type: 'spring', stiffness: 300, damping: 15 }
    },
    LISTENING: { 
      scale: 1.05,
      transition: { duration: 0.3 }
    },
    THINKING: { 
      scale: [1.05, 1.08, 1.05],
      rotate: [0, 5, -5, 0],
      transition: { repeat: Infinity, duration: 2 }
    },
    TALKING: { 
      y: [0, -5, 0],
      transition: { repeat: Infinity, duration: 0.8 }
    },
    MISSED: { 
      scale: 0.85,
      opacity: 0.5,
      y: 20,
      transition: { duration: 0.6 }
    }
  };

  const armVariants = {
    IDLE: { 
      rotate: [0, 15, -10, 0],
      y: [0, -3, 0],
      transition: { repeat: Infinity, duration: 3, ease: 'easeInOut' }
    },
    NOTICED: { 
      rotate: 140,
      y: -15,
      transition: { type: 'spring', stiffness: 250, damping: 12 }
    },
    LISTENING: { rotate: 20, y: -5 },
    THINKING: { 
      rotate: [20, 35, 20],
      transition: { repeat: Infinity, duration: 1.5 }
    },
    TALKING: { 
      rotate: [15, 25, 15],
      y: [-5, -8, -5],
      transition: { repeat: Infinity, duration: 0.7 }
    },
    MISSED: { rotate: 50, opacity: 0.4 }
  };

  const leftArmVariants = {
    IDLE: { 
      rotate: [0, -10, 15, 0],
      y: [0, -3, 0],
      transition: { repeat: Infinity, duration: 3.5, ease: 'easeInOut' }
    },
    NOTICED: { 
      rotate: -140,
      y: -15,
      transition: { type: 'spring', stiffness: 250, damping: 12 }
    },
    LISTENING: { rotate: -15, y: -5 },
    THINKING: { rotate: -20 },
    TALKING: { 
      rotate: [-10, -20, -10],
      y: [-5, -8, -5],
      transition: { repeat: Infinity, duration: 0.9 }
    },
    MISSED: { rotate: -50, opacity: 0.4 }
  };

  const eyeVariants = {
    IDLE: { scaleY: 1 },
    NOTICED: { scaleY: 1.3, scaleX: 1.1 },
    LISTENING: { scaleY: 1.1 },
    THINKING: { 
      scaleY: [1, 0.2, 1],
      transition: { repeat: Infinity, duration: 2.5, repeatDelay: 0.8 }
    },
    TALKING: { scaleY: [1, 1.1, 1], transition: { repeat: Infinity, duration: 0.5 } },
    MISSED: { scaleY: 0.4, opacity: 0.6 }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: position.top,
            left: position.left,
            transform: `translate3d(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px), 0) scale(${scale})`,
            filter: `blur(${blur}px)`,
            zIndex: Math.round(10 + depthNorm * 10),
            transition: 'transform 0.15s linear, filter 0.15s linear',
            width: '200px',
            height: '280px'
          }}
        >
          {/* Glowing Portal Ring */}
          <motion.div
            initial={{ scale: 0, opacity: 0, rotate: 0 }}
            animate={{ scale: 1.2, opacity: [0.4, 0.7, 0.4], rotate: 360 }}
            exit={{ scale: 0, opacity: 0, rotate: 720 }}
            transition={{ 
              scale: { duration: 0.8 },
              opacity: { repeat: Infinity, duration: 3 },
              rotate: { duration: 20, repeat: Infinity, ease: 'linear' }
            }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div
              className="w-full h-full rounded-full border-4 border-dashed opacity-70"
              style={{
                borderImage: 'linear-gradient(135deg, #06b6d4, #8b5cf6, #ec4899, #f59e0b) 1',
                boxShadow: `
                  0 0 ${shadowStrength}px rgba(6, 182, 212, 0.8),
                  0 0 ${shadowStrength * 1.5}px rgba(139, 92, 246, 0.6),
                  0 0 ${shadowStrength * 2}px rgba(236, 72, 153, 0.4),
                  inset 0 0 ${shadowStrength * 0.5}px rgba(6, 182, 212, 0.3)
                `,
                background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)'
              }}
            />
          </motion.div>

          {/* Speech Bubble */}
          {message && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute -top-24 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm text-gray-900 px-5 py-4 rounded-2xl rounded-bl-none w-64 z-30 shadow-2xl border-2 border-purple-200"
            >
              <p className="text-sm font-medium leading-relaxed">{message}</p>
            </motion.div>
          )}

          {/* HOLOGRAPHIC ALIEN BODY */}
          <motion.div
            initial={{ y: 60, scale: 0, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 60, scale: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 0.2 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <motion.div
              variants={bodyVariants}
              animate={status}
            >
              <svg width="200" height="280" viewBox="0 0 100 140" style={{ overflow: 'visible' }}>
                <defs>
                  {/* Holographic Gradient - RAINBOW IRIDESCENT */}
                  <linearGradient id="holographic" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00d4ff" />
                    <stop offset="20%" stopColor="#7b2ff7" />
                    <stop offset="40%" stopColor="#f238ff" />
                    <stop offset="60%" stopColor="#ff6b9d" />
                    <stop offset="80%" stopColor="#ffd93d" />
                    <stop offset="100%" stopColor="#6bffa1" />
                  </linearGradient>

                  {/* Animated Shimmer */}
                  <linearGradient id="shimmer">
                    <stop offset="0%" stopColor="white" stopOpacity="0">
                      <animate attributeName="offset" values="-1;1" dur="3s" repeatCount="indefinite" />
                    </stop>
                    <stop offset="50%" stopColor="white" stopOpacity="0.8">
                      <animate attributeName="offset" values="-0.5;1.5" dur="3s" repeatCount="indefinite" />
                    </stop>
                    <stop offset="100%" stopColor="white" stopOpacity="0">
                      <animate attributeName="offset" values="0;2" dur="3s" repeatCount="indefinite" />
                    </stop>
                  </linearGradient>

                  {/* Stronger Glow */}
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>

                  {/* Chrome Reflection */}
                  <filter id="chrome">
                    <feGaussianBlur stdDeviation="2"/>
                    <feColorMatrix type="saturate" values="1.5"/>
                  </filter>
                </defs>

                {/* LEGS */}
                <motion.g animate={{ x: [-0.5, 0.5, -0.5] }} transition={{ repeat: Infinity, duration: 2 }}>
                  {/* Left Leg */}
                  <ellipse 
                    cx="42" cy="115" rx="6" ry="22" 
                    fill="url(#holographic)" 
                    opacity="0.85"
                    filter="url(#glow)"
                  />
                  <ellipse 
                    cx="42" cy="115" rx="6" ry="22" 
                    fill="url(#shimmer)" 
                    opacity="0.4"
                  />
                  {/* Foot */}
                  <ellipse 
                    cx="42" cy="132" rx="8" ry="4" 
                    fill="url(#holographic)" 
                    opacity="0.9"
                    filter="url(#glow)"
                  />

                  {/* Right Leg */}
                  <ellipse 
                    cx="58" cy="115" rx="6" ry="22" 
                    fill="url(#holographic)" 
                    opacity="0.85"
                    filter="url(#glow)"
                  />
                  <ellipse 
                    cx="58" cy="115" rx="6" ry="22" 
                    fill="url(#shimmer)" 
                    opacity="0.4"
                  />
                  {/* Foot */}
                  <ellipse 
                    cx="58" cy="132" rx="8" ry="4" 
                    fill="url(#holographic)" 
                    opacity="0.9"
                    filter="url(#glow)"
                  />
                </motion.g>

                {/* BODY (Torso) */}
                <ellipse 
                  cx="50" cy="80" rx="24" ry="35" 
                  fill="url(#holographic)" 
                  opacity="0.75"
                  filter="url(#glow)"
                />
                <ellipse 
                  cx="50" cy="80" rx="24" ry="35" 
                  fill="url(#shimmer)" 
                  opacity="0.5"
                />
                
                {/* Body Highlights */}
                <ellipse 
                  cx="45" cy="70" rx="8" ry="12" 
                  fill="white" 
                  opacity="0.2"
                  filter="url(#chrome)"
                />

                {/* LEFT ARM */}
                <motion.g 
                  variants={leftArmVariants}
                  animate={status}
                  style={{ transformOrigin: '32px 70px' }}
                >
                  <ellipse 
                    cx="32" cy="75" rx="5" ry="20" 
                    fill="url(#holographic)" 
                    opacity="0.8"
                    filter="url(#glow)"
                  />
                  <ellipse 
                    cx="32" cy="75" rx="5" ry="20" 
                    fill="url(#shimmer)" 
                    opacity="0.4"
                  />
                  {/* Hand */}
                  <circle 
                    cx="32" cy="92" r="5" 
                    fill="url(#holographic)" 
                    opacity="0.9"
                    filter="url(#glow)"
                  />
                </motion.g>

                {/* RIGHT ARM */}
                <motion.g 
                  variants={armVariants}
                  animate={status}
                  style={{ transformOrigin: '68px 70px' }}
                >
                  <ellipse 
                    cx="68" cy="75" rx="5" ry="20" 
                    fill="url(#holographic)" 
                    opacity="0.8"
                    filter="url(#glow)"
                  />
                  <ellipse 
                    cx="68" cy="75" rx="5" ry="20" 
                    fill="url(#shimmer)" 
                    opacity="0.4"
                  />
                  {/* Hand */}
                  <circle 
                    cx="68" cy="92" r="5" 
                    fill="url(#holographic)" 
                    opacity="0.9"
                    filter="url(#glow)"
                  />
                </motion.g>

                {/* NECK */}
                <ellipse 
                  cx="50" cy="52" rx="10" ry="8" 
                  fill="url(#holographic)" 
                  opacity="0.7"
                  filter="url(#glow)"
                />

                {/* HEAD */}
                <ellipse 
                  cx="50" cy="30" rx="28" ry="26" 
                  fill="url(#holographic)" 
                  opacity="0.85"
                  filter="url(#glow)"
                />
                <ellipse 
                  cx="50" cy="30" rx="28" ry="26" 
                  fill="url(#shimmer)" 
                  opacity="0.5"
                />
                
                {/* Head Highlight */}
                <ellipse 
                  cx="42" cy="22" rx="12" ry="10" 
                  fill="white" 
                  opacity="0.3"
                  filter="url(#chrome)"
                />

                {/* ANTENNA */}
                <motion.g
                  animate={{ rotate: [-8, 8, -8] }}
                  transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                  style={{ transformOrigin: '50px 12px' }}
                >
                  <line 
                    x1="50" y1="12" x2="50" y2="2" 
                    stroke="url(#holographic)" 
                    strokeWidth="2.5"
                    filter="url(#glow)"
                    opacity="0.9"
                  />
                  <circle 
                    cx="50" cy="1" r="3.5" 
                    fill="#00d4ff" 
                    filter="url(#glow)"
                  >
                    <animate attributeName="opacity" values="0.8;1;0.8" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                </motion.g>

                {/* EYES */}
                <motion.g variants={eyeVariants} animate={status}>
                  {/* Left Eye */}
                  <ellipse cx="40" cy="30" rx="5" ry="7" fill="#0a0a1f" />
                  <ellipse cx="41" cy="28" rx="2" ry="3" fill="#00d4ff" opacity="0.9" />
                  <circle cx="41.5" cy="27" r="1" fill="white" opacity="0.8" />
                  
                  {/* Right Eye */}
                  <ellipse cx="60" cy="30" rx="5" ry="7" fill="#0a0a1f" />
                  <ellipse cx="61" cy="28" rx="2" ry="3" fill="#00d4ff" opacity="0.9" />
                  <circle cx="61.5" cy="27" r="1" fill="white" opacity="0.8" />
                </motion.g>

                {/* MOUTH - Simple line that animates */}
                <motion.path
                  d={
                    status === 'IDLE' ? 'M40 42 Q50 46 60 42' :
                    status === 'NOTICED' ? 'M38 40 Q50 52 62 40' :
                    status === 'THINKING' ? 'M43 44 Q50 42 57 44' :
                    status === 'TALKING' ? 'M38 42 Q50 50 62 42' :
                    'M42 45 Q50 42 58 45'
                  }
                  fill="none"
                  stroke="url(#holographic)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  filter="url(#glow)"
                  opacity="0.9"
                  animate={status === 'TALKING' ? {
                    d: [
                      'M38 42 Q50 50 62 42',
                      'M38 40 Q50 52 62 40',
                      'M40 43 Q50 46 60 43'
                    ]
                  } : {}}
                  transition={status === 'TALKING' ? { repeat: Infinity, duration: 0.4 } : {}}
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
