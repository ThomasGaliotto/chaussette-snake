import { memo } from 'react';
import Svg, { Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import { C } from './theme';

type Props = {
  size: number;
  blink?: boolean;
  /** Tail swing in degrees, for a little life while she waits. */
  tail?: number;
};

/** Chaussette: a black cat sitting up, with her four white socks. */
export function CatShape({ blink = false, tail = 0 }: Omit<Props, 'size'>) {
  return (
    <G>
      {/* tail, pivoting at its base */}
      <G rotation={tail} origin="66, 86">
        <Path
          d="M64 86 C 90 90, 98 68, 88 52"
          stroke={C.cat}
          strokeWidth={8}
          strokeLinecap="round"
          fill="none"
        />
      </G>
      {/* back paws peeking out */}
      <Ellipse cx={30} cy={90} rx={9} ry={5} fill={C.white} />
      <Ellipse cx={70} cy={90} rx={9} ry={5} fill={C.white} />
      {/* body */}
      <Ellipse cx={50} cy={70} rx={25} ry={22} fill={C.cat} />
      <Ellipse cx={50} cy={68} rx={9} ry={13} fill={C.catLight} />
      {/* front legs with white socks */}
      <Rect x={36} y={70} width={11} height={22} rx={5} fill={C.cat} />
      <Rect x={53} y={70} width={11} height={22} rx={5} fill={C.cat} />
      <Rect x={36} y={82} width={11} height={11} rx={5} fill={C.white} />
      <Rect x={53} y={82} width={11} height={11} rx={5} fill={C.white} />
      {/* ears */}
      <Path d="M30 34 L28 10 L48 24 Z" fill={C.cat} />
      <Path d="M70 34 L72 10 L52 24 Z" fill={C.cat} />
      <Path d="M33 29 L32 16 L43 24 Z" fill={C.pink} />
      <Path d="M67 29 L68 16 L57 24 Z" fill={C.pink} />
      {/* head */}
      <Ellipse cx={50} cy={40} rx={23} ry={20} fill={C.cat} />
      {/* eyes */}
      {blink ? (
        <G>
          <Path d="M36 40 Q41 44 46 40" stroke={C.eye} strokeWidth={2.5} fill="none" />
          <Path d="M54 40 Q59 44 64 40" stroke={C.eye} strokeWidth={2.5} fill="none" />
        </G>
      ) : (
        <G>
          <Ellipse cx={41} cy={39} rx={5.5} ry={6.5} fill={C.eye} />
          <Ellipse cx={59} cy={39} rx={5.5} ry={6.5} fill={C.eye} />
          <Ellipse cx={41} cy={39.5} rx={1.8} ry={5} fill={C.cat} />
          <Ellipse cx={59} cy={39.5} rx={1.8} ry={5} fill={C.cat} />
          <Ellipse cx={42.5} cy={36.5} rx={1.4} ry={1.4} fill={C.white} />
          <Ellipse cx={60.5} cy={36.5} rx={1.4} ry={1.4} fill={C.white} />
        </G>
      )}
      {/* nose and mouth */}
      <Path d="M47 47 L53 47 L50 50.5 Z" fill={C.pink} />
      <Path
        d="M50 50.5 Q50 54 46 54 M50 50.5 Q50 54 54 54"
        stroke={C.white}
        strokeOpacity={0.6}
        strokeWidth={1.2}
        fill="none"
      />
      {/* whiskers */}
      <G stroke={C.white} strokeOpacity={0.7} strokeWidth={1} strokeLinecap="round">
        <Line x1={38} y1={49} x2={18} y2={46} />
        <Line x1={38} y1={52} x2={19} y2={54} />
        <Line x1={62} y1={49} x2={82} y2={46} />
        <Line x1={62} y1={52} x2={81} y2={54} />
      </G>
    </G>
  );
}

/** Standalone cat, for menus and overlays. */
export const Cat = memo(function Cat({ size, blink, tail }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <CatShape blink={blink} tail={tail} />
    </Svg>
  );
});
