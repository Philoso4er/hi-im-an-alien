/**
 * WebXR helpers. Real floor anchoring needs `immersive-ar` + `hit-test`
 * (Android Chrome with ARCore). iOS Safari and desktop browsers don't expose
 * it, so the game falls back to the camera feed + fixed floor line.
 */

export async function isImmersiveARSupported(): Promise<boolean> {
  try {
    const xr = (navigator as any).xr as XRSystem | undefined;
    if (!xr || !window.isSecureContext) return false;
    return await xr.isSessionSupported('immersive-ar');
  } catch {
    return false;
  }
}

/**
 * Must be called synchronously from a user gesture (click handler).
 * `overlayRoot` stays visible on top of the camera (DOM overlay), so the
 * normal React UI (Say Hi button, chat panel) keeps working inside AR.
 */
export function requestARSession(overlayRoot: HTMLElement): Promise<XRSession> {
  const xr = (navigator as any).xr as XRSystem;
  return xr.requestSession('immersive-ar', {
    requiredFeatures: ['hit-test', 'dom-overlay'],
    optionalFeatures: ['local-floor'],
    domOverlay: { root: overlayRoot }
  } as XRSessionInit);
}
