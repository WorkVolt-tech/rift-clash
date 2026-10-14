import { describe, expect, it } from 'vitest';
import { CombatEngine } from './engine';
import { EMPTY_INPUT } from './types';

function runningEngine(mode: 'competitive' | 'party' | 'training' = 'competitive'): CombatEngine {
  const game = new CombatEngine();
  game.start(mode, 'kaito');
  for (let i = 0; i < 120; i++) game.step(EMPTY_INPUT);
  return game;
}

describe('RIFT CLASH combat basics', () => {
  it('starts with fair stocks and expected match modes', () => {
    const competitive = runningEngine();
    expect(competitive.phase).toBe('active');
    expect(competitive.fighters.map(f => f.stocks)).toEqual([3, 3]);
    expect(competitive.timeLeft).toBe(360);
    const party = runningEngine('party');
    expect(party.timeLeft).toBe(300);
  });

  it('jumps, lands and resets the double jump', () => {
    const game = runningEngine();
    game.step({ ...EMPTY_INPUT, jump: true, up: true });
    expect(game.fighters[0].grounded).toBe(false);
    for (let i = 0; i < 11; i++) game.step(EMPTY_INPUT);
    game.step({ ...EMPTY_INPUT, jump: true });
    expect(game.fighters[0].jumpsLeft).toBe(0);
    for (let i = 0; i < 160; i++) game.step(EMPTY_INPUT);
    expect(game.fighters[0].grounded).toBe(true);
    expect(game.fighters[0].jumpsLeft).toBe(1);
  });

  it('does not give damage from a distant melee attack', () => {
    const game = runningEngine();
    game.step({ ...EMPTY_INPUT, attack: true });
    for (let i = 0; i < 40; i++) game.step(EMPTY_INPUT);
    expect(game.fighters[1].damage).toBe(0);
  });

  it('registers a hit and raises damage from nearby attacks', () => {
    const game = runningEngine();
    game.fighters[0].x = 495;
    game.fighters[1].x = 540;
    game.step({ ...EMPTY_INPUT, attack: true });
    for (let i = 0; i < 10; i++) game.step(EMPTY_INPUT);
    expect(game.fighters[1].damage).toBeGreaterThan(0);
    expect(game.fighters[1].stunFrames).toBeGreaterThan(0);
  });

  it('depletes stocks and determines the match winner', () => {
    const game = runningEngine();
    for (let stock = 3; stock > 0; stock--) {
      game.fighters[1].respawnFrames = 0;
      game.fighters[1].x = 2000;
      game.step(EMPTY_INPUT);
      expect(game.fighters[1].stocks).toBe(stock - 1);
    }
    expect(game.phase).toBe('finished');
    expect(game.result?.winner).toBe(0);
  });

  it('never enables hazards or items in competitive mode', () => {
    const game = runningEngine();
    for (let i = 0; i < 2000; i++) game.step(EMPTY_INPUT);
    expect(game.hazardState).toBe('off');
    expect(game.riftCore).toBeNull();
  });

  it('spawns Rift Cores in party mode', () => {
    const game = runningEngine('party');
    for (let i = 0; i < 8 * 60; i++) game.step(EMPTY_INPUT);
    expect(game.riftCore).not.toBeNull();
  });
});
