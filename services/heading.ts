/**
 * Where the player is "looking", in degrees, clockwise (turning right = +).
 *
 * Two sources are summed:
 *  - the phone's orientation (DeviceOrientation, the back-camera direction
 *    projected on the horizon, so it works with the phone held upright), and
 *  - a drag offset: swipe left to look right (and arrow keys on desktop),
 *    for devices without motion sensors or when permission was refused.
 *
 * Only relative angles matter; there is no map or GPS.
 */
const DEG = Math.PI / 180;
export const DRAG_DEG_PER_PX = 0.35;

export const wrapDeg = (d: number) => {
  let x = ((d + 180) % 360 + 360) % 360 - 180;
  if (x === -180) x = 180;
  return x;
};

/** Compass-style heading of the back camera from DeviceOrientation Euler angles (W3C z-x'-y''). */
export function cameraHeading(alpha: number, beta: number, gamma: number): number | null {
  const cA = Math.cos(alpha * DEG), sA = Math.sin(alpha * DEG);
  const cB = Math.cos(beta * DEG), sB = Math.sin(beta * DEG);
  const cG = Math.cos(gamma * DEG), sG = Math.sin(gamma * DEG);
  // Back camera looks along the device's -Z axis; express it in the earth frame (x east, y north).
  const x = -(cA * sG + sA * sB * cG);
  const y = -(sA * sG - cA * sB * cG);
  if (Math.hypot(x, y) < 0.25) return null; // phone flat: heading is unstable
  return Math.atan2(x, y) / DEG;
}

type Listener = (h: number) => void;

class HeadingTracker {
  private device: number | null = null;
  private deviceUnwrapped = 0;
  private drag = 0;
  private listeners = new Set<Listener>();
  private started = false;
  /** True once a real orientation event with usable angles arrived. */
  hasSensor = false;

  get value() {
    return this.deviceUnwrapped + this.drag;
  }

  start() {
    if (this.started || typeof window === 'undefined') return;
    this.started = true;
    window.addEventListener('deviceorientation', this.onOrientation, true);
    window.addEventListener('keydown', this.onKey);
  }

  stop() {
    this.started = false;
    window.removeEventListener('deviceorientation', this.onOrientation, true);
    window.removeEventListener('keydown', this.onKey);
  }

  private onOrientation = (e: DeviceOrientationEvent) => {
    if (e.alpha == null || e.beta == null || e.gamma == null) return;
    const h = cameraHeading(e.alpha, e.beta, e.gamma);
    if (h == null) return;
    // Unwrap so the value is continuous across ±180.
    if (this.device == null) this.deviceUnwrapped = h;
    else this.deviceUnwrapped += wrapDeg(h - this.device);
    this.device = h;
    this.hasSensor = true;
    this.emit();
  };

  private onKey = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
    if (e.key === 'ArrowLeft') this.addDrag(-6);
    else if (e.key === 'ArrowRight') this.addDrag(6);
  };

  /** Positive = look right. */
  addDrag(deg: number) {
    this.drag += deg;
    this.emit();
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit() {
    const v = this.value;
    this.listeners.forEach(l => l(v));
  }
}

export const heading = new HeadingTracker();
