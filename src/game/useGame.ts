import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import {
  createGame,
  Dir,
  enqueue,
  GameState,
  MAX_LEVEL,
  MIN_LEVEL,
  Status,
  step,
  tickMs,
} from './engine';

const STORAGE_KEY = 'chaussette-snake/v1';

type Settings = { best: number; level: number; walls: boolean };
const DEFAULTS: Settings = { best: 0, level: 5, walls: false };

// The engine mutates in place; copy first so React sees a new state every tick.
function clone(g: GameState): GameState {
  return { ...g, snake: [...g.snake], prev: [...g.prev], meals: [...g.meals], queue: [...g.queue], cat: { ...g.cat } };
}

export function useGame() {
  const [game, setGame] = useState<GameState | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [bestAtStart, setBestAtStart] = useState(0);

  const status: Status = game?.status ?? 'menu';
  const speed = tickMs(game?.level ?? settings.level);
  // Best score is derived: the stored one, or the score of the game that just ended.
  const best = Math.max(settings.best, status === 'over' ? (game?.score ?? 0) : 0);
  const newRecord = status === 'over' && (game?.score ?? 0) > bestAtStart;

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setSettings({ ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) });
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  // Save settings whenever they change (but not before the saved ones are loaded).
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...settings, best })).catch(() => {});
  }, [settings, best, loaded]);

  // Game loop: runs only while playing, at the speed of the current level.
  useEffect(() => {
    if (status !== 'playing') return;
    const id = setInterval(() => {
      const at = Date.now();
      setGame((g) => {
        if (!g) return g;
        const n = step(clone(g));
        n.stepAt = at;
        return n;
      });
    }, speed);
    return () => clearInterval(id);
  }, [status, speed]);

  // Auto-pause when the app goes to the background (call, notification…).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') return;
      setGame((g) => (g?.status === 'playing' ? { ...g, status: 'paused' } : g));
    });
    return () => sub.remove();
  }, []);

  const start = useCallback(() => {
    setSettings((s) => ({ ...s, best }));
    setBestAtStart(best);
    setGame(createGame(settings.level, settings.walls));
  }, [best, settings.level, settings.walls]);

  const togglePause = useCallback(() => {
    setGame((g) => {
      if (g?.status === 'playing') return { ...g, status: 'paused' };
      if (g?.status === 'paused') return { ...g, status: 'playing', prev: [...g.snake] };
      return g;
    });
  }, []);

  const toMenu = useCallback(() => {
    setSettings((s) => ({ ...s, best }));
    setGame(null);
  }, [best]);

  const turn = useCallback((d: Dir) => {
    setGame((g) => {
      if (g?.status !== 'playing') return g;
      const n = clone(g);
      enqueue(n, d);
      return n;
    });
  }, []);

  const setLevel = useCallback((l: number) => {
    const level = Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, l));
    setSettings((s) => ({ ...s, level }));
  }, []);

  const setWalls = useCallback((walls: boolean) => setSettings((s) => ({ ...s, walls })), []);

  return {
    game,
    status,
    speed,
    level: settings.level,
    walls: settings.walls,
    best,
    newRecord,
    start,
    togglePause,
    toMenu,
    turn,
    setLevel,
    setWalls,
  };
}
