import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlienStatus } from '../types';
import { GifPlayer, preloadGif } from '../services/gifPlayer';
import { ALIEN_GIFS, ConversationPhase, StageLayout } from './alienStage';

export type AlienScene = 'peek' | 'conversation';

interface AlienProps {
  player: GifPlayer;
  isVisible: boolean;
  status: AlienStatus;
  scene: AlienScene;
  phase: ConversationPhase;
  layout: StageLayout;
  /** 'dom' = draw here (camera-feed fallback). 'xr' = the WebXR stage draws it. */
  renderTarget: 'dom' | 'xr';
  message?: string | null;
  /** Where to put the speech bubble in XR mode (screen px of the alien's head). */
  xrBubbleAnchor?: { x: number; y: number } | null;
  onWalkInDone?: () => void;
  onWalkOutDone?: () => void;
}

const WALK_IN = { speed: 1.7, maxDelay: 120 };
const WALK_OUT = { speed: 1.25, maxDelay: 160 };

/**
 * Drives the GIF player from game state:
 *  - peek scene: loop peek-wave (it slides in/out behind the screen edge)
 *  - walk-in: play walk-gesture up to the gesture frame, then hold
 *  - hold: frozen on the gesture frame while the chat is open
 *  - walk-out: play the rest (wave goodbye + walk off), then report done
 */
function useAlienPlayback(props: AlienProps) {
  const { player, isVisible, scene, phase } = props;
  const cbs = useRef(props);
  cbs.current = props;

  useEffect(() => {
    if (!isVisible) return;
    let cancelled = false;

    if (scene === 'peek') {
      preloadGif(ALIEN_GIFS.walk.url); // warm up for the conversation
      player.load(ALIEN_GIFS.peek.url, ALIEN_GIFS.peek.floorFrac).then(ok => {
        if (ok && !cancelled) player.loop();
      });
    } else {
      const meta = ALIEN_GIFS.walk;
      const freshLoad = player.url !== meta.url;
      player.load(meta.url, meta.floorFrac).then(ok => {
        if (!ok || cancelled) return;
        if (phase === 'walk-in') {
          if (freshLoad || player.index > meta.gestureFrame) player.hold(0);
          player.playTo(meta.gestureFrame, {
            ...WALK_IN,
            onDone: () => !cancelled && cbs.current.onWalkInDone?.()
          });
        } else if (phase === 'hold') {
          player.hold(meta.gestureFrame);
        } else if (phase === 'walk-out') {
          if (player.index < meta.gestureFrame) player.hold(meta.gestureFrame);
          player.playToEnd({
            ...WALK_OUT,
            onDone: () => !cancelled && cbs.current.onWalkOutDone?.()
          });
        }
      });
    }
    return () => {
      cancelled = true;
    };
  }, [player, isVisible, scene, phase]);
}

/** Mounts the player's canvas into this element. */
const CanvasHost: React.FC<{ player: GifPlayer; style?: React.CSSProperties }> = ({ player, style }) => {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const host = ref.current;
    if (!host) return;
    const c = player.canvas;
    c.style.width = '100%';
    c.style.height = '100%';
    c.style.display = 'block';
    host.appendChild(c);
    return () => {
      if (c.parentElement === host) host.removeChild(c);
    };
  }, [player]);
  return <div ref={ref} style={{ position: 'absolute', inset: 0, ...style }} />;
};

/**
 * Soft contact shadow that follows the feet in the current frame, so the alien
 * reads as standing on the floor instead of floating.
 */
const ContactShadow: React.FC<{ player: GifPlayer; floorFrac: number; minWidthPct: number }> = ({
  player,
  floorFrac,
  minWidthPct
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const update = () => {
      const el = ref.current;
      if (!el) return;
      const f = player.feet;
      const w = player.canvas.width || 1;
      if (!f || !player.data) {
        el.style.opacity = '0';
        return;
      }
      const widthPct = Math.max(minWidthPct, ((f.halfWidth * 2) / w) * 100 * 2.6);
      el.style.opacity = '1';
      el.style.left = `${(f.cx / w) * 100}%`;
      el.style.width = `${widthPct}%`;
    };
    update();
    return player.subscribe(update);
  }, [player, minWidthPct]);

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top: `${floorFrac * 100}%`,
        left: '50%',
        width: `${minWidthPct}%`,
        aspectRatio: '4 / 1',
        transform: 'translate(-50%, -58%)',
        borderRadius: '50%',
        background:
          'radial-gradient(closest-side, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 30%, rgba(0,0,0,0.25) 65%, rgba(0,0,0,0) 100%)',
        filter: 'blur(1.5px)',
        opacity: 0,
        transition: 'left 60ms linear, width 60ms linear, opacity 120ms linear',
        pointerEvents: 'none'
      }}
    />
  );
};

const SpeechBubble: React.FC<{ message: string; style: React.CSSProperties }> = ({ message, style }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.6, y: 12 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.6 }}
    className="absolute bg-white/95 text-gray-900 px-4 py-3 rounded-2xl rounded-br-none shadow-2xl border-2 border-purple-200"
    style={{ transformOrigin: 'bottom right', zIndex: 40, ...style }}
  >
    <p className="text-sm font-medium leading-relaxed">{message}</p>
  </motion.div>
);

const Alien: React.FC<AlienProps> = props => {
  const { player, isVisible, status, scene, layout, renderTarget, message, xrBubbleAnchor } = props;
  useAlienPlayback(props);

  const peek = layout.peek;
  const walk = layout.walk;
  // In desktop-sized layouts the walk canvas edge is inside the screen; fade it
  // so the alien doesn't pop in/out at a hard line.
  const walkEdgeInside = walk.canvas.left + walk.canvas.width < layout.vw - 2;

  const bubbleStyle: React.CSSProperties =
    renderTarget === 'xr' && xrBubbleAnchor
      ? {
          right: Math.max(12, layout.vw - xrBubbleAnchor.x),
          bottom: Math.max(12, layout.vh - xrBubbleAnchor.y + 10),
          width: layout.bubble.width
        }
      : { right: layout.bubble.right, bottom: layout.bubble.bottom, width: layout.bubble.width };

  return (
    // Full-screen clip: anything past the screen edge is hidden, which is what
    // lets the alien peek in from (and retreat behind) the side of the frame.
    // In conversation it sits above the chat panel (pointer-events stay off) so
    // the upturned palms overlap the panel's corner as if presenting it.
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: scene === 'conversation' ? 60 : 20 }}
    >
      {renderTarget === 'dom' && (
        <AnimatePresence>
          {isVisible && scene === 'peek' && (
            <motion.div
              key="peek"
              className="absolute"
              style={{
                left: peek.canvas.left,
                top: peek.canvas.top,
                width: peek.canvas.width,
                height: peek.canvas.height
              }}
              initial={{ x: peek.hiddenShift }}
              animate={{ x: status === 'MISSED' ? peek.hiddenShift : 0 }}
              exit={{ x: peek.hiddenShift, transition: { duration: 0.35 } }}
              transition={{ type: 'spring', damping: 24, stiffness: 140 }}
            >
              <ContactShadow player={player} floorFrac={ALIEN_GIFS.peek.floorFrac} minWidthPct={52} />
              <CanvasHost player={player} />
            </motion.div>
          )}

          {isVisible && scene === 'conversation' && (
            <motion.div
              key="walk"
              className="absolute"
              style={{
                left: walk.canvas.left,
                top: walk.canvas.top,
                width: walk.canvas.width,
                height: walk.canvas.height,
                WebkitMaskImage: walkEdgeInside
                  ? 'linear-gradient(to right, black 82%, transparent 99%)'
                  : undefined,
                maskImage: walkEdgeInside ? 'linear-gradient(to right, black 82%, transparent 99%)' : undefined
              }}
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
            >
              <ContactShadow player={player} floorFrac={ALIEN_GIFS.walk.floorFrac} minWidthPct={26} />
              <CanvasHost player={player} />
            </motion.div>
          )}
        </AnimatePresence>
      )}

      <AnimatePresence>
        {isVisible && message && <SpeechBubble key="bubble" message={message} style={bubbleStyle} />}
      </AnimatePresence>
    </div>
  );
};

export default Alien;
