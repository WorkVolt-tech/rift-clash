import * as Phaser from 'phaser';
import './style.css';
import { InputManager } from './input';
import { FightScene } from './game/FightScene';
import { FIGHTERS, type FighterId, type GameMode } from './combat/types';
import type { CombatEngine } from './combat/engine';

const el = (id: string) => document.getElementById(id)!;
const input = new InputManager();
let mode: GameMode = 'competitive';
let fighter: FighterId = 'kaito';
let view: 'home' | 'select' | 'playing' | 'ended' | 'paused' = 'home';
let scene: FightScene;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return '∞';
  const n = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
}
function renderHUD(engine: CombatEngine): void {
  const [p, c] = engine.fighters;
  el('p-name').textContent = FIGHTERS[p.id].name;
  el('cpu-name').textContent = `${FIGHTERS[c.id].name} · ${mode === 'training' ? 'DUMMY' : 'CPU'}`;
  el('p-damage').textContent = `${Math.round(p.damage)}%`;
  el('cpu-damage').textContent = `${Math.round(c.damage)}%`;
  el('p-stocks').textContent = mode === 'training' ? '∞' : '● '.repeat(p.stocks).trim();
  el('cpu-stocks').textContent = mode === 'training' ? '∞' : '● '.repeat(c.stocks).trim();
  el('p-shield').style.width = `${p.shield}%`;
  el('cpu-shield').style.width = `${c.shield}%`;
  el('timer').textContent = formatTime(engine.timeLeft);
  el('hud-mode').textContent = mode.toUpperCase();
  el('toast').textContent = engine.phase === 'countdown' ? `${Math.ceil(engine.countdown / 60)}` : '';
  if (engine.mode === 'party' && engine.hazardState === 'warning') el('toast').textContent = '⚠ RIFT PULSE INCOMING';
}
function show(name: typeof view): void {
  view = name;
  for (const id of ['home', 'select', 'end-screen', 'pause-screen']) el(id).classList.add('hidden');
  const screens: Partial<Record<typeof view, string>> = { home: 'home', select: 'select', ended: 'end-screen', paused: 'pause-screen' };
  if (screens[name]) el(screens[name]!).classList.remove('hidden');
  const inMatch = name === 'playing' || name === 'paused';
  el('game-hud').classList.toggle('hidden', !inMatch);
  el('touch-controls').classList.toggle('hidden', !inMatch || name === 'paused');
  document.body.classList.toggle('in-match', inMatch);
  if (name !== 'playing') el('toast').textContent = '';
}
function chooseMode(next: GameMode): void {
  mode = next;
  fighter = 'kaito';
  document.querySelectorAll<HTMLElement>('[data-fighter]').forEach(card => card.classList.toggle('active', card.dataset.fighter === fighter));
  el('match-description').textContent = next === 'training' ? 'Practice attacks and combos against an endless training dummy' : next === 'party' ? '3 stocks · CPU rival · Rift Core items + Rift Pulse hazard' : '3 stocks · CPU rival · fair arena · no items';
  show('select');
}
function start(): void {
  scene.startMatch(mode, fighter);
  show('playing');
}
function backToMenu(): void { scene.stopMatch(); show('home'); }
function togglePause(): void {
  if (view === 'playing') { scene.setPaused(true); show('paused'); }
  else if (view === 'paused') { scene.setPaused(false); show('playing'); }
}

document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button => button.addEventListener('click', () => chooseMode(button.dataset.mode as GameMode)));
document.querySelectorAll<HTMLButtonElement>('[data-fighter]').forEach(card => card.addEventListener('click', () => {
  fighter = card.dataset.fighter as FighterId;
  document.querySelectorAll('[data-fighter]').forEach(other => other.classList.toggle('active', other === card));
}));
el('select-back').addEventListener('click', () => show('home'));
el('start-match').addEventListener('click', start);
el('rematch').addEventListener('click', start);
el('end-menu').addEventListener('click', backToMenu);
el('pause-menu').addEventListener('click', backToMenu);
el('pause-button').addEventListener('click', togglePause);
el('resume').addEventListener('click', togglePause);
window.addEventListener('keydown', event => { if (event.code === 'Escape' && (view === 'playing' || view === 'paused')) togglePause(); });

scene = new FightScene(input, {
  onHud: renderHUD,
  onResult: engine => {
    const victory = engine.result?.winner === 0;
    el('result-title').textContent = victory ? 'VICTORY!' : 'DEFEAT';
    el('result-title').classList.toggle('defeat', !victory);
    el('result-message').textContent = victory ? `${FIGHTERS[fighter].name} dominates the Rift. ${engine.result?.reason === 'time' ? 'Time victory!' : 'All enemy stocks eliminated!'}` : 'Your rival takes the match. Return stronger.';
    input.setEnabled(false);
    show('ended');
  },
});

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#080d20',
  width: 960,
  height: 540,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 960, height: 540 },
  scene: [scene],
  render: { antialias: true, pixelArt: false },
});
show('home');
