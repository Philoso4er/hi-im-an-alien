import React, { useEffect, useRef } from 'react';
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

/** Map gameplay status → glTF animation clip name on public/models/alien.glb */
const STATUS_CLIP: Record<AlienStatus, string> = {
  IDLE: 'IDLE',
  NOTICED: 'NOTICED',
  LISTENING: 'LISTENING',
  THINKING: 'THINKING',
  TALKING: 'TALKING',
  MISSED: 'MISSED',
};

const Alien: React.FC<AlienProps> = ({
  isVisible,
  status,
  position,
  offsetX = 0,
  offsetY = 0,
  message
}) => {
  const viewerRef = useRef<any>(null);
  const topPercent = parseFloat(position.top);
  const depthNorm = clamp((topPercent - 20) / 40, 0, 1);

  const scale = 0.85 + depthNorm * 0.3;
  const blur = (1 - depthNorm) * 0.5;

  useEffect(() => {
    const el = viewerRef.current;
    if (!el) return;
    const clip = STATUS_CLIP[status] ?? 'IDLE';
    el.animationName = clip;
    // Restart so status changes always feel snappy
    if (typeof el.play === 'function') {
      try {
        el.play({ repetitions: Infinity });
      } catch {
        el.play?.();
      }
    }
  }, [status, isVisible]);

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
            width: '220px',
            height: '340px'
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
              scale: status === 'MISSED' ? 0.85 : 1,
              opacity: status === 'MISSED' ? 0.45 : 1
            }}
            exit={{ y: 60, scale: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 0.15 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <model-viewer
              ref={viewerRef}
              src="/models/alien.glb"
              alt="Psychedelic marble alien"
              animation-name={STATUS_CLIP[status]}
              autoplay
              shadow-intensity="0"
              exposure="1.15"
              environment-image="neutral"
              interaction-prompt="none"
              disable-zoom
              camera-orbit="0deg 78deg 2.6m"
              camera-target="0m 0.95m 0m"
              field-of-view="28deg"
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: 'transparent',
                pointerEvents: 'none',
                // @ts-ignore CSS custom property
                '--poster-color': 'transparent'
              }}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Alien;
