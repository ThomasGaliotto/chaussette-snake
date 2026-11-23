import { useCallback, useEffect, useRef } from 'react';
import {
  GestureResponderEvent,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLS, Dir, MAX_LEVEL, MIN_LEVEL, ROWS } from '../game/engine';
import { useGame } from '../game/useGame';
import { Board } from './Board';
import { Cat } from './Cat';
import { Button, Joystick } from './Controls';
import { C, FONT } from './theme';
import { useNow } from './useNow';

type Key = Dir | 'ok';

export function GameScreen() {
  const g = useGame();
  const { width, height } = useWindowDimensions();
  const now = useNow(true);

  // Board as big as the screen allows, leaving room for the bar and the D-pad.
  const maxW = Math.min(width - 24, 480);
  const insets = useSafeAreaInsets();
  const avail = height - insets.top - insets.bottom;
  const maxH = avail - 300; // top bar + joystick + hint
  const cell = Math.max(12, Math.floor(Math.min(maxW / COLS, maxH / ROWS)));
  const boardW = cell * COLS;
  const boardH = cell * ROWS;
  const padSize = Math.min(190, Math.max(140, avail - boardH - 120));

  const t =
    g.status === 'playing' && g.game ? Math.min(1, Math.max(0, (now - g.game.stepAt) / g.speed)) : 1;

  const onKey = useCallback(
    (k: Key) => {
      if (g.status === 'menu' || g.status === 'over') {
        if (k === 'ok') g.start();
        return;
      }
      if (k === 'ok') return g.togglePause();
      g.turn(k);
    },
    [g],
  );

  // Arrow keys / space when running in a browser (handy for testing).
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const map: Record<string, Key> = {
      ArrowUp: 'up',
      ArrowLeft: 'left',
      ArrowRight: 'right',
      ArrowDown: 'down',
      ' ': 'ok',
      Enter: 'ok',
    };
    const handler = (e: KeyboardEvent) => {
      const k = map[e.key];
      if (k) {
        e.preventDefault();
        onKey(k);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onKey]);

  // Swipes on the board. The anchor resets after each swipe so one gesture can chain turns.
  const touch = useRef({ x: 0, y: 0 });
  const swipe = {
    onStartShouldSetResponder: () => g.status === 'playing',
    onMoveShouldSetResponder: () => g.status === 'playing',
    onResponderGrant: (e: GestureResponderEvent) => {
      touch.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
    },
    onResponderMove: (e: GestureResponderEvent) => {
      const dx = e.nativeEvent.pageX - touch.current.x;
      const dy = e.nativeEvent.pageY - touch.current.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 14) return;
      touch.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
      const d: Dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
      g.turn(d);
    },
  };

  const caught = g.game?.caught ?? 0;
  const flash = (g.game?.flash ?? 0) > 0;

  return (
    <SafeAreaView style={styles.root}>
      {/* top bar */}
      <View style={[styles.bar, { width: boardW }]}>
        <Stat label="SCORE" value={g.game?.score ?? 0} />
        <View style={styles.catStat}>
          <Cat size={34} blink={flash} />
          <Text style={styles.catCount}>× {caught}</Text>
          {flash ? <Text style={styles.miaou}>Miaou !</Text> : null}
        </View>
        <Stat label="RECORD" value={g.best} align="right" />
      </View>

      {/* board */}
      <View
        style={[
          styles.boardFrame,
          { width: boardW + 12, height: boardH + 12 },
          (g.game?.walls ?? g.walls) && styles.fence,
        ]}
      >
        <View
          {...swipe}
          style={[
            styles.board,
            { width: boardW, height: boardH },
          ]}
        >
          <Board game={g.game} cell={cell} t={t} now={now} />

          {g.status === 'menu' ? (
            <Overlay>
              <Cat size={Math.min(130, boardH * 0.35)} tail={Math.sin(now / 300) * 14} blink={now % 3000 < 150} />
              <Text style={styles.title}>Snake</Text>
              <Text style={styles.subtitle}>Attrape Chaussette !</Text>
              <View style={styles.option}>
                <Text style={styles.optionLabel}>Vitesse</Text>
                <Stepper
                  value={g.level}
                  onMinus={() => g.setLevel(Math.max(MIN_LEVEL, g.level - 1))}
                  onPlus={() => g.setLevel(Math.min(MAX_LEVEL, g.level + 1))}
                />
              </View>
              <View style={styles.option}>
                <Text style={styles.optionLabel}>Murs</Text>
                <Button
                  onPress={() => g.setWalls(!g.walls)}
                  style={[styles.toggle, g.walls ? styles.toggleOn : {}]}
                >
                  <View style={[styles.knob, g.walls && styles.knobOn]} />
                </Button>
              </View>
              <PlayButton label="Jouer" onPress={g.start} />
            </Overlay>
          ) : null}

          {g.status === 'paused' ? (
            <Overlay>
              <Text style={styles.title}>Pause</Text>
              <PlayButton label="Reprendre" onPress={g.togglePause} />
              <Button onPress={g.toMenu} style={styles.linkBtn}>
                <Text style={styles.link}>Menu</Text>
              </Button>
            </Overlay>
          ) : null}

          {g.status === 'over' && g.game ? (
            <Overlay>
              <Cat size={Math.min(110, boardH * 0.3)} tail={Math.sin(now / 300) * 14} />
              <Text style={styles.title}>{g.game.won ? 'Bravo !' : 'Perdu !'}</Text>
              <Text style={styles.subtitle}>
                {g.game.caught === 0
                  ? 'Chaussette t’a échappé…'
                  : `Chaussette attrapée ${g.game.caught} fois`}
              </Text>
              <Text style={styles.bigScore}>{g.game.score}</Text>
              {g.newRecord ? <Text style={styles.record}>Nouveau record !</Text> : null}
              <PlayButton label="Rejouer" onPress={g.start} />
              <Button onPress={g.toMenu} style={styles.linkBtn}>
                <Text style={styles.link}>Menu</Text>
              </Button>
            </Overlay>
          ) : null}
        </View>
      </View>

      {/* controls */}
      <View style={styles.controls}>
        <View style={styles.sideSlot} />
        <Joystick size={padSize} onDir={g.turn} />
        <View style={styles.sideSlot}>
          <Button onPress={() => onKey('ok')} style={styles.pauseBtn} pressedStyle={styles.pauseBtnDown}>
            {g.status === 'playing' ? (
              <View style={styles.pauseIcon}>
                <View style={styles.pauseBar} />
                <View style={styles.pauseBar} />
              </View>
            ) : (
              <View style={styles.playIcon} />
            )}
          </Button>
        </View>
      </View>
      <Text style={styles.hint}>Glisse sur l’herbe ou utilise le joystick</Text>
    </SafeAreaView>
  );
}

function Stat({ label, value, align = 'left' }: { label: string; value: number; align?: 'left' | 'right' }) {
  return (
    <View style={{ alignItems: align === 'left' ? 'flex-start' : 'flex-end', minWidth: 70 }}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.overlayWrap}>
      <View style={styles.overlay}>{children}</View>
    </View>
  );
}

function PlayButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Button onPress={onPress} style={styles.play} pressedStyle={styles.playPressed}>
      <Text style={styles.playText}>{label}</Text>
    </Button>
  );
}

function Stepper({ value, onMinus, onPlus }: { value: number; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={styles.stepper}>
      <Button onPress={onMinus} style={styles.stepBtn}>
        <Text style={styles.stepText}>−</Text>
      </Button>
      <Text style={styles.stepValue}>{value}</Text>
      <Button onPress={onPlus} style={styles.stepBtn}>
        <Text style={styles.stepText}>+</Text>
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, alignItems: 'center' },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 10,
  },
  statLabel: { fontFamily: FONT.bold, fontSize: 11, color: C.textSoft, letterSpacing: 1 },
  statValue: { fontFamily: FONT.bold, fontSize: 26, color: C.text },
  catStat: { flexDirection: 'row', alignItems: 'center' },
  catCount: { fontFamily: FONT.bold, fontSize: 22, color: C.text, marginLeft: 4 },
  miaou: {
    position: 'absolute',
    top: -14,
    right: -30,
    fontFamily: FONT.bold,
    fontSize: 13,
    color: C.accent,
    transform: [{ rotate: '-8deg' }],
  },
  boardFrame: {
    backgroundColor: C.grassEdge,
    borderRadius: 18,
    padding: 6,
    borderBottomWidth: 6,
    borderBottomColor: '#4a7430',
    height: undefined,
  },
  // Wooden fence look when walls are on.
  fence: { backgroundColor: '#9a6a3c', borderBottomColor: '#7a512b' },
  board: { borderRadius: 12, overflow: 'hidden' },
  overlayWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(40, 60, 25, 0.25)',
  },
  overlay: {
    backgroundColor: C.card,
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 22,
    alignItems: 'center',
    minWidth: 230,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  title: { fontFamily: FONT.bold, fontSize: 34, color: C.text, marginTop: 4 },
  subtitle: { fontFamily: FONT.regular, fontSize: 15, color: C.textSoft, marginTop: 2 },
  bigScore: { fontFamily: FONT.bold, fontSize: 44, color: C.snake, marginTop: 6 },
  record: { fontFamily: FONT.bold, fontSize: 15, color: C.accent },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    marginTop: 12,
  },
  optionLabel: { fontFamily: FONT.regular, fontSize: 17, color: C.text },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { fontFamily: FONT.bold, fontSize: 20, color: C.text, marginTop: -2 },
  stepValue: { fontFamily: FONT.bold, fontSize: 20, color: C.text, width: 34, textAlign: 'center' },
  toggle: {
    width: 56,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.shadow,
    padding: 3,
  },
  toggleOn: { backgroundColor: C.snake },
  knob: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.white },
  knobOn: { marginLeft: 24 },
  play: {
    marginTop: 18,
    backgroundColor: C.accent,
    borderRadius: 16,
    paddingVertical: 12,
    alignSelf: 'stretch',
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: C.accentDark,
  },
  playPressed: { borderBottomWidth: 0, marginTop: 22, backgroundColor: C.accentDark },
  playText: { fontFamily: FONT.bold, fontSize: 20, color: C.white },
  linkBtn: { marginTop: 10, padding: 6 },
  link: { fontFamily: FONT.regular, fontSize: 15, color: C.textSoft },
  controls: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  sideSlot: { width: 64, alignItems: 'center' },
  pauseBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 4,
    borderBottomColor: C.shadow,
  },
  pauseBtnDown: { borderBottomWidth: 0, marginTop: 4 },
  pauseIcon: { flexDirection: 'row', gap: 5 },
  pauseBar: { width: 6, height: 20, borderRadius: 2, backgroundColor: C.text },
  playIcon: {
    marginLeft: 4,
    width: 0,
    height: 0,
    borderTopWidth: 11,
    borderBottomWidth: 11,
    borderLeftWidth: 17,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: C.text,
  },
  hint: { fontFamily: FONT.regular, fontSize: 12, color: C.textSoft, marginBottom: 8 },
});
