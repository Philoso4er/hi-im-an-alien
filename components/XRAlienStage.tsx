import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { AlienStatus } from '../types';
import { GifPlayer } from '../services/gifPlayer';
import { ALIEN_GIFS, ALIEN_HEIGHT_M } from './alienStage';
import type { AlienScene } from './Alien';

export interface XRStageHandle {
  /** Anchor the alien where the floor reticle currently is. */
  place: () => boolean;
}

export interface XRScreenAnchor {
  /** Screen px of the alien's chest. */
  x: number;
  y: number;
  /** Approx on-screen height of the alien in px. */
  height: number;
  /** Screen px of the top of the head (for the speech bubble). */
  headX: number;
  headY: number;
}

interface XRAlienStageProps {
  session: XRSession;
  player: GifPlayer;
  isVisible: boolean;
  status: AlienStatus;
  scene: AlienScene;
  /** Game-level "placed" flag; when it goes false the reticle comes back for re-placement. */
  placed: boolean;
  onReticleChange?: (hasFloor: boolean) => void;
  onScreenAnchor?: (anchor: XRScreenAnchor | null) => void;
}

/** Radial-gradient texture for the contact shadow. */
function makeShadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(0,0,0,0.6)');
  grad.addColorStop(0.45, 'rgba(0,0,0,0.3)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Plane geometry for one GIF, in metres, relative to the anchor point on the floor. */
function planeConfig(kind: 'peek' | 'walk') {
  if (kind === 'peek') {
    const m = ALIEN_GIFS.peek;
    const h = ALIEN_HEIGHT_M / (m.floorFrac - m.topFrac);
    const w = (h * m.width) / m.height;
    return {
      w,
      h,
      floorFrac: m.floorFrac,
      // Feet stand on the anchor point.
      x: (0.5 - m.feetFracX) * w,
      y: (m.floorFrac - 0.5) * h,
      hiddenShift: w * (1 - m.leftFrac) + 0.05
    };
  }
  const m = ALIEN_GIFS.walk;
  const h = ALIEN_HEIGHT_M / (m.floorFrac - m.topFrac);
  return {
    w: h,
    h,
    floorFrac: m.floorFrac,
    x: (0.5 - m.feetFracX) * h,
    y: (m.floorFrac - 0.5) * h,
    hiddenShift: 0
  };
}

/**
 * WebXR scene: the GIF is drawn on a Y-axis billboard plane whose bottom edge
 * (the feet line) sits on a real floor hit-test point, with a contact shadow
 * on the floor and an invisible depth-only "corner" occluder at its right side
 * so the alien leans out from — and walks in from behind — something.
 */
const XRAlienStage = forwardRef<XRStageHandle, XRAlienStageProps>(
  ({ session, player, isVisible, status, scene, placed: placedProp, onReticleChange, onScreenAnchor }, ref) => {
    const live = useRef({ isVisible, status, scene, placedProp, onReticleChange, onScreenAnchor });
    live.current = { isVisible, status, scene, placedProp, onReticleChange, onScreenAnchor };
    const api = useRef<XRStageHandle>({ place: () => false });

    useImperativeHandle(ref, () => ({ place: () => api.current.place() }), []);

    useEffect(() => {
      let disposed = false;
      let hitSource: XRHitTestSource | null = null;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.xr.enabled = true;
      renderer.xr.setReferenceSpaceType('local');

      const scene3 = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 30);

      // Floor reticle shown until the alien is placed.
      const reticle = new THREE.Mesh(
        new THREE.RingGeometry(0.11, 0.14, 40).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.9 })
      );
      reticle.matrixAutoUpdate = false;
      reticle.visible = false;
      scene3.add(reticle);

      // anchor (on the floor) -> billboard (turns to face the camera) -> slider (peek slide)
      const anchor = new THREE.Group();
      anchor.visible = false;
      scene3.add(anchor);
      const billboard = new THREE.Group();
      anchor.add(billboard);
      const slider = new THREE.Group();
      billboard.add(slider);

      let texture = new THREE.CanvasTexture(player.canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const alienMat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.08,
        side: THREE.DoubleSide
      });
      const alien = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), alienMat);
      slider.add(alien);

      const shadowTex = makeShadowTexture();
      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
      );
      shadow.position.y = 0.003;
      shadow.renderOrder = 1;
      slider.add(shadow);

      // Invisible "corner": writes depth only, so anything behind it is hidden.
      const occluder = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 2.4, 0.04),
        new THREE.MeshBasicMaterial({ colorWrite: false })
      );
      occluder.renderOrder = -1;
      billboard.add(occluder);

      let cfg = planeConfig('peek');
      let cfgKind: 'peek' | 'walk' | null = null;
      const applyConfig = (kind: 'peek' | 'walk') => {
        if (cfgKind === kind) return;
        cfgKind = kind;
        cfg = planeConfig(kind);
        alien.scale.set(cfg.w, cfg.h, 1);
        alien.position.set(cfg.x, cfg.y, 0);
        const planeRight = cfg.x + cfg.w / 2;
        occluder.position.set(planeRight + 0.6 - 0.005, 1.2, 0.04);
        slider.position.x = kind === 'peek' ? cfg.hiddenShift : 0;
      };
      applyConfig('peek');

      let lastFrameVersion = -1;
      let lastSourceVersion = player.sourceVersion;
      const syncTexture = () => {
        if (player.sourceVersion !== lastSourceVersion) {
          // Canvas size may have changed — WebGL textures can't be resized in place.
          lastSourceVersion = player.sourceVersion;
          texture.dispose();
          texture = new THREE.CanvasTexture(player.canvas);
          texture.colorSpace = THREE.SRGBColorSpace;
          alienMat.map = texture;
          alienMat.needsUpdate = true;
          lastFrameVersion = -1;
        }
        if (player.frameVersion !== lastFrameVersion) {
          lastFrameVersion = player.frameVersion;
          texture.needsUpdate = true;
          const f = player.feet;
          const cw = player.canvas.width || 1;
          if (f) {
            shadow.visible = true;
            const sx = Math.max(0.22, ((f.halfWidth * 2) / cw) * cfg.w * 1.6);
            shadow.scale.set(sx, 1, sx * 0.4);
            shadow.position.x = cfg.x + (f.cx / cw - 0.5) * cfg.w;
          } else {
            shadow.visible = false;
          }
        }
      };

      let placed = false;
      let pendingPlace = false;
      let hadHit = false;
      api.current.place = () => {
        if (!reticle.visible) return false;
        const p = new THREE.Vector3();
        p.setFromMatrixPosition(reticle.matrix);
        anchor.position.copy(p);
        placed = true;
        pendingPlace = true;
        reticle.visible = false;
        if (hadHit) {
          hadHit = false;
          live.current.onReticleChange?.(false);
        }
        return true;
      };

      const camPos = new THREE.Vector3();
      const tmp = new THREE.Vector3();
      let lastAnchorReport = 0;
      let lastTime = performance.now();

      const project = (v: THREE.Vector3, cam: THREE.Camera) => {
        tmp.copy(v).project(cam);
        return {
          x: (tmp.x * 0.5 + 0.5) * window.innerWidth,
          y: (-tmp.y * 0.5 + 0.5) * window.innerHeight,
          behind: tmp.z > 1
        };
      };

      const onFrame = (_t: number, frame?: XRFrame) => {
        if (!frame || disposed) return;
        const now = performance.now();
        const dt = Math.min(0.1, (now - lastTime) / 1000);
        lastTime = now;
        const st = live.current;
        const refSpace = renderer.xr.getReferenceSpace();

        player.tick(now);

        if (st.placedProp) pendingPlace = false;
        else if (!pendingPlace) placed = false;

        // Floor hit-test → reticle (until placed).
        if (hitSource && refSpace && !placed) {
          const hits = frame.getHitTestResults(hitSource);
          const pose = hits.length ? hits[0].getPose(refSpace) : undefined;
          reticle.visible = !!pose;
          if (pose) reticle.matrix.fromArray(pose.transform.matrix);
          if (!!pose !== hadHit) {
            hadHit = !!pose;
            st.onReticleChange?.(hadHit);
          }
        }

        applyConfig(st.scene === 'peek' ? 'peek' : 'walk');
        anchor.visible = placed && st.isVisible;

        // Y-axis billboard: face the viewer but stay upright on the floor.
        const viewer = refSpace ? frame.getViewerPose(refSpace) : null;
        if (viewer) {
          const p = viewer.transform.position;
          camPos.set(p.x, p.y, p.z);
          billboard.rotation.y = Math.atan2(camPos.x - anchor.position.x, camPos.z - anchor.position.z);
        }

        // Peek: slide out from behind the invisible corner, back behind it when missed.
        const target =
          st.scene === 'peek' && st.isVisible && st.status !== 'MISSED' ? 0 : cfg.hiddenShift;
        slider.position.x += (target - slider.position.x) * Math.min(1, dt * 7);

        syncTexture();
        renderer.render(scene3, camera);

        // Tell the DOM overlay where the alien is on screen (chat panel / bubble placement).
        if (st.onScreenAnchor && now - lastAnchorReport > 120) {
          lastAnchorReport = now;
          const xrCam = renderer.xr.getCamera() as THREE.ArrayCamera;
          const cam0 = (xrCam.cameras && xrCam.cameras[0]) || xrCam;
          if (anchor.visible) {
            const base = anchor.position;
            const feet = project(base, cam0);
            const chest = project(tmp.set(base.x, base.y + ALIEN_HEIGHT_M * 0.55, base.z).clone(), cam0);
            const head = project(new THREE.Vector3(base.x, base.y + ALIEN_HEIGHT_M, base.z), cam0);
            st.onScreenAnchor(
              feet.behind
                ? null
                : {
                    x: chest.x,
                    y: chest.y,
                    height: Math.abs(feet.y - head.y),
                    headX: head.x,
                    headY: head.y
                  }
            );
          } else {
            st.onScreenAnchor(null);
          }
        }
      };

      (async () => {
        try {
          await renderer.xr.setSession(session);
          const viewerSpace = await session.requestReferenceSpace('viewer');
          hitSource = (await session.requestHitTestSource?.({ space: viewerSpace })) ?? null;
        } catch (err) {
          console.error('WebXR setup failed:', err);
        }
        if (disposed) return;
        renderer.setAnimationLoop(onFrame);
      })();

      return () => {
        disposed = true;
        renderer.setAnimationLoop(null);
        hitSource?.cancel();
        texture.dispose();
        shadowTex.dispose();
        renderer.dispose();
        api.current.place = () => false;
      };
    }, [session, player]);

    return null;
  }
);

XRAlienStage.displayName = 'XRAlienStage';
export default XRAlienStage;
