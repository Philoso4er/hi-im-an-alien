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
  const topPercent = parseFloat(position.top);
  const depthNorm = clamp((topPercent - 20) / 40, 0, 1);

  const scale = 0.85 + depthNorm * 0.3;
  const blur = (1 - depthNorm) * 0.6; // reduced so shading detail survives
  const bodyVariants = {
    IDLE: {
      y: [0, -6, 0],
      rotate: [0, 1.5, -1.5, 0],
      transition: { repeat: Infinity, duration: 4, ease: 'easeInOut' }
    },
    NOTICED: {
      scale: 1.1,
      y: -10,
      transition: { type: 'spring', stiffness: 300, damping: 15 }
    },
    LISTENING: { scale: 1.03, transition: { duration: 0.3 } },
    THINKING: {
      scale: [1.03, 1.06, 1.03],
      rotate: [0, 3, -3, 0],
      transition: { repeat: Infinity, duration: 2 }
    },
    TALKING: { y: [0, -3, 0], transition: { repeat: Infinity, duration: 0.8 } },
    MISSED: { scale: 0.85, opacity: 0.4, y: 20, transition: { duration: 0.6 } }
  };

  // RIGHT ARM — relaxed, single segment, pivots at shoulder joint
  const rightUpperArmVariants = {
    IDLE: { rotate: [6, 12, 6], transition: { repeat: Infinity, duration: 3.5, ease: 'easeInOut' } },
    NOTICED: { rotate: 70, transition: { type: 'spring', stiffness: 250, damping: 12 } },
    LISTENING: { rotate: 20 },
    THINKING: { rotate: [20, 30, 20], transition: { repeat: Infinity, duration: 1.5 } },
    TALKING: { rotate: [15, 25, 15], transition: { repeat: Infinity, duration: 0.7 } },
    MISSED: { rotate: 35, opacity: 0.4 }
  };

  // LEFT ARM — upper segment holds the raised wave position
  const leftUpperArmVariants = {
    IDLE: { rotate: -100, transition: { type: 'spring', stiffness: 120, damping: 14 } },
    NOTICED: { rotate: -115, transition: { type: 'spring', stiffness: 250, damping: 12 } },
    LISTENING: { rotate: -95 },
    THINKING: { rotate: -60 },
    TALKING: { rotate: -100 },
    MISSED: { rotate: -20, opacity: 0.4, transition: { duration: 0.6 } }
  };

  // LEFT ARM — forearm segment: actual back-and-forth wave motion at the elbow
  const leftForearmVariants = {
    IDLE: {
      rotate: [-15, 15, -15],
      transition: { repeat: Infinity, duration: 1.1, ease: 'easeInOut' }
    },
    NOTICED: {
      rotate: [-20, 20, -20],
      transition: { repeat: Infinity, duration: 0.5 }
    },
    LISTENING: { rotate: 0 },
    THINKING: { rotate: 10 },
    TALKING: { rotate: [-10, 10, -10], transition: { repeat: Infinity, duration: 0.6 } },
    MISSED: { rotate: 0 }
  };

  const eyeVariants = {
    IDLE: { scaleY: 1 },
    NOTICED: { scaleY: 1.2, scaleX: 1.05 },
    LISTENING: { scaleY: 1.05 },
    THINKING: {
      scaleY: [1, 0.15, 1],
      transition: { repeat: Infinity, duration: 2.5, repeatDelay: 0.8 }
    },
    TALKING: { scaleY: [1, 1.05, 1], transition: { repeat: Infinity, duration: 0.5 } },
    MISSED: { scaleY: 0.3, opacity: 0.5 }
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
            height: '300px'
          }}
        >
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

          <motion.div
            initial={{ y: 60, scale: 0, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 60, scale: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 0.2 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <motion.div variants={bodyVariants} animate={status}>
              <svg width="200" height="300" viewBox="0 0 100 150" style={{ overflow: 'visible' }}>
                <defs>
                  <radialGradient id="skinBase" cx="35%" cy="30%" r="75%">
                    <stop offset="0%" stopColor="#8fd8d0" />
                    <stop offset="55%" stopColor="#5bb8b0" />
                    <stop offset="100%" stopColor="#3a8f8a" />
                  </radialGradient>

                  <linearGradient id="iridescent" x1="10%" y1="0%" x2="90%" y2="100%">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="25%" stopColor="#a855f7" />
                    <stop offset="50%" stopColor="#ec4899" />
                    <stop offset="75%" stopColor="#eab308" />
                    <stop offset="100%" stopColor="#4ade80" />
                  </linearGradient>

                  <radialGradient id="volumeShade" cx="40%" cy="35%" r="70%">
                    <stop offset="0%" stopColor="#000000" stopOpacity="0" />
                    <stop offset="70%" stopColor="#000000" stopOpacity="0" />
                    <stop offset="100%" stopColor="#0a2e2c" stopOpacity="0.55" />
                  </radialGradient>

                  <radialGradient id="glossHighlight" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                  </radialGradient>

                  <radialGradient id="groundShadow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#000000" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* GROUND SHADOW */}
                <ellipse cx="50" cy="144" rx="26" ry="6" fill="url(#groundShadow)" />

                {/* LEGS */}
                <motion.g animate={{ x: [-0.3, 0.3, -0.3] }} transition={{ repeat: Infinity, duration: 2 }}>
                  <ellipse cx="43" cy="118" rx="6.5" ry="23" fill="url(#skinBase)" />
                  <ellipse cx="43" cy="118" rx="6.5" ry="23" fill="url(#iridescent)" opacity="0.35" />
                  <ellipse cx="43" cy="118" rx="6.5" ry="23" fill="url(#volumeShade)" />
                  <ellipse cx="43" cy="136" rx="8" ry="4" fill="url(#skinBase)" />
                  <ellipse cx="43" cy="136" rx="8" ry="4" fill="url(#volumeShade)" />

                  <ellipse cx="57" cy="118" rx="6.5" ry="23" fill="url(#skinBase)" />
                  <ellipse cx="57" cy="118" rx="6.5" ry="23" fill="url(#iridescent)" opacity="0.35" />
                  <ellipse cx="57" cy="118" rx="6.5" ry="23" fill="url(#volumeShade)" />
                  <ellipse cx="57" cy="136" rx="8" ry="4" fill="url(#skinBase)" />
                  <ellipse cx="57" cy="136" rx="8" ry="4" fill="url(#volumeShade)" />
                </motion.g>

                {/* TORSO */}
                <ellipse cx="50" cy="83" rx="21" ry="31" fill="url(#skinBase)" />
                <ellipse cx="50" cy="83" rx="21" ry="31" fill="url(#iridescent)" opacity="0.4" />
                <ellipse cx="50" cy="83" rx="21" ry="31" fill="url(#volumeShade)" />
                <ellipse cx="42" cy="70" rx="7" ry="10" fill="url(#glossHighlight)" />

                {/* RIGHT ARM — translated to shoulder (67,62), rotates around local (0,0) */}
                <g transform="translate(67, 62)">
                  <motion.g
                    variants={rightUpperArmVariants}
                    animate={status}
                    style={{ transformOrigin: '0px 0px' }}
                  >
                    <path d="M 0 0 Q 7 12 3 30" fill="none" stroke="url(#skinBase)" strokeWidth="11" strokeLinecap="round" />
                    <path d="M 0 0 Q 7 12 3 30" fill="none" stroke="url(#iridescent)" strokeWidth="11" strokeLinecap="round" opacity="0.3" />
                    <circle cx="3" cy="31" r="5.5" fill="url(#skinBase)" />
                    <circle cx="3" cy="31" r="5.5" fill="url(#volumeShade)" />
                  </motion.g>
                </g>

                {/* LEFT ARM — translated to shoulder (33,62). Upper arm rotates at local (0,0). */}
                <g transform="translate(33, 62)">
                  <motion.g
                    variants={leftUpperArmVariants}
                    animate={status}
                    style={{ transformOrigin: '0px 0px' }}
                  >
                    <path d="M 0 0 Q -5 10 -3 18" fill="none" stroke="url(#skinBase)" strokeWidth="11" strokeLinecap="round" />
                    <path d="M 0 0 Q -5 10 -3 18" fill="none" stroke="url(#iridescent)" strokeWidth="11" strokeLinecap="round" opacity="0.3" />

                    {/* Forearm: translated to elbow (-3,18) IN THE UPPER ARM'S ROTATED FRAME — 
                        this is what makes the two segments stay physically connected as the shoulder rotates */}
                    <g transform="translate(-3, 18)">
                      <motion.g
                        variants={leftForearmVariants}
                        animate={status}
                        style={{ transformOrigin: '0px 0px' }}
                      >
                        <path d="M 0 0 Q -8 -8 -12 -22" fill="none" stroke="url(#skinBase)" strokeWidth="9" strokeLinecap="round" />
                        <path d="M 0 0 Q -8 -8 -12 -22" fill="none" stroke="url(#iridescent)" strokeWidth="9" strokeLinecap="round" opacity="0.3" />
                        <circle cx="-13" cy="-24" r="6" fill="url(#skinBase)" />
                        <circle cx="-13" cy="-24" r="6" fill="url(#volumeShade)" />
                        <path d="M -16 -29 L -18 -33" stroke="url(#skinBase)" strokeWidth="2.5" strokeLinecap="round" />
                        <path d="M -13 -30 L -13 -35" stroke="url(#skinBase)" strokeWidth="2.5" strokeLinecap="round" />
                        <path d="M -10 -29 L -8 -33" stroke="url(#skinBase)" strokeWidth="2.5" strokeLinecap="round" />
                      </motion.g>
                    </g>
                  </motion.g>
                </g>

                {/* NECK */}
                <ellipse cx="50" cy="56" rx="9" ry="9" fill="url(#skinBase)" />
                <ellipse cx="50" cy="56" rx="9" ry="9" fill="url(#volumeShade)" />

                {/* HEAD */}
                <ellipse cx="50" cy="30" rx="27" ry="25" fill="url(#skinBase)" />
                <ellipse cx="50" cy="30" rx="27" ry="25" fill="url(#iridescent)" opacity="0.4" />
                <ellipse cx="50" cy="30" rx="27" ry="25" fill="url(#volumeShade)" />
                <ellipse cx="41" cy="20" rx="13" ry="11" fill="url(#glossHighlight)" />

                {/* EYES */}
                <motion.g variants={eyeVariants} animate={status}>
                  <path d="M 30 28 Q 30 20 41 21 Q 44 29 41 36 Q 32 37 30 28 Z" fill="#1a1a1a" />
                  <ellipse cx="35" cy="25" rx="2.5" ry="1.8" fill="#ffffff" opacity="0.55" />

                  <path d="M 70 28 Q 70 20 59 21 Q 56 29 59 36 Q 68 37 70 28 Z" fill="#1a1a1a" />
                  <ellipse cx="65" cy="25" rx="2.5" ry="1.8" fill="#ffffff" opacity="0.55" />
                </motion.g>

                {/* MOUTH */}
                <motion.path
                  d={
                    status === 'IDLE' ? 'M42 42 Q50 45 58 42' :
                    status === 'NOTICED' ? 'M40 41 Q50 47 60 41' :
                    status === 'THINKING' ? 'M44 43 Q50 42 56 43' :
                    status === 'TALKING' ? 'M40 42 Q50 47 60 42' :
                    'M44 44 Q50 42 56 44'
                  }
                  fill="none"
                  stroke="#1a1a1a"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  opacity="0.75"
                  animate={status === 'TALKING' ? {
                    d: [
                      'M40 42 Q50 47 60 42',
                      'M40 41 Q50 48 60 41',
                      'M42 43 Q50 45 58 43'
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
