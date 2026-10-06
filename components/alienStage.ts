import { useEffect, useState } from 'react';

/**
 * Measurements taken from the GIF frames themselves (see contact sheets in the
 * PR). Everything is expressed as fractions of the GIF's width/height so the
 * same numbers work for the DOM fallback and the WebXR billboard plane.
 */
export const ALIEN_GIFS = {
  /** Leans out from behind an edge on the RIGHT side of the frame and waves. */
  peek: {
    url: '/aliens/peek-wave.gif',
    width: 222,
    height: 480,
    floorFrac: 462 / 480, // feet touch the floor here
    topFrac: 90 / 480, // top of head
    leftFrac: 53 / 222, // left-most visible pixel (waving hand)
    feetFracX: 206 / 222 // feet sit right by the edge it's hiding behind
  },
  /** Walks in from the right, presents to the left (gesture), waves, walks out right. */
  walk: {
    url: '/aliens/walk-gesture.gif',
    width: 480,
    height: 480,
    floorFrac: 459 / 480,
    topFrac: 38 / 480,
    feetFracX: 0.69, // where the feet are while holding the gesture
    headLeftFrac: 0.54, // left edge of the head at the gesture frame
    bodyRightFrac: 0.8, // right edge of the body at the gesture frame
    palmFrac: 0.485, // height of the upturned palms at the gesture frame
    handTipFrac: 0.39, // tip of the extended hands at the gesture frame
    /**
     * Frame 88: both arms fully extended to the alien's left (screen left),
     * palms up, "presenting" something. Frames ~80–100 are the plateau of the
     * gesture; 88 is the middle of it with the widest reach.
     */
    gestureFrame: 88
  },
  /** Still shipped, not used for the main flow any more. */
  standing: {
    url: '/aliens/standing.gif'
  }
} as const;

/** Approximate real-world height of the alien in metres (WebXR mode). */
export const ALIEN_HEIGHT_M = 1.1;

export type ConversationPhase = 'none' | 'walk-in' | 'hold' | 'walk-out';

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface StageLayout {
  vw: number;
  vh: number;
  peek: { canvas: Rect; floorY: number; hiddenShift: number };
  walk: { canvas: Rect; floorY: number };
  chat: Rect;
  bubble: { right: number; bottom: number; width: number };
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Height reserved at the bottom of the screen for the "Say Hi" button block. */
const SAY_HI_RESERVE = 172;

export function computeStageLayout(vw: number, vh: number, keyboardVh?: number): StageLayout {
  // ---- Peek (Idle / Noticed): standing on the floor, peeking in from the right edge.
  // Its feet are higher up the screen than in the conversation (above the Say Hi
  // button), so it's drawn a bit smaller — i.e. a little further away — and
  // then walks in closer when you talk to it.
  const peekMeta = ALIEN_GIFS.peek;
  const peekAlienH = clamp(Math.min(vh * 0.3, vw * 0.8), 170, 320);
  const peekH = peekAlienH / (peekMeta.floorFrac - peekMeta.topFrac);
  const peekW = (peekH * peekMeta.width) / peekMeta.height;
  const peekFloor = vh - SAY_HI_RESERVE;
  const peekCanvas: Rect = {
    left: vw - peekW,
    top: peekFloor - peekMeta.floorFrac * peekH,
    width: peekW,
    height: peekH
  };
  // Slide far enough right that everything (incl. the shadow) is behind the edge.
  const peekHidden = peekW * (1 - peekMeta.leftFrac) + 24;

  // ---- Conversation: alien stands bottom-right, presents the chat panel to its side.
  const w = ALIEN_GIFS.walk;
  const margin = vw < 500 ? 12 : 24;
  const walkFloor = vh - (vw < 500 ? 22 : 32);
  const walkAlienH = clamp(Math.min(vh * 0.33, vw * 0.75), 170, 340);
  const S = walkAlienH / (w.floorFrac - w.topFrac);
  const alienSideW = (w.bodyRightFrac - w.headLeftFrac) * S;
  const gap = 8;
  const panelW = clamp(vw - margin * 2 - gap - alienSideW, 220, 400);
  const groupW = panelW + gap + alienSideW;
  let panelLeft = Math.max(margin, (vw - groupW) / 2);
  let walkLeft = panelLeft + panelW + gap - w.headLeftFrac * S;
  // The alien walks in from / out to the right edge of its GIF frame. Keep that
  // edge at (or past) the screen edge so it enters and leaves from off-screen
  // instead of popping in mid-floor on wide screens.
  if (walkLeft + S < vw) {
    walkLeft = vw - S;
    panelLeft = walkLeft + w.headLeftFrac * S - gap - panelW;
  }
  const walkTop = walkFloor - w.floorFrac * S;
  const walkCanvas: Rect = { left: walkLeft, top: walkTop, width: S, height: S };

  // Panel rests just above the upturned palms, so the alien looks like it's presenting it.
  let chatBottom = walkTop + w.palmFrac * S;
  const topSafe = 16;
  let chatTop = Math.max(topSafe, chatBottom - 560);
  if (keyboardVh && keyboardVh < vh - 120) {
    // On-screen keyboard open: keep the input above it.
    chatBottom = Math.min(chatBottom, keyboardVh - 8);
    chatTop = Math.max(topSafe, Math.min(chatTop, chatBottom - 260));
  }
  const chat: Rect = {
    left: panelLeft,
    top: chatTop,
    width: panelW,
    height: Math.max(200, chatBottom - chatTop)
  };

  const headTop = walkTop + w.topFrac * S;
  const bubble = {
    right: Math.max(margin, vw - (walkLeft + w.bodyRightFrac * S) - 10),
    bottom: vh - headTop + 10,
    width: Math.min(260, vw - margin * 2)
  };

  return {
    vw,
    vh,
    peek: { canvas: peekCanvas, floorY: peekFloor, hiddenShift: peekHidden },
    walk: { canvas: walkCanvas, floorY: walkFloor },
    chat,
    bubble
  };
}

/** Chat panel placement in WebXR mode, next to the alien's projected screen position. */
export function computeXRChatRect(
  layout: StageLayout,
  anchor: { x: number; y: number; height: number } | null
): Rect {
  if (!anchor) return layout.chat;
  const { vw, vh } = layout;
  const margin = 12;
  // The alien presents to its left (screen left) — put the panel there.
  const right = clamp(anchor.x - anchor.height * 0.15, 220 + margin, vw - margin);
  const width = clamp(right - margin, 220, 400);
  const left = Math.max(margin, right - width);
  const bottom = clamp(anchor.y, 260, vh - margin);
  const top = Math.max(16, bottom - 520);
  return { left, top, width, height: bottom - top };
}

export function useViewport() {
  const read = () => ({
    vw: window.innerWidth,
    vh: window.innerHeight,
    visualH: window.visualViewport ? window.visualViewport.height : window.innerHeight
  });
  const [vp, setVp] = useState(read);
  useEffect(() => {
    const onResize = () => setVp(read());
    window.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
    };
  }, []);
  return vp;
}
