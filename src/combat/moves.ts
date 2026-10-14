import type { AttackSpec, FighterId, InputState } from './types';
const move = (
  name: string, damage: number, knockback: number, growth: number, angle: number,
  startup: number, active: number, recovery: number, reach: number, vertical: number,
  height: number, color: number, kind: AttackSpec['kind'] = 'melee',
): AttackSpec => ({ name, damage, knockback, growth, angle, startup, active, recovery, reach, vertical, height, color, kind });

export const MOVES: Record<FighterId, Record<string, AttackSpec>> = {
  kaito: {
    neutral: move('Spark Jab', 5, 210, 3.3, 28, 4, 5, 10, 56, -33, 43, 0x73deff),
    side: move('Volt Hook', 10, 305, 4.2, 35, 10, 6, 17, 79, -35, 49, 0x44cfff),
    up: move('Skybreaker', 8, 265, 4.4, 75, 8, 8, 15, 51, -69, 80, 0xa5f4fc),
    down: move('Ground Sweep', 7, 240, 3.5, 21, 7, 6, 16, 72, -10, 25, 0x3baeff),
    air: move('Arc Kick', 7, 235, 4, 50, 6, 8, 12, 74, -27, 58, 0x8de5ff),
    special: move('Volt Strike', 12, 345, 4.6, 32, 8, 11, 22, 91, -36, 52, 0x00edff),
    recovery: move('Thunder Upper', 8, 225, 3.4, 78, 6, 10, 20, 68, -55, 88, 0x68faff, 'recovery'),
  },
  nyra: {
    neutral: move('Veil Palm', 6, 205, 3.3, 36, 5, 6, 12, 68, -35, 46, 0xe6a3ff),
    side: move('Phantom Lash', 11, 285, 4.1, 38, 11, 7, 19, 104, -39, 48, 0xda7dff),
    up: move('Astral Bloom', 8, 240, 4.1, 80, 8, 10, 20, 65, -72, 95, 0xf4b4ff),
    down: move('Rift Scythe', 7, 235, 3.5, 20, 9, 7, 14, 81, -10, 27, 0xb977ee),
    air: move('Midnight Spiral', 7, 220, 3.8, 55, 7, 9, 14, 74, -28, 62, 0xf5baff),
    special: move('Violet Orb', 9, 260, 4.2, 35, 12, 1, 25, 0, 0, 0, 0xd879ff, 'projectile'),
    recovery: move('Veil Step', 4, 190, 2.5, 75, 7, 8, 21, 65, -35, 66, 0xf19cff, 'recovery'),
  },
};

export function attackFor(id: FighterId, input: InputState, grounded: boolean, special: boolean): AttackSpec {
  const list = MOVES[id];
  if (special) return input.up ? list.recovery : list.special;
  if (!grounded) return list.air;
  if (input.up) return list.up;
  if (input.down) return list.down;
  if (input.left || input.right) return list.side;
  return list.neutral;
}
