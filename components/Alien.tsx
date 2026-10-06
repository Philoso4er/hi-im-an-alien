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

/**
 * GIF sticker mapping by gameplay status.
 *  - peek-wave: peeks from edge + waves
 *  - standing: full/attentive presence
 *  - walk-gesture: walks in, gestures, waves, walks off
 */
const STATUS_GIF: Record<AlienStatus, string> = {
  IDLE: '/aliens/peek-wave.gif',
  NOTICED: '/aliens/peek-wave.gif',
  LISTENING: '/aliens/standing.gif',
  THINKING: '/aliens/standing.gif',
  TALKING: '/aliens/walk-gesture.gif',
  MISSED: '/aliens/walk-gesture.gif',
};

const STATUS_ALT: Record<AlienStatus, string> = {
  IDLE: 'Alien peeking and waving',
  NOTICED: 'Alien peeking and waving hello',
  LISTENING: 'Alien standing and listening',
  THINKING: 'Alien standing and thinking',
  TALKING: 'Alien walking and gesturing',
  MISSED: 'Alien walking away',
};

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
  const blur = (1 - depthNorm) * 0.5;
  const gifSrc = STATUS_GIF[status] ?? STATUS_GIF.IDLE;
  // Square walk-gesture needs a wider box; peek/standing are tall stickers
  const isWide = gifSrc.includes('walk-gesture');

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
            width: isWide ? '280px' : '160px',
            height: isWide ? '280px' : '340px'
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
            animate={{
              y: status === 'MISSED' ? 24 : 0,
              scale: status === 'MISSED' ? 0.9 : 1,
              opacity: status === 'MISSED' ? 0.55 : 1
            }}
            exit={{ y: 60, scale: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 0.15 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {/* key remounts the img so the GIF restarts on status change */}
            <img
              key={gifSrc + status}
              src={gifSrc}
              alt={STATUS_ALT[status]}
              draggable={false}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                pointerEvents: 'none',
                userSelect: 'none'
              }}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Alien;
