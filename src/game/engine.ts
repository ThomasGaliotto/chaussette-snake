// Pure game logic: no React, no timers. The UI calls `step` once per tick.

export type Vec = { x: number; y: number };
export type Dir = 'up' | 'down' | 'left' | 'right';
export type Status = 'menu' | 'playing' | 'paused' | 'over';

export const COLS = 15;
export const ROWS = 18;
export const MIN_LEVEL = 1;
export const MAX_LEVEL = 9;
/** How many body segments a swallowed cat travels per tick on its way to the tail. */
export const BULGE_SPEED = 0.5;

const DELTA: Record<Dir, Vec> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE: Record<Dir, Dir> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

export interface GameState {
  status: Status;
  snake: Vec[]; // head first
  prev: Vec[]; // snake before the last tick, for smooth in-between drawing
  stepAt: number; // timestamp of the last tick (set by the UI)
  dir: Dir;
  queue: Dir[]; // buffered turns, so quick double-taps are not lost
  grow: number;
  cat: Vec;
  score: number;
  caught: number;
  level: number;
  walls: boolean;
  tick: number;
  flash: number; // ticks left to show the "MIAOU!" message
  won: boolean;
  meals: number[]; // tick at which each cat still in the belly was swallowed
  gulp: { cat: Vec; tick: number } | null; // last cat eaten, for the swallow animation
}

export function createGame(level: number, walls: boolean, rnd = Math.random): GameState {
  const y = Math.floor(ROWS / 2);
  const snake: Vec[] = [];
  for (let i = 0; i < 5; i++) snake.push({ x: 6 - i, y });
  const s: GameState = {
    status: 'playing',
    snake,
    prev: [...snake],
    stepAt: 0,
    dir: 'right',
    queue: [],
    grow: 0,
    cat: { x: 0, y: 0 },
    score: 0,
    caught: 0,
    level,
    walls,
    tick: 0,
    flash: 0,
    won: false,
    meals: [],
    gulp: null,
  };
  s.cat = spawnCat(s, rnd) ?? { x: COLS - 3, y };
  return s;
}

/** Milliseconds between ticks: level 1 is relaxed, level 9 is frantic. */
export function tickMs(level: number): number {
  return 250 - (level - 1) * 24;
}

export function enqueue(s: GameState, d: Dir): void {
  const last = s.queue[s.queue.length - 1] ?? s.dir;
  if (d === last || d === OPPOSITE[last] || s.queue.length >= 3) return;
  s.queue.push(d);
}

const same = (a: Vec, b: Vec) => a.x === b.x && a.y === b.y;
const inBounds = (p: Vec) => p.x >= 0 && p.y >= 0 && p.x < COLS && p.y < ROWS;

function axisDist(a: number, b: number, size: number, wrap: boolean): number {
  const d = Math.abs(a - b);
  return wrap ? Math.min(d, size - d) : d;
}

export function distance(a: Vec, b: Vec, walls: boolean): number {
  return axisDist(a.x, b.x, COLS, !walls) + axisDist(a.y, b.y, ROWS, !walls);
}

function occupied(s: GameState, p: Vec): boolean {
  return s.snake.some((seg) => same(seg, p));
}

function spawnCat(s: GameState, rnd: () => number): Vec | null {
  const free: Vec[] = [];
  const far: Vec[] = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const p = { x, y };
      if (occupied(s, p)) continue;
      free.push(p);
      if (distance(p, s.snake[0], s.walls) >= 6) far.push(p);
    }
  }
  const pool = far.length ? far : free;
  return pool.length ? pool[Math.floor(rnd() * pool.length)] : null;
}

export function step(s: GameState, rnd = Math.random): GameState {
  if (s.status !== 'playing') return s;
  s.tick++;
  if (s.flash > 0) s.flash--;
  s.meals = s.meals.filter((m) => (s.tick - m) * BULGE_SPEED < s.snake.length + 1);

  const next = s.queue.shift();
  if (next) s.dir = next;

  const head = s.snake[0];
  const d = DELTA[s.dir];
  let nh = { x: head.x + d.x, y: head.y + d.y };
  if (!inBounds(nh)) {
    if (s.walls) {
      s.status = 'over';
      return s;
    }
    nh = { x: (nh.x + COLS) % COLS, y: (nh.y + ROWS) % ROWS };
  }

  // The tail moves away this tick unless we are growing, so it is not an obstacle.
  const body = s.grow > 0 ? s.snake : s.snake.slice(0, -1);
  if (body.some((seg) => same(seg, nh))) {
    s.status = 'over';
    return s;
  }

  s.prev = [...s.snake];
  s.snake.unshift(nh);
  if (s.grow > 0) s.grow--;
  else s.snake.pop();

  if (same(nh, s.cat)) {
    s.caught++;
    s.score += s.level;
    s.grow += 1;
    s.flash = 8;
    s.meals.push(s.tick);
    s.gulp = { cat: s.cat, tick: s.tick };
    const cat = spawnCat(s, rnd);
    if (!cat) {
      s.status = 'over';
      s.won = true;
      return s;
    }
    s.cat = cat;
    return s;
  }

  return s;
}

/** Unit step from segment i toward the segment before it, or null across a wrap. */
export function linkToPrev(snake: Vec[], i: number): Vec | null {
  if (i === 0) return null;
  const a = snake[i];
  const b = snake[i - 1];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.abs(dx) + Math.abs(dy) === 1 ? { x: dx, y: dy } : null;
}
