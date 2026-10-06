import { parseGIF, decompressFrame } from 'gifuct-js';

/**
 * Frame-accurate GIF playback.
 *
 * A plain <img> GIF can't be paused, held on a frame, or resumed, so we decode
 * the GIF ourselves (gifuct-js) and draw frames into a canvas. The same canvas
 * is shown directly in the DOM (fallback mode) or used as a WebGL texture on a
 * billboard plane (WebXR mode).
 *
 * Frames are decoded on the fly while playing (only one composited canvas is
 * kept in memory), because the 190-frame 480x480 walk GIF would need ~175MB
 * if every frame were cached as RGBA.
 */

export interface GifData {
  url: string;
  width: number;
  height: number;
  gct: [number, number, number][];
  frames: any[];
  delays: number[];
}

const cache = new Map<string, Promise<GifData>>();

export function loadGif(url: string): Promise<GifData> {
  let p = cache.get(url);
  if (!p) {
    p = fetch(url)
      .then(r => {
        if (!r.ok) throw new Error(`Failed to load ${url}: ${r.status}`);
        return r.arrayBuffer();
      })
      .then(buf => {
        const gif = parseGIF(buf);
        const frames = (gif.frames as any[]).filter(f => f.image);
        const delays = frames.map(f => Math.max(20, ((f.gce && f.gce.delay) || 10) * 10));
        return {
          url,
          width: gif.lsd.width,
          height: gif.lsd.height,
          gct: gif.gct,
          frames,
          delays
        };
      });
    p.catch(() => cache.delete(url));
    cache.set(url, p);
  }
  return p;
}

/** Warm the decode cache so the first play doesn't stall. */
export function preloadGif(url: string) {
  loadGif(url).catch(() => {});
}

export interface FeetInfo {
  /** Horizontal centre of the feet, in GIF pixels. */
  cx: number;
  /** Half the width of the feet footprint, in GIF pixels. */
  halfWidth: number;
}

interface PlayOptions {
  speed?: number;
  /** Clamp per-frame delay (ms) — trims long blank lead-in / lead-out frames. */
  maxDelay?: number;
  onDone?: () => void;
}

type Mode =
  | { kind: 'idle' }
  | { kind: 'hold' }
  | { kind: 'loop' }
  | { kind: 'to'; target: number; onDone?: () => void };

type Listener = (player: GifPlayer) => void;

export class GifPlayer {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private patchCanvas: HTMLCanvasElement;
  private patchCtx: CanvasRenderingContext2D;

  data: GifData | null = null;
  url: string | null = null;
  /** Index of the frame currently shown (-1 = nothing drawn yet). */
  index = -1;
  /** Bumped every time the canvas pixels change. */
  frameVersion = 0;
  /** Bumped every time a different GIF (possibly different size) is loaded. */
  sourceVersion = 0;
  /** Where the feet are in the current frame (null = no alien visible). */
  feet: FeetInfo | null = null;
  /** Row (as fraction of height) where the feet touch the floor. */
  floorFrac = 0.96;

  private prevDims: { top: number; left: number; width: number; height: number } | null = null;
  private prevDisposal = 0;
  private restore: ImageData | null = null;

  private mode: Mode = { kind: 'idle' };
  private speed = 1;
  private maxDelay = Infinity;
  private lastTime = 0;
  private acc = 0;
  private raf = 0;
  private loadToken = 0;
  private listeners = new Set<Listener>();

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 2;
    this.canvas.height = 2;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
    this.patchCanvas = document.createElement('canvas');
    this.patchCtx = this.patchCanvas.getContext('2d')!;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    this.listeners.forEach(fn => fn(this));
  }

  get frameCount() {
    return this.data ? this.data.frames.length : 0;
  }

  /** Load a GIF and show its first frame. Resolves false if superseded by another load. */
  async load(url: string, floorFrac = 0.96): Promise<boolean> {
    this.floorFrac = floorFrac;
    if (this.url === url && this.data) return true;
    const token = ++this.loadToken;
    this.url = url;
    this.data = null;
    this.mode = { kind: 'idle' };
    this.feet = null;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.frameVersion++;
    this.emit();

    let data: GifData;
    try {
      data = await loadGif(url);
    } catch (err) {
      console.error(err);
      return false;
    }
    if (token !== this.loadToken) return false;

    this.data = data;
    this.canvas.width = data.width;
    this.canvas.height = data.height;
    this.sourceVersion++;
    this.resetDecode();
    this.decodeNext();
    this.afterDraw();
    return true;
  }

  /** Loop the whole GIF forever. */
  loop(opts: PlayOptions = {}) {
    if (!this.data) return;
    this.configure(opts);
    this.mode = { kind: 'loop' };
    this.ensureRunning();
  }

  /** Play forward until `target`, then hold that frame and call onDone. */
  playTo(target: number, opts: PlayOptions = {}) {
    if (!this.data) return;
    const last = this.data.frames.length - 1;
    target = Math.max(0, Math.min(last, target));
    this.configure(opts);
    if (this.index > target) {
      this.resetDecode();
      this.decodeNext();
      this.afterDraw();
    }
    if (this.index >= target) {
      this.mode = { kind: 'hold' };
      opts.onDone?.();
      return;
    }
    this.mode = { kind: 'to', target, onDone: opts.onDone };
    this.ensureRunning();
  }

  /** Play forward from wherever we are to the last frame. */
  playToEnd(opts: PlayOptions = {}) {
    if (!this.data) return;
    this.playTo(this.data.frames.length - 1, opts);
  }

  /** Jump straight to a frame and freeze there. */
  hold(frame: number) {
    if (!this.data) return;
    this.mode = { kind: 'hold' };
    this.seek(frame);
  }

  stop() {
    this.mode = { kind: 'idle' };
  }

  get isPlaying() {
    return this.mode.kind === 'loop' || this.mode.kind === 'to';
  }

  /**
   * Advance playback based on wall-clock time. Safe to call from several
   * loops (window rAF and the WebXR frame loop) — it's time-based.
   */
  tick = (now: number = performance.now()) => {
    if (!this.data || !this.isPlaying) {
      this.lastTime = now;
      return;
    }
    let dt = now - this.lastTime;
    this.lastTime = now;
    if (dt <= 0) return;
    dt = Math.min(dt, 250);
    this.acc += dt * this.speed;

    let advanced = false;
    let finished: (() => void) | undefined;
    let delay = this.currentDelay();
    while (this.acc >= delay) {
      this.acc -= delay;
      const mode = this.mode;
      if (mode.kind === 'loop') {
        if (!this.decodeNext()) {
          this.resetDecode();
          this.decodeNext();
        }
        advanced = true;
      } else if (mode.kind === 'to') {
        if (this.index < mode.target && this.decodeNext()) advanced = true;
        if (this.index >= mode.target || this.index >= this.data.frames.length - 1) {
          finished = mode.onDone ?? (() => {});
          this.mode = { kind: 'hold' };
          break;
        }
      } else {
        break;
      }
      delay = this.currentDelay();
    }

    if (advanced) this.afterDraw();
    if (finished) finished();
  };

  private configure(opts: PlayOptions) {
    this.speed = opts.speed ?? 1;
    this.maxDelay = opts.maxDelay ?? Infinity;
    this.lastTime = performance.now();
    this.acc = 0;
  }

  private currentDelay() {
    if (!this.data) return 100;
    const i = Math.max(0, this.index);
    return Math.min(this.maxDelay, this.data.delays[i] ?? 100);
  }

  private ensureRunning() {
    if (this.raf) return;
    const step = (now: number) => {
      this.tick(now);
      this.raf = this.isPlaying ? requestAnimationFrame(step) : 0;
    };
    this.raf = requestAnimationFrame(step);
  }

  private resetDecode() {
    this.index = -1;
    this.prevDims = null;
    this.prevDisposal = 0;
    this.restore = null;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private seek(target: number) {
    if (!this.data) return;
    target = Math.max(0, Math.min(this.data.frames.length - 1, target));
    if (target === this.index) return;
    if (target < this.index) this.resetDecode();
    while (this.index < target && this.decodeNext()) {
      /* decode forward */
    }
    this.afterDraw();
  }

  private decodeNext(): boolean {
    const d = this.data;
    if (!d) return false;
    const next = this.index + 1;
    if (next >= d.frames.length) return false;

    // Apply the previous frame's disposal method.
    if (this.prevDims) {
      if (this.prevDisposal === 2) {
        const p = this.prevDims;
        this.ctx.clearRect(p.left, p.top, p.width, p.height);
      } else if (this.prevDisposal === 3 && this.restore) {
        this.ctx.putImageData(this.restore, 0, 0);
      }
    }

    const fr = decompressFrame(d.frames[next], d.gct, true);
    this.restore =
      fr.disposalType === 3 ? this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height) : null;

    const { width, height, top, left } = fr.dims;
    if (width > 0 && height > 0) {
      if (this.patchCanvas.width !== width || this.patchCanvas.height !== height) {
        this.patchCanvas.width = width;
        this.patchCanvas.height = height;
      }
      this.patchCtx.putImageData(new ImageData(fr.patch as any, width, height), 0, 0);
      this.ctx.drawImage(this.patchCanvas, 0, 0, width, height, left, top, width, height);
    }

    this.prevDims = fr.dims;
    this.prevDisposal = fr.disposalType;
    this.index = next;
    return true;
  }

  private afterDraw() {
    this.computeFeet();
    this.frameVersion++;
    this.emit();
  }

  /** Scan a thin strip just above the floor line to find where the feet are. */
  private computeFeet() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (w < 4 || h < 4) {
      this.feet = null;
      return;
    }
    const stripH = Math.max(4, Math.round(h * 0.05));
    const y0 = Math.max(0, Math.min(h - stripH, Math.round(h * this.floorFrac) - stripH));
    const px = this.ctx.getImageData(0, y0, w, stripH).data;
    let minX = w;
    let maxX = -1;
    for (let y = 0; y < stripH; y++) {
      const row = y * w * 4;
      for (let x = 0; x < w; x++) {
        if (px[row + x * 4 + 3] > 64) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
        }
      }
    }
    this.feet = maxX >= minX ? { cx: (minX + maxX) / 2, halfWidth: (maxX - minX) / 2 } : null;
  }
}
