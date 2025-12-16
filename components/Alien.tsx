import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlienStatus } from '../types';

interface AlienProps {
  isVisible: boolean;
  status: AlienStatus;
  position: { top: string; left: string };
  message?: string | null;
}

const Alien: React.FC<AlienProps> = ({ isVisible, status, position, message }) => {
  // Animation Variants
  const armVariants = {
    IDLE: { 
      rotate: [0, 20, -10, 0],
      transition: { repeat: Infinity, duration: 1.2, ease: "easeInOut" } 
    },
    HIT: { 
      rotate: 160, 
      y: -5,
      transition: { type: "spring", stiffness: 200 } 
    },
    MISSED: { 
      rotate: 130, 
      y: 0,
      transition: { duration: 0.3 } 
    },
    LISTENING: {
      rotate: 10,
      transition: { duration: 0.5 }
    },
    THINKING: {
      rotate: [10, 30, 10],
      transition: { repeat: Infinity, duration: 1 }
    },
    TALKING: {
      rotate: [10, 15, 10],
      transition: { repeat: Infinity, duration: 0.2 }
    }
  };

  const leftArmVariants = {
    IDLE: { 
      rotate: [5, -5, 5],
      transition: { repeat: Infinity, duration: 2, ease: "easeInOut" }
    },
    HIT: { 
      rotate: -160, 
      y: -5,
      transition: { type: "spring", stiffness: 200 }
    },
    MISSED: { 
      rotate: -130, 
      transition: { duration: 0.3 } 
    },
    LISTENING: {
      rotate: -20, // Hand to ear/head roughly
      transition: { duration: 0.5 }
    },
    THINKING: {
      rotate: -20,
      transition: { duration: 0.5 }
    },
    TALKING: {
      rotate: [-5, 5],
      transition: { repeat: Infinity, duration: 0.5 }
    }
  };

  const mouthVariants = {
    IDLE: { d: "M38 62 Q50 68 62 62" }, // Smile
    HIT: { d: "M35 60 Q50 80 65 60" }, // Big open mouth
    MISSED: { d: "M40 65 Q50 60 60 65" }, // Frown
    LISTENING: { d: "M42 64 Q50 64 58 64" }, // Neutral small mouth
    THINKING: { d: "M45 65 Q50 60 55 65" }, // O shape small
    TALKING: { 
      d: ["M38 62 Q50 68 62 62", "M38 60 Q50 75 62 60", "M40 64 Q50 60 60 64"],
      transition: { repeat: Infinity, duration: 0.2 }
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <div
          className="absolute w-40 h-40"
          style={{ 
            top: position.top, 
            left: position.left, 
            transform: 'translate(-50%, -50%)', 
            zIndex: 10 
          }}
        >
          {/* Portal Effect - Spins faster when Hit/Leaving */}
          <motion.div
            initial={{ scale: 0, opacity: 0, rotate: 0 }}
            animate={{ scale: 1, opacity: 1, rotate: 360 }}
            exit={{ scale: 0, opacity: 0, rotate: 720, transition: { duration: 0.4 } }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="w-40 h-40 rounded-full border-4 border-dashed border-cyan-400 opacity-60 animate-spin-slow shadow-[0_0_30px_rgba(34,211,238,0.6)]" />
            <div className="absolute w-32 h-32 rounded-full bg-cyan-900/40 blur-xl" />
          </motion.div>

          {/* Speech Bubble */}
          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="absolute -top-32 left-1/2 -translate-x-1/2 bg-white/90 text-black px-4 py-3 rounded-2xl rounded-bl-none shadow-[0_0_15px_rgba(255,255,255,0.3)] w-48 z-20"
              >
                <p className="text-sm font-mono font-bold leading-tight">{message}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Alien Character */}
          <motion.div
            initial={{ y: 50, scale: 0 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 50, scale: 0, transition: { duration: 0.3 } }}
            transition={{ delay: 0.2, type: 'spring', damping: 12, stiffness: 200 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            {/* Hovering Animation */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
              <svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <radialGradient id="bodyGrad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(50 50) rotate(90) scale(50)">
                    <stop stopColor="#4ADE80" />
                    <stop offset="1" stopColor="#166534" />
                  </radialGradient>
                </defs>

                {/* Left Arm */}
                <motion.g 
                  initial="IDLE"
                  animate={status}
                  variants={leftArmVariants}
                  style={{ originX: '70%', originY: '10%' }}
                  x="20" y="55"
                >
                  <path d="M25 55 C15 65 10 50 10 40" stroke="#4ADE80" strokeWidth="6" strokeLinecap="round" />
                  <circle cx="10" cy="40" r="4" fill="#A3E635" />
                </motion.g>

                {/* Right Arm */}
                <motion.g 
                  initial="IDLE"
                  animate={status}
                  variants={armVariants}
                  style={{ originX: '30%', originY: '10%' }}
                  x="80" y="55"
                >
                  <path d="M75 55 C85 65 90 50 90 40" stroke="#4ADE80" strokeWidth="6" strokeLinecap="round" />
                  <circle cx="90" cy="40" r="4" fill="#A3E635" />
                </motion.g>

                {/* Body */}
                <ellipse cx="50" cy="60" rx="30" ry="25" fill="url(#bodyGrad)" />
                
                {/* Head */}
                <circle cx="50" cy="40" r="22" fill="#4ADE80" stroke="#166534" strokeWidth="2" />
                
                {/* Antennas */}
                <path d="M40 22 L35 10" stroke="#4ADE80" strokeWidth="3" strokeLinecap="round" />
                <circle cx="35" cy="10" r="3" fill="#A3E635" />
                <motion.circle cx="35" cy="10" r="3" fill="#fff" animate={{ opacity: [0, 0.8, 0] }} transition={{ duration: 1.5, repeat: Infinity }} />
                
                <path d="M60 22 L65 10" stroke="#4ADE80" strokeWidth="3" strokeLinecap="round" />
                <circle cx="65" cy="10" r="3" fill="#A3E635" />
                <motion.circle cx="65" cy="10" r="3" fill="#fff" animate={{ opacity: [0, 0.8, 0] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }} />

                {/* Face */}
                <g transform="translate(0, 0)">
                   {/* Eyes */}
                  <ellipse cx="42" cy="38" rx="6" ry="8" fill="#111" />
                  <circle cx="44" cy="35" r="2.5" fill="white" />
                  
                  <ellipse cx="58" cy="38" rx="6" ry="8" fill="#111" />
                  <circle cx="60" cy="35" r="2.5" fill="white" />
                  
                  {/* Blinking Eyelids */}
                  <motion.ellipse cx="42" cy="38" rx="6" ry="0" fill="#4ADE80" 
                    animate={{ ry: [0, 0, 8, 0, 0] }} 
                    transition={{ duration: 4, times: [0, 0.9, 0.95, 0.98, 1], repeat: Infinity }}
                  />
                  <motion.ellipse cx="58" cy="38" rx="6" ry="0" fill="#4ADE80" 
                    animate={{ ry: [0, 0, 8, 0, 0] }} 
                    transition={{ duration: 4, times: [0, 0.9, 0.95, 0.98, 1], repeat: Infinity }}
                  />

                  {/* Mouth */}
                  <motion.path 
                    fill="none" 
                    stroke="#166534" 
                    strokeWidth="3" 
                    strokeLinecap="round"
                    variants={mouthVariants}
                    initial="IDLE"
                    animate={status}
                  />
                </g>
              </svg>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Alien;