import { memo } from 'react';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import { BULGE_SPEED, COLS, GameState, ROWS, Vec } from '../game/engine';
import { CatShape } from './Cat';
import { C } from './theme';

type Props = {
  game: GameState | null;
  cell: number;
  /** Progress between the previous tick and the current one, 0..1. */
  t: number;
  /** Clock in ms, for idle animations (blink, tail). */
  now: number;
};

export function Board({ game, cell, t, now }: Props) {
  const w = cell * COLS;
  const h = cell * ROWS;
  return (
    <Svg width={w} height={h}>
      <Grass cell={cell} />
      {game ? <Chaussette game={game} cell={cell} now={now} /> : null}
      {game ? <Snake game={game} cell={cell} t={t} now={now} /> : null}
    </Svg>
  );
}

const Grass = memo(function Grass({ cell }: { cell: number }) {
  const tiles = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      tiles.push(
        <Rect
          key={`${x},${y}`}
          x={x * cell}
          y={y * cell}
          width={cell}
          height={cell}
          fill={(x + y) % 2 ? C.grassB : C.grassA}
        />,
      );
    }
  }
  return <G>{tiles}</G>;
});

function Chaussette({ game, cell, now }: { game: GameState; cell: number; now: number }) {
  const size = cell * 1.7;
  const x = game.cat.x * cell + (cell - size) / 2;
  const y = game.cat.y * cell + cell - size * 0.95;
  const blink = now % 3200 < 160;
  const tail = Math.sin(now / 260) * 12;
  return (
    <G>
      <Ellipse
        cx={game.cat.x * cell + cell / 2}
        cy={game.cat.y * cell + cell * 0.92}
        rx={cell * 0.45}
        ry={cell * 0.12}
        fill="#000"
        opacity={0.15}
      />
      <G transform={`translate(${x} ${y}) scale(${size / 100})`}>
        <CatShape blink={blink} tail={tail} />
      </G>
    </G>
  );
}

const adjacent = (a: Vec, b: Vec) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) <= 1;

function Snake({ game, cell, t, now }: { game: GameState; cell: number; t: number; now: number }) {
  const { snake, prev } = game;
  const n = snake.length;

  // Smoothly placed centre of each segment, between last tick and this one.
  const pts = snake.map((cur, i) => {
    const from = prev[i] ?? prev[prev.length - 1] ?? cur;
    const p = adjacent(from, cur) ? { x: from.x + (cur.x - from.x) * t, y: from.y + (cur.y - from.y) * t } : cur;
    return { x: (p.x + 0.5) * cell, y: (p.y + 0.5) * cell };
  });

  // Body is thick at the neck and tapers to a thin tail.
  const width = (i: number) => {
    const taper = Math.min(1, (n - 1 - i + 1) / 4);
    return cell * (0.36 + 0.42 * taper);
  };

  const links: { a: (typeof pts)[0]; b: (typeof pts)[0]; w: number; i: number }[] = [];
  for (let i = 1; i < n; i++) {
    if (adjacent(snake[i], snake[i - 1])) links.push({ a: pts[i - 1], b: pts[i], w: width(i), i });
  }

  // Swallowed cats: a cat-shaped lump sliding from the neck down to the tail,
  // shrinking a little as it gets digested.
  const along = (f: number) => {
    const i = Math.min(Math.floor(f), n - 1);
    const j = Math.min(i + 1, n - 1);
    const a = pts[i];
    const b = pts[j];
    const k = adjacent(snake[i], snake[j]) ? f - i : 0;
    const angle = i === j ? 0 : (Math.atan2(a.y - b.y, a.x - b.x) * 180) / Math.PI;
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, angle };
  };
  const bulges = game.meals
    .map((m) => {
      const f = (game.tick - m + t) * BULGE_SPEED;
      if (f > n - 1) return null;
      const grow = Math.min(1, f / 0.8); // swells in just behind the head
      const digest = 1 - (f / Math.max(1, n - 1)) * 0.45;
      const r = Math.max(width(Math.floor(f)) / 2, cell * 0.78 * digest * grow);
      return { key: m, r, ...along(f) };
    })
    .filter((b) => b !== null);

  // Swallow: the eaten cat shrinks into the mouth while the head chomps.
  const gulpP = game.gulp ? (game.tick - game.gulp.tick + t) / 1.6 : 1;
  const gulping = gulpP < 1;
  const chomp = gulping ? 1 + 0.22 * Math.sin(gulpP * Math.PI) : 1;

  const head = pts[0];
  const d = { up: -90, down: 90, left: 180, right: 0 }[game.dir];
  const near = Math.abs(game.cat.x - snake[0].x) + Math.abs(game.cat.y - snake[0].y) <= 2;
  const tongueOut = near || now % 1400 < 260;

  return (
    <G>
      {/* soft shadow */}
      {links.map((l) => (
        <Line
          key={`sh${l.i}`}
          x1={l.a.x + 2}
          y1={l.a.y + 3}
          x2={l.b.x + 2}
          y2={l.b.y + 3}
          stroke="#000"
          strokeOpacity={0.12}
          strokeWidth={l.w}
          strokeLinecap="round"
        />
      ))}
      {/* outline, then body, then a lighter stripe down the back */}
      {links.map((l) => (
        <Line
          key={`o${l.i}`}
          x1={l.a.x}
          y1={l.a.y}
          x2={l.b.x}
          y2={l.b.y}
          stroke={C.snakeDark}
          strokeWidth={l.w + 3}
          strokeLinecap="round"
        />
      ))}
      {bulges.map((b) => (
        <Ellipse
          key={`bo${b.key}`}
          cx={b.x}
          cy={b.y}
          rx={b.r * 1.25 + 1.5}
          ry={b.r + 1.5}
          rotation={b.angle}
          origin={`${b.x}, ${b.y}`}
          fill={C.snakeDark}
        />
      ))}
      {links.map((l) => (
        <Line
          key={`b${l.i}`}
          x1={l.a.x}
          y1={l.a.y}
          x2={l.b.x}
          y2={l.b.y}
          stroke={C.snake}
          strokeWidth={l.w}
          strokeLinecap="round"
        />
      ))}
      {links.map((l) => (
        <Line
          key={`st${l.i}`}
          x1={l.a.x}
          y1={l.a.y}
          x2={l.b.x}
          y2={l.b.y}
          stroke={C.snakeBelly}
          strokeOpacity={0.45}
          strokeWidth={l.w * 0.28}
          strokeLinecap="round"
        />
      ))}
      {bulges.map((b) => (
        <Ellipse
          key={`bf${b.key}`}
          cx={b.x}
          cy={b.y}
          rx={b.r * 1.25}
          ry={b.r}
          rotation={b.angle}
          origin={`${b.x}, ${b.y}`}
          fill={C.snake}
        />
      ))}
      {/* diamond-ish spots on every other segment */}
      {pts.map((p, i) =>
        i > 0 && i % 2 === 0 ? (
          <Circle key={`sp${i}`} cx={p.x} cy={p.y} r={width(i) * 0.2} fill={C.snakeSpot} />
        ) : null,
      )}
      {/* the cat silhouette, seen through the stretched belly */}
      {bulges.map((b) => {
        const sz = b.r * 2.3;
        return (
          <G
            key={`bc${b.key}`}
            opacity={0.5}
            transform={`translate(${b.x} ${b.y}) rotate(${b.angle + 90}) scale(${sz / 100}) translate(-50 -55)`}
          >
            <CatShape />
          </G>
        );
      })}
      {gulping ? (
        <G
          opacity={1 - gulpP * 0.4}
          transform={`translate(${head.x} ${head.y}) rotate(${gulpP * 140}) scale(${(cell * 1.7 * (1 - gulpP)) / 100}) translate(-50 -55)`}
        >
          <CatShape blink />
        </G>
      ) : null}
      {/* head */}
      <G
        transform={`translate(${head.x} ${head.y}) rotate(${d}) scale(${(cell / 100) * chomp})`}
      >
        {tongueOut ? (
          <Path
            d="M40 0 L72 0 M72 0 L84 -9 M72 0 L84 9"
            stroke={C.tongue}
            strokeWidth={5}
            strokeLinecap="round"
            fill="none"
          />
        ) : null}
        <Ellipse cx={6} cy={0} rx={50} ry={41} fill={C.snakeDark} />
        <Ellipse cx={6} cy={0} rx={47} ry={38} fill={C.snake} />
        <Ellipse cx={14} cy={0} rx={26} ry={11} fill={C.snakeBelly} opacity={0.45} />
        {/* nostrils */}
        <Circle cx={44} cy={-9} r={3} fill={C.snakeDark} />
        <Circle cx={44} cy={9} r={3} fill={C.snakeDark} />
        {/* eyes */}
        <Circle cx={16} cy={-22} r={13} fill={C.white} />
        <Circle cx={16} cy={22} r={13} fill={C.white} />
        <Circle cx={21} cy={-22} r={near ? 8 : 6.5} fill={C.text} />
        <Circle cx={21} cy={22} r={near ? 8 : 6.5} fill={C.text} />
        <Circle cx={24} cy={-25} r={2.5} fill={C.white} />
        <Circle cx={24} cy={19} r={2.5} fill={C.white} />
      </G>
    </G>
  );
}
