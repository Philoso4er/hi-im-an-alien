import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallMode = 'native' | 'ios' | 'installed' | 'none';

const isIOS = () => {
  const ua = navigator.userAgent;
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return /iPad|iPhone|iPod/.test(ua) || iPadOS;
};

export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  window.matchMedia?.('(display-mode: fullscreen)').matches ||
  (navigator as any).standalone === true;

// The event can fire before React mounts; catch it as early as possible.
let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    listeners.forEach(l => l());
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    listeners.forEach(l => l());
  });
}

/**
 * Android/desktop Chrome: captures beforeinstallprompt so we can show our own
 * Install button. iOS Safari has no such event: we show "Share > Add to Home
 * Screen" instructions instead.
 */
export function useInstallPrompt() {
  const compute = (): InstallMode => {
    if (isStandalone()) return 'installed';
    if (deferred) return 'native';
    if (isIOS()) return 'ios';
    return 'none';
  };
  const [mode, setMode] = useState<InstallMode>(compute);

  useEffect(() => {
    const l = () => setMode(compute());
    listeners.add(l);
    l();
    return () => {
      listeners.delete(l);
    };
  }, []);

  const promptInstall = async (): Promise<boolean> => {
    if (!deferred) return false;
    const ev = deferred;
    await ev.prompt();
    const choice = await ev.userChoice.catch(() => ({ outcome: 'dismissed' as const }));
    deferred = null;
    setMode(compute());
    return choice.outcome === 'accepted';
  };

  return { mode, promptInstall };
}
