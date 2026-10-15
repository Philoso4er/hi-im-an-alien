/** navigator.vibrate wrapper. iOS Safari has no vibration API, so this is a no-op there. */
let enabled = true;

export const haptics = {
  setEnabled(v: boolean) {
    enabled = v;
  },
  supported(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  },
  pulse(pattern: number | number[]) {
    if (!enabled || !this.supported()) return;
    try {
      navigator.vibrate(pattern);
    } catch {
      /* ignore */
    }
  },
  /** Something just appeared at the edge of the screen. */
  spot() {
    this.pulse([18, 60, 18]);
  },
  /** You said hi in time. */
  contact() {
    this.pulse([10, 40, 30]);
  },
  /** It vanished. */
  miss() {
    this.pulse([120, 60, 60]);
  },
  tap() {
    this.pulse(8);
  },
  rare() {
    this.pulse([30, 50, 30, 50, 90]);
  }
};
