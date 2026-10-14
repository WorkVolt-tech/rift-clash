import type { CombatEngine } from './engine';
import { EMPTY_INPUT, type InputState } from './types';

// Lightweight deterministic CPU for the alpha. Decision impulses have gaps so
// one held button doesn't magically trigger attacks every simulation frame.
export function getCpuInput(engine: CombatEngine): InputState {
  if (engine.mode === 'training' || engine.phase !== 'active') return { ...EMPTY_INPUT };
  const cpu = engine.fighters[1];
  const target = engine.fighters[0];
  const frame = engine.elapsedFrames;
  const dx = target.x - cpu.x;
  const dy = target.y - cpu.y;
  const offstage = cpu.x < 180 || cpu.x > 780 || cpu.y > 440;
  const input: InputState = { ...EMPTY_INPUT };

  if (offstage) {
    input.right = cpu.x < 480;
    input.left = cpu.x > 480;
    if (frame % 35 === 2 && !cpu.grounded) input.jump = true;
    if (!cpu.grounded && !cpu.recoveryUsed && cpu.vy > 20 && frame % 38 === 5) {
      input.up = true; input.special = true;
    }
    return input;
  }

  const approach = Math.abs(dx) > (cpu.id === 'nyra' ? 240 : 74);
  if (approach) { input.right = dx > 0; input.left = dx < 0; }
  if (Math.abs(dy) > 65 && target.y < cpu.y && cpu.grounded && frame % 52 === 0) input.jump = true;
  if (Math.abs(dx) < 105 && Math.abs(dy) < 65) {
    if (frame % 42 === 1) input.attack = true;
    if (frame % 137 === 23) { input.special = true; input.up = true; }
    if (target.attack && frame % 47 < 16 && cpu.shield > 26) input.shield = true;
  } else if (cpu.id === 'nyra' && Math.abs(dx) < 520 && Math.abs(dy) < 85 && frame % 115 === 8) {
    input.special = true;
  } else if (cpu.id === 'kaito' && Math.abs(dx) < 210 && Math.abs(dy) < 80 && frame % 110 === 8) {
    input.special = true;
  }
  return input;
}
