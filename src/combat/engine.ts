import { ARENA, EMPTY_INPUT, FIGHTERS, type ActiveAttack, type Fighter, type FighterId, type GameMode, type InputState, type MatchResult, type Phase, type Projectile, type RiftCore } from './types';
import { attackFor } from './moves';

const DT = 1 / 60;
const GRAVITY = 1580;
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const copyInput = (input: InputState): InputState => ({ ...input });

function newFighter(id: FighterId, slot: 0 | 1): Fighter {
  return {
    id, slot, x: slot === 0 ? 360 : 600, y: 425, vx: 0, vy: 0,
    facing: slot === 0 ? 1 : -1, grounded: true, jumpsLeft: 1, recoveryUsed: false,
    dropFrames: 0, coyoteFrames: 5, damage: 0, stocks: 3, shield: 100,
    stunFrames: 0, invincibleFrames: 0, respawnFrames: 0, attack: null,
    previousInput: copyInput(EMPTY_INPUT), boostedFrames: 0, pose: 0,
  };
}

export class CombatEngine {
  mode: GameMode = 'competitive';
  fighters: [Fighter, Fighter] = [newFighter('kaito', 0), newFighter('nyra', 1)];
  projectiles: Projectile[] = [];
  riftCore: RiftCore = null;
  phase: Phase = 'countdown';
  countdown = 120;
  timeLeft = 360;
  elapsedFrames = 0;
  hazardState: 'off' | 'warning' | 'blast' = 'off';
  hazardFrames = 0;
  result: MatchResult | null = null;
  hitFlashes: { x: number; y: number; life: number; color: number }[] = [];

  start(mode: GameMode, playerId: FighterId): void {
    this.mode = mode;
    this.fighters = [newFighter(playerId, 0), newFighter(playerId === 'kaito' ? 'nyra' : 'kaito', 1)];
    this.projectiles = [];
    this.riftCore = null;
    this.hitFlashes = [];
    this.timeLeft = mode === 'party' ? 300 : mode === 'training' ? Infinity : 360;
    this.phase = 'countdown';
    this.countdown = 120;
    this.elapsedFrames = 0;
    this.hazardState = 'off';
    this.hazardFrames = 0;
    this.result = null;
  }

  step(playerInput: InputState, opponentInput: InputState = EMPTY_INPUT): void {
    if (this.phase === 'finished') return;
    if (this.phase === 'countdown') {
      this.countdown--;
      if (this.countdown <= 0) this.phase = 'active';
      return;
    }
    this.elapsedFrames++;
    if (this.mode !== 'training') {
      this.timeLeft = Math.max(0, this.timeLeft - DT);
      if (this.timeLeft <= 0) { this.finishOnTime(); return; }
    }
    this.stepFighter(this.fighters[0], playerInput);
    this.stepFighter(this.fighters[1], opponentInput);
    this.fighters[0].facing = this.fighters[0].x < this.fighters[1].x ? 1 : -1;
    this.fighters[1].facing = this.fighters[1].x < this.fighters[0].x ? 1 : -1;
    this.resolveAttack(this.fighters[0], this.fighters[1], opponentInput);
    this.resolveAttack(this.fighters[1], this.fighters[0], playerInput);
    this.updateProjectiles([playerInput, opponentInput]);
    if (this.mode === 'party') this.updateParty();
    this.hitFlashes = this.hitFlashes.filter(effect => --effect.life > 0);
    for (const fighter of this.fighters) this.checkKO(fighter);
  }

  private stepFighter(f: Fighter, input: InputState): void {
    if (f.respawnFrames > 0) { f.respawnFrames--; f.previousInput = copyInput(input); return; }
    if (f.invincibleFrames > 0) f.invincibleFrames--;
    if (f.boostedFrames > 0) f.boostedFrames--;
    if (f.dropFrames > 0) f.dropFrames--;
    if (f.stunFrames > 0) f.stunFrames--;
    const prev = f.previousInput;
    const jumpPressed = input.jump && !prev.jump;
    const attackPressed = input.attack && !prev.attack;
    const specialPressed = input.special && !prev.special;
    const guarding = input.shield && f.stunFrames === 0 && !f.attack && f.shield > 0;
    f.shield = clamp(f.shield + (guarding ? 0 : 0.26), 0, 100);
    if (guarding) f.shield = Math.max(0, f.shield - 0.07);

    if (f.stunFrames === 0 && !guarding) {
      const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      const accel = f.grounded ? 0.42 : 0.17;
      const speed = FIGHTERS[f.id].speed * (f.attack ? 0.42 : 1);
      f.vx += (direction * speed - f.vx) * accel;
      if (Math.abs(f.vx) < 1) f.vx = 0;

      if (jumpPressed) {
        if (f.grounded && input.down && this.isOnUpperPlatform(f)) {
          f.grounded = false; f.dropFrames = 16; f.vy = 65; f.y += 5;
        } else if (f.grounded || f.coyoteFrames > 0) {
          f.vy = -FIGHTERS[f.id].jump; f.grounded = false; f.coyoteFrames = 0;
        } else if (f.jumpsLeft > 0) {
          f.vy = -FIGHTERS[f.id].jump * 0.86; f.jumpsLeft--;
        }
      }
      if (specialPressed && !f.attack) {
        const spec = attackFor(f.id, input, f.grounded, true);
        if (spec.kind !== 'recovery' || !f.recoveryUsed) {
          f.attack = { spec, frame: 0, didHit: false, fired: false };
          if (spec.kind === 'recovery') {
            f.recoveryUsed = true;
            f.grounded = false;
            if (f.id === 'kaito') { f.vy = -720; f.vx = f.facing * 140; }
            else { f.vy = -590; f.vx = ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * 390; f.invincibleFrames = 12; }
          } else if (f.id === 'kaito') f.vx = f.facing * 530;
        }
      } else if (attackPressed && !f.attack) {
        f.attack = { spec: attackFor(f.id, input, f.grounded, false), frame: 0, didHit: false, fired: false };
      }
    } else if (guarding) f.vx *= 0.72;

    if (!f.grounded) {
      f.vy += GRAVITY * DT * (input.down && f.vy > 0 ? 1.45 : 1);
      f.vy = clamp(f.vy, -800, 950);
    } else {
      f.vy = 0;
      f.coyoteFrames = 5;
    }
    f.x += f.vx * DT;
    const oldY = f.y;
    f.y += f.vy * DT;
    if (!f.grounded && f.vy >= 0) this.landOnPlatform(f, oldY);
    if (f.grounded && !this.hasGroundBelow(f)) { f.grounded = false; f.coyoteFrames = 5; }
    else if (!f.grounded && f.coyoteFrames > 0) f.coyoteFrames--;
    f.pose += DT * (1 + Math.abs(f.vx) / 180);
    f.previousInput = copyInput(input);
  }

  private hasGroundBelow(f: Fighter): boolean {
    return ARENA.platforms.some(p => f.x > p.x1 - 10 && f.x < p.x2 + 10 && Math.abs(f.y - p.y) < 6);
  }
  private isOnUpperPlatform(f: Fighter): boolean {
    return ARENA.platforms.some(p => p.dropThrough && f.x > p.x1 && f.x < p.x2 && Math.abs(f.y - p.y) < 8);
  }
  private landOnPlatform(f: Fighter, oldY: number): void {
    for (const p of [...ARENA.platforms].sort((a, b) => a.y - b.y)) {
      if (p.dropThrough && f.dropFrames > 0) continue;
      if (f.x > p.x1 - 10 && f.x < p.x2 + 10 && oldY <= p.y + 5 && f.y >= p.y) {
        f.y = p.y; f.vy = 0; f.grounded = true; f.jumpsLeft = 1; f.recoveryUsed = false;
        return;
      }
    }
  }

  private resolveAttack(attacker: Fighter, target: Fighter, targetInput: InputState): void {
    const attack = attacker.attack;
    if (!attack) return;
    attack.frame++;
    const { spec } = attack;
    if (spec.kind === 'projectile' && !attack.fired && attack.frame >= spec.startup) {
      this.projectiles.push({ owner: attacker.slot, x: attacker.x + attacker.facing * 43, y: attacker.y - 40, vx: attacker.facing * 460, radius: 19, life: 100, spec });
      attack.fired = true;
    }
    const active = attack.frame >= spec.startup && attack.frame < spec.startup + spec.active;
    if (active && spec.kind !== 'projectile' && !attack.didHit && target.respawnFrames === 0) {
      const forward = (target.x - attacker.x) * attacker.facing;
      const centerY = attacker.y + spec.vertical;
      if (forward > -16 && forward < spec.reach && Math.abs((target.y - 35) - centerY) < (spec.height + 50) / 2) {
        if (this.applyHit(target, targetInput, spec, attacker.facing, attacker)) attack.didHit = true;
      }
    }
    if (attack.frame >= spec.startup + spec.active + spec.recovery) attacker.attack = null;
  }

  private applyHit(target: Fighter, input: InputState, spec: ActiveAttack['spec'], direction: number, attacker?: Fighter): boolean {
    if (target.invincibleFrames > 0 || target.respawnFrames > 0) return false;
    const blocking = input.shield && target.shield > 0 && target.stunFrames === 0 && !target.attack;
    if (blocking) {
      target.shield = Math.max(0, target.shield - (spec.damage * 4 + 5));
      if (target.shield === 0) target.stunFrames = 90;
      this.hitFlashes.push({ x: target.x, y: target.y - 38, life: 12, color: 0x6df7ff });
      return true;
    }
    const boosted = attacker && attacker.boostedFrames > 0 ? 1.28 : 1;
    target.damage = clamp(target.damage + spec.damage * boosted, 0, 999);
    const power = Math.min(1100, (spec.knockback + target.damage * spec.growth) / FIGHTERS[target.id].weight);
    const angle = spec.angle * Math.PI / 180;
    target.vx = Math.cos(angle) * power * direction;
    target.vy = -Math.sin(angle) * power;
    target.grounded = false;
    target.stunFrames = Math.round(clamp(10 + target.damage * 0.19, 12, 43));
    target.attack = null;
    this.hitFlashes.push({ x: target.x, y: target.y - 38, life: 17, color: spec.color });
    return true;
  }

  private updateProjectiles(inputs: [InputState, InputState]): void {
    for (const p of this.projectiles) {
      p.x += p.vx * DT; p.life--;
      const targetSlot = p.owner === 0 ? 1 : 0;
      const target = this.fighters[targetSlot];
      if (Math.abs(p.x - target.x) < p.radius + 19 && Math.abs(p.y - (target.y - 36)) < p.radius + 29) {
        if (this.applyHit(target, inputs[targetSlot], p.spec, Math.sign(p.vx), this.fighters[p.owner])) p.life = 0;
      }
    }
    this.projectiles = this.projectiles.filter(p => p.life > 0 && p.x > -120 && p.x < 1080);
  }

  private updateParty(): void {
    if (this.elapsedFrames % (20 * 60) === 0 || (this.elapsedFrames === 8 * 60)) {
      if (!this.riftCore) this.riftCore = { x: 290 + (Math.floor(this.elapsedFrames / 60) % 3) * 180, y: 392 };
    }
    if (this.riftCore) {
      for (const f of this.fighters) {
        if (f.respawnFrames === 0 && Math.abs(f.x - this.riftCore.x) < 27 && Math.abs((f.y - 32) - this.riftCore.y) < 44) {
          f.boostedFrames = 8 * 60;
          this.hitFlashes.push({ x: f.x, y: f.y - 38, life: 28, color: 0xffd67a });
          this.riftCore = null;
          break;
        }
      }
    }
    if (this.elapsedFrames % (30 * 60) === 15 * 60) {
      this.hazardState = 'warning'; this.hazardFrames = 120;
    }
    if (this.hazardFrames > 0) {
      this.hazardFrames--;
      if (this.hazardFrames === 0 && this.hazardState === 'warning') {
        this.hazardState = 'blast'; this.hazardFrames = 24;
        for (const f of this.fighters) {
          if (Math.abs(f.x - 480) < 230 && Math.abs(f.y - 405) < 155) {
            const direction = f.x < 480 ? -1 : 1;
            this.applyHit(f, EMPTY_INPUT, { name: 'Rift Pulse', kind: 'melee', damage: 6, knockback: 370, growth: 3, angle: 48, startup: 0, active: 0, recovery: 0, reach: 0, vertical: 0, height: 0, color: 0xe8a0ff }, direction);
          }
        }
      } else if (this.hazardFrames === 0 && this.hazardState === 'blast') this.hazardState = 'off';
    }
  }

  private checkKO(f: Fighter): void {
    if (f.respawnFrames > 0 || this.phase === 'finished') return;
    if (f.x < ARENA.leftBlast || f.x > ARENA.rightBlast || f.y < ARENA.upperBlast || f.y > ARENA.lowerBlast) {
      if (this.mode === 'training') f.stocks = 3;
      else f.stocks--;
      if (f.stocks <= 0) { this.phase = 'finished'; this.result = { winner: f.slot === 0 ? 1 : 0, reason: 'stocks' }; return; }
      f.x = f.slot === 0 ? 365 : 595;
      f.y = 150; f.vx = 0; f.vy = 0; f.damage = 0;
      f.attack = null; f.stunFrames = 0; f.jumpsLeft = 1;
      f.recoveryUsed = false; f.grounded = false;
      f.respawnFrames = 45; f.invincibleFrames = 145;
      f.shield = 100;
    }
  }

  private finishOnTime(): void {
    const [a, b] = this.fighters;
    const winner = a.stocks !== b.stocks ? (a.stocks > b.stocks ? 0 : 1) : (a.damage <= b.damage ? 0 : 1);
    this.result = { winner, reason: 'time' }; this.phase = 'finished';
  }
}
