import { clamp, type Actions, type Vec } from '../systems/types';
import { B } from '../config/balance';
import { ButtonTracker } from './ActionState';
export const bindings = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', impulse: 'Space', pulse: 'KeyQ', pull: 'KeyE', orbit: 'KeyR', compress: 'ShiftLeft', expand: 'ControlLeft' };
export class ActionInput {
  keys = new Set<string>(); pointer: Vec = { x: innerWidth / 2 + 100, y: innerHeight / 2 }; firing = false; target = .5;
  touchMove: Vec = { x: 0, y: 0 }; touchAim: Vec | null = null; touchCast = false; touchDistribution = 0;
  pressed = new Set<string>(); cleanups: (() => void)[] = [];
  tracker = new ButtonTracker();
  constructor(canvas: HTMLCanvasElement) {
    this.on(window, 'keydown', (e: KeyboardEvent) => { if (Object.values(bindings).includes(e.code)) { e.preventDefault(); this.keys.add(e.code); } });
    this.on(window, 'keyup', (e: KeyboardEvent) => this.keys.delete(e.code));
    this.on(window, 'blur', () => this.clear());
    this.on(document, 'visibilitychange', () => this.clear());
    this.on(canvas, 'pointermove', (e: PointerEvent) => { if (e.pointerType !== 'touch') { this.touchAim = null; this.pointer = { x: e.clientX, y: e.clientY }; } });
    this.on(canvas, 'pointerdown', (e: PointerEvent) => { if (e.pointerType !== 'touch' && e.button === 0) { this.firing = true; this.pointer = { x: e.clientX, y: e.clientY }; } });
    this.on(window, 'pointerup', () => { this.firing = false; });
    this.on(canvas, 'wheel', (e: WheelEvent) => { e.preventDefault(); this.target = clamp(this.target - e.deltaY * .001, 0, 1); });
    this.on(canvas, 'contextmenu', (e: Event) => e.preventDefault());
  }
  private on(target: EventTarget, type: string, fn: (e: any) => void): void { target.addEventListener(type, fn, { passive: false }); this.cleanups.push(() => target.removeEventListener(type, fn)); }
  attachTouch(root: HTMLElement): void {
    for (const name of ['move', 'aim']) {
      const zone = root.querySelector<HTMLElement>(`[data-stick="${name}"]`)!;
      let id: number | null = null, start: Vec = { x: 0, y: 0 };
      const update = (e: PointerEvent) => {
        const v = { x: clamp((e.clientX - start.x) / 42, -1, 1), y: clamp((e.clientY - start.y) / 42, -1, 1) };
        const length = Math.hypot(v.x, v.y); if (length > 1) { v.x /= length; v.y /= length; }
        if (name === 'move') this.touchMove = v; else { this.touchAim = v; this.touchCast = true; }
        const knob = zone.querySelector<HTMLElement>('i')!; knob.style.transform = `translate(${v.x * 32}px,${v.y * 32}px)`;
      };
      this.on(zone, 'pointerdown', (e: PointerEvent) => { e.preventDefault(); id = e.pointerId; zone.setPointerCapture(id); start = { x: e.clientX, y: e.clientY }; update(e); });
      this.on(zone, 'pointermove', (e: PointerEvent) => { if (e.pointerId === id) update(e); });
      const end = () => { id = null; if (name === 'move') this.touchMove = { x: 0, y: 0 }; else this.touchCast = false; zone.querySelector<HTMLElement>('i')!.style.transform = ''; };
      this.on(zone, 'pointerup', end); this.on(zone, 'pointercancel', end);
    }
    root.querySelectorAll<HTMLElement>('[data-action]').forEach(button => {
      const action = button.dataset.action!;
      this.on(button, 'pointerdown', (e: PointerEvent) => { e.preventDefault(); button.setPointerCapture(e.pointerId); if (action === 'compress') this.touchDistribution = 1; else if (action === 'expand') this.touchDistribution = -1; else this.pressed.add(action); });
      const end = () => { this.pressed.delete(action); if (action === 'compress' || action === 'expand') this.touchDistribution = 0; };
      this.on(button, 'pointerup', end); this.on(button, 'pointercancel', end);
    });
  }
  sample(center: Vec, dt: number): Actions {
    const move = { x: Number(this.keys.has(bindings.right)) - Number(this.keys.has(bindings.left)) + this.touchMove.x, y: Number(this.keys.has(bindings.down)) - Number(this.keys.has(bindings.up)) + this.touchMove.y };
    const length = Math.hypot(move.x, move.y); if (length > 1) { move.x /= length; move.y /= length; }
    const delta = Number(this.keys.has(bindings.compress) || this.keys.has('ShiftRight')) - Number(this.keys.has(bindings.expand) || this.keys.has('ControlRight')) + this.touchDistribution;
    this.target = clamp(this.target + delta * dt / B.mass.transition, 0, 1);
    const buttons = this.tracker.sample({ primary: this.firing || this.touchCast, impulse: this.keys.has(bindings.impulse) || this.pressed.has('impulse'), pulse: this.keys.has(bindings.pulse) || this.pressed.has('pulse'), pull: this.keys.has(bindings.pull) || this.pressed.has('pull'), orbit: this.keys.has(bindings.orbit) || this.pressed.has('orbit') });
    return { move, aim: this.touchAim && Math.hypot(this.touchAim.x, this.touchAim.y) > .1 ? this.touchAim : { x: this.pointer.x - center.x, y: this.pointer.y - center.y }, distribution: this.target, cast: buttons.primary.held, impulse: buttons.impulse.held, pulse: buttons.pulse.held, surge: buttons.pull.held, orbit: buttons.orbit.held, buttons };
  }
  clear(): void { this.keys.clear(); this.pressed.clear(); this.firing = false; this.touchCast = false; this.touchMove = { x: 0, y: 0 }; this.touchDistribution = 0; }
  destroy(): void { this.cleanups.forEach(fn => fn()); this.clear(); }
}
