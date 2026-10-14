import * as Phaser from 'phaser';
import { CombatEngine } from '../combat/engine';
import { getCpuInput } from '../combat/ai';
import { ARENA, FIGHTERS, type Fighter, type FighterId, type GameMode } from '../combat/types';
import type { InputManager } from '../input';

type Callbacks = { onHud: (engine: CombatEngine) => void; onResult: (engine: CombatEngine) => void };

export class FightScene extends Phaser.Scene {
  readonly combat = new CombatEngine();
  private inputManager: InputManager;
  private callbacks: Callbacks;
  private background!: Phaser.GameObjects.Graphics;
  private stage!: Phaser.GameObjects.Graphics;
  private action!: Phaser.GameObjects.Graphics;
  private accumulator = 0;
  private playing = false;
  private paused = false;
  private notified = false;
  private hudFrame = 0;

  constructor(inputManager: InputManager, callbacks: Callbacks) {
    super({ key: 'Fight' });
    this.inputManager = inputManager;
    this.callbacks = callbacks;
  }

  create(): void {
    this.background = this.add.graphics();
    this.stage = this.add.graphics();
    this.action = this.add.graphics();
    this.drawBackground();
    this.drawStage();
  }

  startMatch(mode: GameMode, fighter: FighterId): void {
    this.combat.start(mode, fighter);
    this.playing = true;
    this.paused = false;
    this.notified = false;
    this.accumulator = 0;
    this.inputManager.setEnabled(true);
    this.callbacks.onHud(this.combat);
  }
  stopMatch(): void {
    this.playing = false;
    this.paused = false;
    this.countdownText?.setVisible(false);
    this.inputManager.setEnabled(false);
  }
  setPaused(value: boolean): void {
    this.paused = value;
    this.inputManager.setEnabled(!value);
  }
  isPaused(): boolean { return this.paused; }

  update(_time: number, delta: number): void {
    if (this.playing && !this.paused) {
      this.accumulator = Math.min(this.accumulator + Math.min(delta, 100) / 1000, 0.1);
      let loops = 0;
      while (this.accumulator >= 1 / 60 && loops < 6) {
        this.combat.step(this.inputManager.getInput(), getCpuInput(this.combat));
        this.accumulator -= 1 / 60;
        loops++;
      }
      if (++this.hudFrame % 6 === 0) this.callbacks.onHud(this.combat);
      if (this.combat.phase === 'finished' && !this.notified) {
        this.notified = true;
        this.callbacks.onHud(this.combat);
        this.callbacks.onResult(this.combat);
      }
    }
    this.renderAction();
  }

  private drawBackground(): void {
    const g = this.background;
    g.fillGradientStyle(0x0b112b, 0x0b112b, 0x352548, 0x352548, 1);
    g.fillRect(0, 0, 960, 540);
    // Far skyline — deterministic geometry and windows.
    for (let i = 0; i < 41; i++) {
      const x = i * 25 - 8;
      const h = 115 + ((i * 37) % 130);
      g.fillStyle(i % 3 ? 0x111930 : 0x1b2341, 0.95);
      g.fillRect(x, 380 - h, 20 + (i % 3) * 6, h + 160);
      for (let y = 0; y < h - 8; y += 18) {
        if ((y + i * 7) % 5 !== 0) {
          g.fillStyle(i % 4 ? 0x5885c0 : 0xe15ea4, 0.3);
          g.fillRect(x + 5, 380 - h + y + 5, 3, 6);
        }
      }
    }
    g.fillStyle(0x202440, 0.85);
    g.fillRect(0, 410, 960, 130);
    g.fillStyle(0x131b31, 0.85);
    g.fillRect(0, 492, 960, 48);
    // Giant dimensional tear in the skyline.
    g.lineStyle(10, 0x913bea, 0.18);
    g.strokeEllipse(480, 140, 200, 206);
    g.lineStyle(5, 0xc681ff, 0.35);
    g.strokeEllipse(480, 140, 171, 185);
    g.lineStyle(3, 0x85eaff, 0.7);
    g.lineBetween(456, 48, 498, 89); g.lineBetween(498, 89, 463, 127);
    g.lineBetween(463, 127, 513, 165); g.lineBetween(513, 165, 470, 234);
    g.fillStyle(0xcbb4ff, 0.7);
    for (let i = 0; i < 38; i++) {
      const x = (i * 181 + 33) % 960;
      const y = (i * 73 + 49) % 365;
      g.fillCircle(x, y, i % 7 === 0 ? 2 : 1);
    }
    // City neon signs and accents.
    g.fillStyle(0x42c5ff, .3); g.fillRect(60, 290, 91, 9);
    g.fillStyle(0xfa48cb, .45); g.fillRect(795, 280, 80, 7);
  }

  private drawStage(): void {
    const g = this.stage;
    for (const p of ARENA.platforms) {
      const h = p.dropThrough ? 12 : 33;
      g.fillStyle(0x080e22, 0.5); g.fillRoundedRect(p.x1 - 2, p.y + 12, p.x2 - p.x1 + 4, h + 10, 4);
      g.fillStyle(0x263450, 1); g.fillRoundedRect(p.x1, p.y, p.x2 - p.x1, h, 5);
      g.fillStyle(0x506684, 1); g.fillRoundedRect(p.x1, p.y, p.x2 - p.x1, 8, 3);
      g.fillStyle(p.dropThrough ? 0xb36bfa : 0x4ee2fc, 1); g.fillRect(p.x1 + 6, p.y, p.x2 - p.x1 - 12, 3);
      g.lineStyle(1.5, 0x8294b8, .65); g.strokeRoundedRect(p.x1, p.y, p.x2 - p.x1, h, 5);
      for (let x = p.x1 + 24; x < p.x2 - 8; x += 57) {
        g.fillStyle(0x84b3f8, .2); g.fillRect(x, p.y + 13, 22, 3);
      }
    }
  }

  private renderAction(): void {
    if (!this.action) return;
    const g = this.action;
    g.clear();
    const engine = this.combat;
    if (!this.playing) return;
    if (engine.mode === 'party') this.drawParty(g);
    for (const projectile of engine.projectiles) {
      g.fillStyle(projectile.spec.color, 0.12); g.fillCircle(projectile.x, projectile.y, 35);
      g.fillStyle(projectile.spec.color, .85); g.fillCircle(projectile.x, projectile.y, projectile.radius);
      g.lineStyle(3, 0xffffff, .9); g.strokeCircle(projectile.x, projectile.y, projectile.radius - 4);
    }
    for (const fighter of engine.fighters) this.drawFighter(g, fighter);
    for (const flash of engine.hitFlashes) {
      g.fillStyle(flash.color, flash.life / 27); g.fillCircle(flash.x, flash.y, 7 + (25 - flash.life) * 1.6);
      g.lineStyle(3, 0xffffff, flash.life / 22); g.strokeCircle(flash.x, flash.y, 11 + (19 - flash.life));
    }
    if (engine.phase === 'countdown') {
      const number = Math.ceil(engine.countdown / 60);
      this.drawMessage(g, number > 0 ? String(number) : 'FIGHT!');
    } else this.countdownText?.setVisible(false);
  }

  private drawFighter(g: Phaser.GameObjects.Graphics, f: Fighter): void {
    if (f.respawnFrames > 0) return;
    const palette = FIGHTERS[f.id];
    const x = f.x;
    const y = f.y;
    const dir = f.facing;
    const running = f.grounded && Math.abs(f.vx) > 55;
    const step = running ? Math.sin(f.pose * 9) * 8 : 0;
    const bob = f.grounded ? Math.sin(f.pose * 2) * 1.3 : 0;
    const shielded = f.previousInput.shield && f.shield > 0 && !f.attack;
    const blinking = f.invincibleFrames > 0 && Math.floor(f.invincibleFrames / 6) % 2 === 0;
    if (blinking) return;
    g.fillStyle(0x080c1a, .45);
    g.fillEllipse(x, Math.min(y + 3, 426), 42, 10);
    if (f.boostedFrames > 0) { g.lineStyle(2, 0xffc55f, .7); g.strokeEllipse(x, y - 37, 53, 90); }
    if (shielded) {
      g.fillStyle(0x65ddff, .12); g.fillCircle(x, y - 36, 44);
      g.lineStyle(3, 0x83f8ff, .75); g.strokeCircle(x, y - 36, 44);
    }
    // Legs + shoes
    g.lineStyle(11, f.id === 'kaito' ? 0x101c3c : 0x242039, 1);
    g.lineBetween(x - 8, y - 25 + bob, x - 9 + step, y - 6);
    g.lineBetween(x + 8, y - 25 + bob, x + 9 - step, y - 6);
    g.fillStyle(0xe9f6ff, 1);
    g.fillRoundedRect(x - 20 + step, y - 10, 20, 9, 3);
    g.fillRoundedRect(x + 1 - step, y - 10, 20, 9, 3);
    // Body, belt and glowing detail
    g.fillStyle(palette.color, 1);
    g.fillRoundedRect(x - 17, y - 68 + bob, 34, 46, 8);
    g.fillStyle(f.id === 'kaito' ? 0x17294b : 0x361641, 1);
    g.fillRect(x - 14, y - 35 + bob, 28, 7);
    g.fillStyle(palette.accent, .95);
    g.fillRect(x - 3, y - 60 + bob, 6, 19);
    // Head, distinctive hair and face profile
    g.fillStyle(f.id === 'kaito' ? 0xa9674e : 0xa77365, 1);
    g.fillCircle(x, y - 79 + bob, 14);
    g.fillStyle(0x101225, 1);
    if (f.id === 'kaito') {
      g.fillRoundedRect(x - 13, y - 95 + bob, 26, 9, 3);
      g.fillTriangle(x - 9, y - 90 + bob, x - 16, y - 107 + bob, x - 2, y - 94 + bob);
    } else {
      g.fillEllipse(x - dir * 11, y - 73 + bob, 11, 57);
      g.fillRoundedRect(x - 14, y - 97 + bob, 28, 10, 4);
    }
    g.fillStyle(0xffffff, 1); g.fillCircle(x + dir * 7, y - 80 + bob, 2);
    // Arms and energy weapon, reaching forward when attacking.
    const active = f.attack && f.attack.frame >= f.attack.spec.startup && f.attack.frame < f.attack.spec.startup + f.attack.spec.active;
    const armExt = active ? Math.min(f.attack?.spec.reach ?? 50, 95) * .7 : 21;
    g.lineStyle(10, f.id === 'kaito' ? 0x1764b9 : 0x7b36b5, 1);
    g.lineBetween(x - dir * 10, y - 59 + bob, x - dir * 18, y - 37 + bob);
    g.lineBetween(x + dir * 11, y - 56 + bob, x + dir * armExt, y - 48 + bob);
    g.fillStyle(palette.accent, 1);
    g.fillCircle(x + dir * armExt, y - 48 + bob, active ? 13 : 8);
    g.fillStyle(0xffffff, .75); g.fillCircle(x + dir * armExt, y - 48 + bob, 3);
    if (active) {
      g.lineStyle(3, palette.accent, .8);
      g.strokeEllipse(x + dir * (armExt + 10), y - 47, 25, 44);
      g.lineBetween(x + dir * armExt, y - 64, x + dir * (armExt + 17), y - 85);
    }
    // Fighter name and shield below feet, with contrasting shadow.
    g.fillStyle(0x080d20, .75); g.fillRoundedRect(x - 29, y + 9, 58, 16, 5);
    g.fillStyle(palette.color, 1); g.fillRect(x - 27, y + 11, 54 * Math.max(0, Math.min(1, f.shield / 100)), 3);
  }

  private drawParty(g: Phaser.GameObjects.Graphics): void {
    const engine = this.combat;
    if (engine.riftCore) {
      const { x, y } = engine.riftCore;
      g.fillStyle(0xffd36c, .2); g.fillCircle(x, y, 25);
      g.fillStyle(0xffd46e, 1); g.fillCircle(x, y, 12);
      g.lineStyle(2, 0xffffff, .9); g.strokeCircle(x, y, 15);
    }
    if (engine.hazardState !== 'off') {
      const blast = engine.hazardState === 'blast';
      g.fillStyle(0xc961fb, blast ? .35 : .08); g.fillEllipse(480, 405, 440, blast ? 180 : 20);
      g.lineStyle(blast ? 9 : 3, 0xec9fff, blast ? 1 : .7); g.strokeEllipse(480, 405, 455, blast ? 160 : 35);
    }
  }

  private drawMessage(g: Phaser.GameObjects.Graphics, number: string): void {
    // Countdown backing circle; DOM toast communicates the number accessibly.
    g.fillStyle(0x10132c, .7); g.fillCircle(480, 165, 51);
    g.lineStyle(5, 0x8feaff, .8); g.strokeCircle(480, 165, 50);
    // Use native Phaser text separately for legible countdown, created on demand below.
    if (!this.countdownText) {
      this.countdownText = this.add.text(480, 165, number, { fontFamily: 'Arial, sans-serif', fontStyle: 'bold', fontSize: '48px', color: '#ffffff' }).setOrigin(.5).setDepth(10);
    }
    this.countdownText.setText(number).setVisible(true);
  }
  private countdownText?: Phaser.GameObjects.Text;
}
