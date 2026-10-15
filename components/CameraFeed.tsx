import React, { useEffect, useRef } from 'react';

export type CameraStatus = 'idle' | 'pending' | 'active' | 'denied' | 'unavailable';

interface CameraFeedProps {
  /** Only ask for the camera once the player has started (after onboarding). */
  enabled: boolean;
  onStatus?: (status: CameraStatus) => void;
}

/**
 * Rear camera as the game backdrop. When the camera is denied or missing it
 * renders nothing and reports why, and the game shows the starfield room instead.
 */
const CameraFeed: React.FC<CameraFeedProps> = ({ enabled, onStatus }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = React.useState(false);
  const statusRef = useRef(onStatus);
  statusRef.current = onStatus;

  useEffect(() => {
    if (!enabled) return;
    let stream: MediaStream | null = null;
    let cancelled = false;

    const report = (s: CameraStatus) => !cancelled && statusRef.current?.(s);

    // ?nocamera=1 lets you (and tests) try the no-camera experience.
    const forceOff = new URLSearchParams(window.location.search).has('nocamera');
    if (forceOff || !navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
      report('unavailable');
      return;
    }

    report('pending');
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      })
      .then(s => {
        if (cancelled) {
          s.getTracks().forEach(t => t.stop());
          return;
        }
        stream = s;
        if (videoRef.current) videoRef.current.srcObject = s;
        setActive(true);
        report('active');
        s.getVideoTracks()[0]?.addEventListener('ended', () => {
          setActive(false);
          report('unavailable');
        });
      })
      .catch(err => {
        console.warn('Camera unavailable:', err);
        const name = (err && err.name) || '';
        report(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable');
      });

    return () => {
      cancelled = true;
      setActive(false);
      stream?.getTracks().forEach(t => t.stop());
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      className="absolute inset-0 z-0 overflow-hidden"
      style={{ opacity: active ? 1 : 0, transition: 'opacity 0.6s ease' }}
    >
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />
    </div>
  );
};

export default CameraFeed;
