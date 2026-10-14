import { EMPTY_INPUT, type InputState } from './combat/types';

export class InputManager {
  private keys = new Set<string>();
  private touch: InputState = { ...EMPTY_INPUT };
  private live = true;
  private readonly joystick = document.getElementById('joystick')!;
  private readonly knob = document.getElementById('joystick-knob')!;
  private stickPointer: number | null = null;

  constructor() {
    window.addEventListener('keydown', event => {
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyJ', 'KeyK', 'KeyL', 'Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) event.preventDefault();
      this.keys.add(event.code);
    });
    window.addEventListener('keyup', event => this.keys.delete(event.code));
    window.addEventListener('blur', () => this.clear());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.clear(); });

    document.querySelectorAll<HTMLButtonElement>('[data-control]').forEach(button => {
      const control = button.dataset.control as keyof InputState;
      const activate = (event: PointerEvent) => {
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        this.touch[control] = true;
        button.classList.add('pressed');
      };
      const deactivate = (event: PointerEvent) => {
        event.preventDefault();
        this.touch[control] = false;
        button.classList.remove('pressed');
      };
      button.addEventListener('pointerdown', activate);
      button.addEventListener('pointerup', deactivate);
      button.addEventListener('pointercancel', deactivate);
      button.addEventListener('lostpointercapture', deactivate);
    });

    this.joystick.addEventListener('pointerdown', event => {
      event.preventDefault();
      this.stickPointer = event.pointerId;
      this.joystick.setPointerCapture(event.pointerId);
      this.moveStick(event);
    });
    this.joystick.addEventListener('pointermove', event => {
      if (this.stickPointer === event.pointerId) this.moveStick(event);
    });
    const release = (event: PointerEvent) => {
      if (event.pointerId !== this.stickPointer) return;
      this.stickPointer = null;
      this.touch.left = this.touch.right = this.touch.up = this.touch.down = this.touch.jump = false;
      this.knob.style.transform = 'translate(-50%, -50%)';
    };
    this.joystick.addEventListener('pointerup', release);
    this.joystick.addEventListener('pointercancel', release);
    this.joystick.addEventListener('lostpointercapture', release);
  }

  private moveStick(event: PointerEvent): void {
    const rect = this.joystick.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height * .44;
    const dx = event.clientX - cx;
    const dy = event.clientY - cy;
    const radius = Math.min(rect.width, rect.height) * 0.29;
    const scale = Math.min(1, radius / (Math.hypot(dx, dy) || 1));
    const x = dx * scale;
    const y = dy * scale;
    this.knob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    this.touch.left = x < -12;
    this.touch.right = x > 12;
    this.touch.up = y < -15;
    this.touch.down = y > 15;
    // Flicking joystick up is another way to jump on touch.
    this.touch.jump = this.touch.up;
  }

  getInput(): InputState {
    if (!this.live) return { ...EMPTY_INPUT };
    const has = (...codes: string[]) => codes.some(code => this.keys.has(code));
    return {
      left: has('KeyA', 'ArrowLeft') || this.touch.left,
      right: has('KeyD', 'ArrowRight') || this.touch.right,
      up: has('KeyW', 'ArrowUp') || this.touch.up,
      down: has('KeyS', 'ArrowDown') || this.touch.down,
      jump: has('KeyW', 'ArrowUp', 'Space') || this.touch.jump,
      attack: has('KeyJ') || this.touch.attack,
      special: has('KeyK') || this.touch.special,
      shield: has('KeyL', 'ShiftLeft', 'ShiftRight') || this.touch.shield,
    };
  }

  setEnabled(enabled: boolean): void { this.live = enabled; if (!enabled) this.clear(); }
  clear(): void {
    this.keys.clear();
    this.touch = { ...EMPTY_INPUT };
    this.stickPointer = null;
    this.knob.style.transform = 'translate(-50%, -50%)';
    document.querySelectorAll('.touch-button').forEach(btn => btn.classList.remove('pressed'));
  }
}
