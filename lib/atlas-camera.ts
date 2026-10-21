/**
 * Camera for the world atlas: one transform, one animation loop.
 *
 * Coordinates are normalised to the viewport box, so nothing here depends on
 * pixel sizes and a resize can never desynchronise the view:
 *   - a map point is (px, py) in 0..1 across the map;
 *   - a view is { tx, ty, k }: the point p lands at  t + k * p  (in viewport
 *     fractions), i.e. CSS `translate(tx, ty) scale(k)` with origin 0 0;
 *   - the map must always cover the viewport, so  1 - k <= t <= 0.
 *
 * Motion has two modes that never run together:
 *   - chase: every frame the view eases toward `target` with the same factor
 *     for tx, ty and k. Interpolating all three linearly keeps the point under
 *     the cursor exactly fixed while zooming, which is what makes wheel and
 *     pinch zoom feel anchored instead of drifting;
 *   - flight: a timed move between two views that interpolates the *centre*
 *     of the view and the log-zoom, dipping the zoom on long hops so the
 *     camera arcs over the map instead of sliding across it.
 * Any user input cancels a flight and hands control back to chase.
 */

export type AtlasView = { tx: number; ty: number; k: number };

export const ATLAS_MIN_ZOOM = 1;
export const ATLAS_MAX_ZOOM = 6;
export const ATLAS_FOCUS_ZOOM = 2.2;
/** At or above this zoom every city code is labelled, not only the active one. */
const NEAR_ZOOM = 2.8;

const SETTLE_TRANSLATION = 0.0002;
const SETTLE_ZOOM = 0.002;
const DRAG_THRESHOLD_MOUSE = 4;
const DRAG_THRESHOLD_TOUCH = 8;
const KEY_ZOOM_STEP = 1.5;
const KEY_PAN_STEP = 0.16;
const MOMENTUM_MS = 190;

function clamp(value: number, low: number, high: number) {
  return Math.min(high, Math.max(low, value));
}

export function clampView(view: AtlasView): AtlasView {
  const k = clamp(view.k, ATLAS_MIN_ZOOM, ATLAS_MAX_ZOOM);
  return {
    k,
    tx: clamp(view.tx, 1 - k, 0),
    ty: clamp(view.ty, 1 - k, 0),
  };
}

/** The view that puts map point (px, py) in the middle of the viewport, as far as the map edges allow. */
export function viewForPoint(px: number, py: number, k: number = ATLAS_FOCUS_ZOOM): AtlasView {
  return clampView({ k, tx: 0.5 - k * px, ty: 0.5 - k * py });
}

export function viewToTransform(view: AtlasView) {
  return `translate(${(view.tx * 100).toFixed(4)}%, ${(view.ty * 100).toFixed(4)}%) scale(${view.k.toFixed(4)})`;
}

export function isNearZoom(k: number) {
  return k >= NEAR_ZOOM;
}

function centreOf(view: AtlasView) {
  return { x: (0.5 - view.tx) / view.k, y: (0.5 - view.ty) / view.k };
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

type Flight = {
  from: AtlasView;
  to: AtlasView;
  start: number;
  duration: number;
  dip: number;
};

type DragState = {
  id: number;
  startX: number;
  startY: number;
  base: AtlasView;
  active: boolean;
  lastX: number;
  lastY: number;
  lastTime: number;
  vx: number;
  vy: number;
};

type PinchState = {
  distance: number;
  view: AtlasView;
  cx: number;
  cy: number;
};

function interpolateFlight(flight: Flight, progress: number): AtlasView {
  const { from, to, dip } = flight;
  const a = centreOf(from);
  const b = centreOf(to);
  const cx = a.x + (b.x - a.x) * progress;
  const cy = a.y + (b.y - a.y) * progress;
  const logK = Math.log(from.k) + (Math.log(to.k) - Math.log(from.k)) * progress - dip * Math.sin(Math.PI * progress);
  const k = Math.max(ATLAS_MIN_ZOOM, Math.exp(logK));
  return clampView({ k, tx: 0.5 - k * cx, ty: 0.5 - k * cy });
}

export class AtlasCamera {
  private cam: AtlasView;
  private target: AtlasView;
  private flight: Flight | null = null;
  private raf = 0;
  private last = 0;
  private tau = 120;
  private reduced = false;
  private near: boolean;
  private pointers = new Map<number, { x: number; y: number }>();
  private drag: DragState | null = null;
  private pinch: PinchState | null = null;
  private suppressClick = false;
  private disposers: Array<() => void> = [];

  constructor(
    private readonly viewport: HTMLElement,
    private readonly geo: HTMLElement,
    initial: AtlasView,
  ) {
    this.cam = { ...initial };
    this.target = { ...initial };
    this.near = isNearZoom(initial.k);
    this.viewport.dataset.zoom = this.near ? "near" : "far";

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.reduced = motion.matches;
    const onMotionChange = (event: MediaQueryListEvent) => {
      this.reduced = event.matches;
    };
    motion.addEventListener("change", onMotionChange);
    this.disposers.push(() => motion.removeEventListener("change", onMotionChange));

    this.listen("wheel", this.onWheel, { passive: false });
    this.listen("pointerdown", this.onPointerDown);
    this.listen("pointermove", this.onPointerMove);
    this.listen("pointerup", this.onPointerEnd);
    this.listen("pointercancel", this.onPointerEnd);
    this.listen("dblclick", this.onDoubleClick);
    this.listen("keydown", this.onKeyDown);
    this.listen("click", this.onClickCapture, { capture: true });
  }

  /** Zoom the camera is heading to (or at), used to keep the user's zoom when flying between cities. */
  get zoom() {
    return this.flight ? this.flight.to.k : this.target.k;
  }

  flyTo(px: number, py: number, k: number = ATLAS_FOCUS_ZOOM) {
    this.startFlight(viewForPoint(px, py, k));
  }

  showWorld() {
    this.startFlight(clampView({ k: ATLAS_MIN_ZOOM, tx: 0, ty: 0 }));
  }

  zoomBy(factor: number) {
    this.zoomAt(factor, 0.5, 0.5, 150);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.disposers.forEach((dispose) => dispose());
    this.disposers = [];
    this.pointers.clear();
    delete this.viewport.dataset.dragging;
    this.geo.style.willChange = "auto";
  }

  // ---- motion core -------------------------------------------------------

  private listen<K extends keyof HTMLElementEventMap>(
    type: K,
    handler: (event: HTMLElementEventMap[K]) => void,
    options?: AddEventListenerOptions,
  ) {
    this.viewport.addEventListener(type, handler, options);
    this.disposers.push(() => this.viewport.removeEventListener(type, handler, options));
  }

  private startFlight(to: AtlasView) {
    const from = { ...this.cam };
    this.target = { ...to };
    if (this.reduced) {
      this.flight = null;
      this.cam = { ...to };
      this.apply(false);
      return;
    }
    const a = centreOf(from);
    const b = centreOf(to);
    const distance = Math.hypot(b.x - a.x, b.y - a.y);
    this.flight = {
      from,
      to,
      start: performance.now(),
      duration: clamp(650 + distance * 1400, 650, 1500),
      dip: Math.min(0.7, distance * 1.6),
    };
    this.ensureLoop();
  }

  /** Cancels any flight so user input starts from where the camera visibly is. */
  private takeControl() {
    if (!this.flight) return;
    this.flight = null;
    this.target = { ...this.cam };
  }

  private setTarget(view: AtlasView, tau: number) {
    this.target = view;
    this.tau = tau;
    if (this.reduced) {
      this.cam = { ...view };
      this.apply(false);
      return;
    }
    this.ensureLoop();
  }

  private zoomAt(factor: number, fx: number, fy: number, tau: number) {
    this.takeControl();
    const t = this.target;
    const k = clamp(t.k * factor, ATLAS_MIN_ZOOM, ATLAS_MAX_ZOOM);
    const px = (fx - t.tx) / t.k;
    const py = (fy - t.ty) / t.k;
    this.setTarget(clampView({ k, tx: fx - k * px, ty: fy - k * py }), tau);
  }

  private panBy(dx: number, dy: number) {
    this.takeControl();
    const t = this.target;
    this.setTarget(clampView({ k: t.k, tx: t.tx + dx, ty: t.ty + dy }), 140);
  }

  private ensureLoop() {
    if (this.raf) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    this.raf = 0;
    const dt = clamp(now - this.last, 1, 48);
    this.last = now;
    let active: boolean;

    if (this.flight) {
      const progress = clamp((now - this.flight.start) / this.flight.duration, 0, 1);
      this.cam = progress >= 1 ? { ...this.flight.to } : interpolateFlight(this.flight, easeInOutCubic(progress));
      if (progress >= 1) this.flight = null;
      active = progress < 1;
    } else {
      const a = 1 - Math.exp(-dt / this.tau);
      const c = this.cam;
      const g = this.target;
      c.tx += (g.tx - c.tx) * a;
      c.ty += (g.ty - c.ty) * a;
      c.k += (g.k - c.k) * a;
      active =
        Math.abs(g.tx - c.tx) > SETTLE_TRANSLATION ||
        Math.abs(g.ty - c.ty) > SETTLE_TRANSLATION ||
        Math.abs(g.k - c.k) > SETTLE_ZOOM;
      if (!active) this.cam = { ...g };
    }

    this.apply(active);
    if (active) this.raf = requestAnimationFrame(this.tick);
  };

  private apply(active: boolean) {
    const c = this.cam;
    const style = this.geo.style;
    style.transform = viewToTransform(c);
    style.setProperty("--atlas-k", c.k.toFixed(4));
    // Promote the layer only while moving; dropping it at rest lets the browser
    // re-rasterise the map at its current scale so it is crisp, not stretched.
    style.willChange = active ? "transform" : "auto";

    const near = isNearZoom(c.k);
    if (near !== this.near) {
      this.near = near;
      this.viewport.dataset.zoom = near ? "near" : "far";
    }
  }

  // ---- input -------------------------------------------------------------

  private onWheel = (event: WheelEvent) => {
    const flat = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaMode === 2 ? event.deltaY * this.viewport.clientHeight : event.deltaY;
    // Fully zoomed out and scrolling on: let the page scroll instead of trapping it.
    if (!event.ctrlKey && flat > 0 && this.zoom <= ATLAS_MIN_ZOOM + 0.001) return;

    event.preventDefault();
    const rect = this.viewport.getBoundingClientRect();
    // Trackpad pinch arrives as ctrl+wheel with much smaller deltas.
    const sensitivity = event.ctrlKey ? 0.011 : 0.0018;
    this.zoomAt(
      Math.exp(-flat * sensitivity),
      (event.clientX - rect.left) / rect.width,
      (event.clientY - rect.top) / rect.height,
      130,
    );
  };

  private onPointerDown = (event: PointerEvent) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if ((event.target as Element).closest("[data-atlas-ignore]")) return;

    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.pointers.size === 1) {
      this.drag = {
        id: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        base: { ...this.target },
        active: false,
        lastX: event.clientX,
        lastY: event.clientY,
        lastTime: event.timeStamp,
        vx: 0,
        vy: 0,
      };
    } else if (this.pointers.size === 2) {
      this.beginPinch();
    }
  };

  private onPointerMove = (event: PointerEvent) => {
    const point = this.pointers.get(event.pointerId);
    if (!point) return;
    point.x = event.clientX;
    point.y = event.clientY;

    if (this.pinch) {
      this.updatePinch();
      return;
    }

    const drag = this.drag;
    if (!drag || drag.id !== event.pointerId) return;

    if (!drag.active) {
      const threshold = event.pointerType === "mouse" ? DRAG_THRESHOLD_MOUSE : DRAG_THRESHOLD_TOUCH;
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < threshold) return;
      drag.active = true;
      this.takeControl();
      drag.base = { ...this.target };
      // Restart from here so the map does not jump by the dead-zone distance.
      drag.startX = event.clientX;
      drag.startY = event.clientY;
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
      drag.lastTime = event.timeStamp;
      try {
        this.viewport.setPointerCapture(event.pointerId);
      } catch {
        // The pointer may already be gone; dragging still works without capture.
      }
      this.viewport.dataset.dragging = "true";
    }

    const rect = this.viewport.getBoundingClientRect();
    const dt = Math.max(1, event.timeStamp - drag.lastTime);
    drag.vx = drag.vx * 0.6 + ((event.clientX - drag.lastX) / rect.width / dt) * 0.4;
    drag.vy = drag.vy * 0.6 + ((event.clientY - drag.lastY) / rect.height / dt) * 0.4;
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    drag.lastTime = event.timeStamp;

    this.setTarget(
      clampView({
        k: drag.base.k,
        tx: drag.base.tx + (event.clientX - drag.startX) / rect.width,
        ty: drag.base.ty + (event.clientY - drag.startY) / rect.height,
      }),
      55,
    );
  };

  private onPointerEnd = (event: PointerEvent) => {
    if (!this.pointers.delete(event.pointerId)) return;

    if (this.pinch) {
      if (this.pointers.size < 2) {
        this.pinch = null;
        // The remaining finger carries on as a plain drag.
        const rest = [...this.pointers.entries()][0];
        if (rest) {
          const [id, position] = rest;
          this.drag = {
            id,
            startX: position.x,
            startY: position.y,
            base: { ...this.target },
            active: true,
            lastX: position.x,
            lastY: position.y,
            lastTime: event.timeStamp,
            vx: 0,
            vy: 0,
          };
        }
      }
      return;
    }

    const drag = this.drag;
    if (!drag || drag.id !== event.pointerId) return;
    this.drag = null;
    if (!drag.active) return;

    this.endDragVisuals(event.pointerId);
    this.suppressClick = true;
    window.setTimeout(() => {
      this.suppressClick = false;
    }, 0);

    // A finger that was still when it lifted should not fling the map.
    const flick = event.type === "pointerup" && event.timeStamp - drag.lastTime < 80;
    if (flick && !this.reduced) {
      this.setTarget(
        clampView({
          k: this.target.k,
          tx: this.target.tx + drag.vx * MOMENTUM_MS,
          ty: this.target.ty + drag.vy * MOMENTUM_MS,
        }),
        MOMENTUM_MS,
      );
    }
  };

  private endDragVisuals(pointerId: number) {
    try {
      this.viewport.releasePointerCapture(pointerId);
    } catch {
      // Already released.
    }
    delete this.viewport.dataset.dragging;
  }

  private beginPinch() {
    if (this.drag?.active) this.endDragVisuals(this.drag.id);
    this.drag = null;
    this.takeControl();

    const [a, b] = [...this.pointers.values()];
    const rect = this.viewport.getBoundingClientRect();
    this.pinch = {
      distance: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      view: { ...this.target },
      cx: ((a.x + b.x) / 2 - rect.left) / rect.width,
      cy: ((a.y + b.y) / 2 - rect.top) / rect.height,
    };
  }

  private updatePinch() {
    const pinch = this.pinch;
    if (!pinch || this.pointers.size < 2) return;
    const [a, b] = [...this.pointers.values()];
    const rect = this.viewport.getBoundingClientRect();
    const distance = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    const k = clamp(pinch.view.k * (distance / pinch.distance), ATLAS_MIN_ZOOM, ATLAS_MAX_ZOOM);
    const cx = ((a.x + b.x) / 2 - rect.left) / rect.width;
    const cy = ((a.y + b.y) / 2 - rect.top) / rect.height;
    // The map point first under the fingers stays under them, which also gives two-finger panning.
    const px = (pinch.cx - pinch.view.tx) / pinch.view.k;
    const py = (pinch.cy - pinch.view.ty) / pinch.view.k;
    this.setTarget(clampView({ k, tx: cx - k * px, ty: cy - k * py }), 45);
  }

  private onDoubleClick = (event: MouseEvent) => {
    if ((event.target as Element).closest("[data-atlas-ignore], button")) return;
    const rect = this.viewport.getBoundingClientRect();
    this.zoomAt(
      event.shiftKey ? 1 / 2 : 2,
      (event.clientX - rect.left) / rect.width,
      (event.clientY - rect.top) / rect.height,
      150,
    );
  };

  private onClickCapture = (event: MouseEvent) => {
    if (!this.suppressClick) return;
    event.stopPropagation();
    event.preventDefault();
  };

  private onKeyDown = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    switch (event.key) {
      case "+":
      case "=":
        this.zoomBy(KEY_ZOOM_STEP);
        break;
      case "-":
      case "_":
        this.zoomBy(1 / KEY_ZOOM_STEP);
        break;
      case "0":
        this.showWorld();
        break;
      case "ArrowLeft":
        this.panBy(KEY_PAN_STEP, 0);
        break;
      case "ArrowRight":
        this.panBy(-KEY_PAN_STEP, 0);
        break;
      case "ArrowUp":
        this.panBy(0, KEY_PAN_STEP);
        break;
      case "ArrowDown":
        this.panBy(0, -KEY_PAN_STEP);
        break;
      default:
        return;
    }
    event.preventDefault();
  };
}
