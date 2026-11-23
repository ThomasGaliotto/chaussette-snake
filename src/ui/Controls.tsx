import * as Haptics from 'expo-haptics';
import { ReactNode, useRef, useState } from 'react';
import {
  Animated,
  GestureResponderEvent,
  Platform,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Dir } from '../game/engine';
import { C } from './theme';

function buzz() {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
}

const NATIVE = Platform.OS !== 'web';

/**
 * Thumb-stick. The knob follows the finger anywhere (even outside the base)
 * and springs back on release. The snake lives on a grid, so the stick turns
 * the knob's angle into one of four directions, with a little hysteresis so
 * it does not flicker when the thumb sits near a diagonal.
 */
export function Joystick({ size, onDir }: { size: number; onDir: (d: Dir) => void }) {
  const [knob] = useState(() => new Animated.ValueXY({ x: 0, y: 0 }));
  const [held, setHeld] = useState(false);
  const center = useRef({ x: 0, y: 0 });
  const last = useRef<Dir | null>(null);

  const r = size / 2;
  const knobR = size * 0.21;
  const travel = r - knobR * 0.4;
  const dead = size * 0.1;

  const track = (pageX: number, pageY: number) => {
    let dx = pageX - center.current.x;
    let dy = pageY - center.current.y;
    const dist = Math.hypot(dx, dy);
    if (dist > travel) {
      dx = (dx / dist) * travel;
      dy = (dy / dist) * travel;
    }
    knob.setValue({ x: dx, y: dy });
    if (dist < dead) return;

    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    const wasHorizontal = last.current === 'left' || last.current === 'right';
    // Stay on the current axis until the other one clearly wins.
    const horizontal = last.current === null ? ax >= ay : wasHorizontal ? ax * 1.2 >= ay : ax > ay * 1.2;
    const d: Dir = horizontal ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
    if (d !== last.current) {
      last.current = d;
      buzz();
      onDir(d);
    }
  };

  const release = () => {
    setHeld(false);
    last.current = null;
    Animated.spring(knob, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: NATIVE,
      friction: 5,
      tension: 120,
    }).start();
  };

  const responder = {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderTerminationRequest: () => false,
    onResponderGrant: (e: GestureResponderEvent) => {
      const { pageX, pageY, locationX, locationY } = e.nativeEvent;
      center.current = { x: pageX - locationX + r, y: pageY - locationY + r };
      setHeld(true);
      track(pageX, pageY);
    },
    onResponderMove: (e: GestureResponderEvent) => track(e.nativeEvent.pageX, e.nativeEvent.pageY),
    onResponderRelease: release,
    onResponderTerminate: release,
  };

  return (
    <View {...responder} style={[styles.base, { width: size, height: size, borderRadius: r }]}>
      {/* guide marks */}
      <View pointerEvents="none" style={[styles.ring, { width: size * 0.78, height: size * 0.78, borderRadius: size * 0.39 }]} />
      {(['up', 'right', 'down', 'left'] as const).map((d, i) => (
        <View
          key={d}
          pointerEvents="none"
          style={[
            styles.notch,
            {
              transform: [{ rotate: `${i * 90}deg` }, { translateY: -r + 12 }],
            },
          ]}
        />
      ))}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.knob,
          {
            width: knobR * 2,
            height: knobR * 2,
            borderRadius: knobR,
            transform: [...knob.getTranslateTransform(), { scale: held ? 1.06 : 1 }],
          },
        ]}
      >
        <View style={[styles.knobInner, { width: knobR * 1.3, height: knobR * 1.3, borderRadius: knobR * 0.65 }]} />
      </Animated.View>
    </View>
  );
}

/** Button built on the responder API (fires on release, like a normal button). */
export function Button({
  children,
  onPress,
  style,
  pressedStyle,
}: {
  children: ReactNode;
  onPress: () => void;
  style?: ViewStyle | ViewStyle[];
  pressedStyle?: ViewStyle;
}) {
  const [down, setDown] = useState(false);
  return (
    <View
      onStartShouldSetResponder={() => true}
      onResponderGrant={() => setDown(true)}
      onResponderRelease={() => {
        setDown(false);
        buzz();
        onPress();
      }}
      onResponderTerminate={() => setDown(false)}
      style={[style, down && (pressedStyle ?? { opacity: 0.7, transform: [{ scale: 0.97 }] })]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 6,
    borderBottomColor: C.shadow,
    shadowColor: '#7a5c2e',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  ring: { position: 'absolute', backgroundColor: C.bg },
  notch: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderBottomWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: C.shadow,
  },
  knob: {
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 5,
    borderBottomColor: C.accentDark,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  knobInner: { backgroundColor: '#ffa47f' },
});
