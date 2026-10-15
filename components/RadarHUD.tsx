import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { audioService } from '../services/audioService';
import { haptics } from '../services/haptics';

interface RadarHUDProps {
  /** Something is nearby (spawned, not yet met). */
  active: boolean;
  /** Bearing of the alien relative to where you look, degrees, + = to your right. */
  delta: number | null;
  /** It's in view now: stop nagging, the Say hi timer is running. */
  spotted: boolean;
  /** Accent colour (variant). */
  accent?: string;
  /** Small line under the radar ("Scanning surroundings…", "Drag to look around"). */
  hint?: string | null;
}

/**
 * "Nearby" sonar: a small radar disc with a blip at the alien's bearing, plus
 * an edge glow + arrow on the side to turn toward. Pings get faster, louder
 * and higher as you face it; the ping is panned left/right; light haptics
 * when you're close.
 */
const RadarHUD: React.FC<RadarHUDProps> = ({ active, delta, spotted, accent = '#22d3ee', hint }) => {
  const abs = delta == null ? 180 : Math.min(180, Math.abs(delta));
  const closeness = active ? 1 - abs / 180 : 0;
  const live = useRef({ active, delta, spotted, closeness });
  live.current = { active, delta, spotted, closeness };

  // Ping loop
  useEffect(() => {
    let t: number;
    const tick = () => {
      const s = live.current;
      let wait = 1600;
      if (s.active && !s.spotted && s.delta != null) {
        const pan = Math.sin((Math.max(-90, Math.min(90, s.delta)) * Math.PI) / 180);
        audioService.ping(pan, s.closeness);
        if (s.closeness > 0.7) haptics.pulse(s.closeness > 0.85 ? 12 : 6);
        wait = 1700 - s.closeness * 1250;
      }
      t = window.setTimeout(tick, wait);
    };
    t = window.setTimeout(tick, 600);
    return () => clearTimeout(t);
  }, []);

  const side = delta == null ? 0 : delta > 0 ? 1 : -1;
  const offscreen = active && !spotted && delta != null && abs > 19;
  const glow = offscreen ? 0.15 + closeness * 0.65 : 0;
  const blipAngle = delta == null ? 0 : Math.max(-180, Math.min(180, delta));
  const pulseDur = 1.7 - closeness * 1.25;

  return (
    <>
      {/* Edge glow + arrow on the side to turn toward */}
      <AnimatePresence>
        {offscreen && (
          <motion.div
            key={`edge-${side}`}
            className="absolute top-0 bottom-0 z-[45] pointer-events-none"
            style={{
              [side > 0 ? 'right' : 'left']: 0,
              width: '22vw',
              maxWidth: 140,
              background: `linear-gradient(to ${side > 0 ? 'left' : 'right'}, ${accent}${Math.round(glow * 120)
                .toString(16)
                .padStart(2, '0')}, transparent)`
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [glow * 0.6, glow, glow * 0.6] }}
            exit={{ opacity: 0 }}
            transition={{ repeat: Infinity, duration: pulseDur }}
            data-testid="radar-edge"
            data-side={side > 0 ? 'right' : 'left'}
          >
            <div
              className="absolute top-1/2 -translate-y-1/2"
              style={{ [side > 0 ? 'right' : 'left']: 'max(6px, var(--sar))' }}
            >
              {side > 0 ? (
                <ChevronRight className="w-9 h-9" style={{ color: accent }} />
              ) : (
                <ChevronLeft className="w-9 h-9" style={{ color: accent }} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Radar disc */}
      <div
        className="absolute left-1/2 -translate-x-1/2 z-[55] flex flex-col items-center pointer-events-none"
        style={{ top: 'max(0.75rem, var(--sat))' }}
        data-testid="radar"
        data-active={active ? '1' : '0'}
        data-spotted={spotted ? '1' : '0'}
        data-delta={delta == null ? '' : delta.toFixed(1)}
      >
        <div
          className="relative w-14 h-14 rounded-full border bg-black/45 backdrop-blur-sm overflow-hidden"
          style={{ borderColor: active ? `${accent}99` : 'rgba(255,255,255,0.18)' }}
        >
          {/* range rings */}
          <div className="absolute inset-[22%] rounded-full border border-white/10" />
          <div className="absolute inset-[44%] rounded-full bg-white/40" />
          {/* forward cone */}
          <div
            className="absolute inset-0"
            style={{
              background: `conic-gradient(from -24deg, rgba(255,255,255,0.10) 0deg 48deg, transparent 48deg)`
            }}
          />
          {/* sweep */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: `conic-gradient(from 0deg, transparent 0deg 300deg, ${active ? accent : '#94a3b8'}55 360deg)`
            }}
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, ease: 'linear', duration: active ? Math.max(0.9, pulseDur * 1.6) : 4 }}
          />
          {/* blip */}
          {active && delta != null && (
            <div className="absolute inset-0" style={{ transform: `rotate(${blipAngle}deg)` }}>
              <motion.div
                className="absolute left-1/2 rounded-full"
                style={{
                  top: '9%',
                  width: 9,
                  height: 9,
                  marginLeft: -4.5,
                  background: accent,
                  boxShadow: `0 0 10px ${accent}`
                }}
                animate={{ scale: [1, 1.6, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ repeat: Infinity, duration: pulseDur }}
              />
            </div>
          )}
        </div>
        <p
          className="mt-1 text-[10px] font-signal uppercase whitespace-nowrap px-2 py-0.5 rounded-full bg-black/40"
          style={{ color: active ? accent : 'rgba(255,255,255,0.55)' }}
          data-testid="radar-label"
        >
          {spotted ? 'in view' : active ? (closeness > 0.8 ? 'very close' : closeness > 0.5 ? 'nearby' : 'faint signal') : 'listening'}
        </p>
        {hint && <p className="mt-1 text-[11px] text-white/70 bg-black/40 px-2 py-0.5 rounded-full whitespace-nowrap">{hint}</p>}
      </div>
    </>
  );
};

export default RadarHUD;
