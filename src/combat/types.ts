export type FighterId = 'kaito' | 'nyra';
export type GameMode = 'competitive' | 'party' | 'training';
export type Phase = 'countdown' | 'active' | 'finished';
export type InputState = {
  left: boolean; right: boolean; up: boolean; down: boolean;
  jump: boolean; attack: boolean; special: boolean; shield: boolean;
};
export const EMPTY_INPUT: InputState = {
  left: false, right: false, up: false, down: false,
  jump: false, attack: false, special: false, shield: false,
};
export type AttackKind = 'melee' | 'projectile' | 'recovery';
export type AttackSpec = {
  name: string; kind: AttackKind; damage: number; knockback: number;
  growth: number; angle: number; startup: number; active: number;
  recovery: number; reach: number; vertical: number; height: number;
  color: number;
};
export type ActiveAttack = { spec: AttackSpec; frame: number; didHit: boolean; fired: boolean };
export type Fighter = {
  id: FighterId; slot: 0 | 1; x: number; y: number; vx: number; vy: number;
  facing: -1 | 1; grounded: boolean; jumpsLeft: number; recoveryUsed: boolean;
  dropFrames: number; coyoteFrames: number;
  damage: number; stocks: number; shield: number; stunFrames: number;
  invincibleFrames: number; respawnFrames: number; attack: ActiveAttack | null;
  previousInput: InputState; boostedFrames: number; pose: number;
};
export type Projectile = { owner: 0 | 1; x: number; y: number; vx: number; life: number; radius: number; spec: AttackSpec };
export type Platform = { x1: number; x2: number; y: number; dropThrough: boolean };
export type MatchResult = { winner: 0 | 1; reason: 'stocks' | 'time' };
export type RiftCore = { x: number; y: number } | null;
export const ARENA = {
  width: 960, height: 540,
  leftBlast: -115, rightBlast: 1075, upperBlast: -180, lowerBlast: 710,
  platforms: [
    { x1: 180, x2: 780, y: 425, dropThrough: false },
    { x1: 240, x2: 395, y: 329, dropThrough: true },
    { x1: 565, x2: 720, y: 329, dropThrough: true },
    { x1: 410, x2: 550, y: 249, dropThrough: true },
  ] as Platform[],
};
export const FIGHTERS: Record<FighterId, { name: string; title: string; speed: number; weight: number; jump: number; color: number; accent: number }> = {
  kaito: { name: 'KAITO', title: 'Thunder Fist', speed: 285, weight: 1, jump: 645, color: 0x258bff, accent: 0x8be9ff },
  nyra: { name: 'NYRA', title: 'Violet Flame', speed: 254, weight: 0.94, jump: 610, color: 0xbc53e9, accent: 0xf9b4ff },
};
