import React, { useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, Path, Skia, SkPath, Line } from '@shopify/react-native-skia';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useSharedValue, runOnJS } from 'react-native-reanimated';

// Background ruled lines
const LinedBackground = ({ lineSpacing = 40, width = 1000, height = 1000 }) => {
  const lines: any[] = [];
  for (let y = lineSpacing; y < height; y += lineSpacing) {
    lines.push(
      <Line
        key={y}
        p1={{ x: 0, y }}
        p2={{ x: width, y }}
        color="lightgray"
        strokeWidth={1}
      />,
    );
  }
  return <>{lines}</>;
};

export default function ScribbleScreen() {
  const [finalPaths, setFinalPaths] = useState<SkPath[]>([]);
  const livePath = useSharedValue(Skia.Path.Make());
  const pointsRef = useRef<{ x: number; y: number }[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);

  const lineSpacing = 40;

  const alignScribble = (pts: { x: number; y: number }[]) => {
    if (!pts || pts.length === 0) return;
    if (pts.some(p => isNaN(p.x) || isNaN(p.y))) return;

    const minX = Math.min(...pts.map(p => p.x));
    const maxX = Math.max(...pts.map(p => p.x));
    const minY = Math.min(...pts.map(p => p.y));
    const maxY = Math.max(...pts.map(p => p.y));

    // scale to fit one line
    const strokeHeight = maxY - minY;
    const scale = strokeHeight > 0 ? lineSpacing / strokeHeight : 1;

    // calculate vertical offset for the current line
    const yOffset = lineSpacing * (currentLineIndex + 1);

    const aligned = Skia.Path.Make();
    const first = pts[0];
    aligned.moveTo(first.x - minX, yOffset + (first.y - minY) * scale);

    for (let i = 1; i < pts.length; i++) {
      const p = pts[i];
      aligned.lineTo(p.x - minX, yOffset + (p.y - minY) * scale);
    }

    // append the aligned stroke
    setFinalPaths(prev => [...prev, aligned]);
    setCurrentLineIndex(prev => prev + 1); // move to next line
  };

  const pan = Gesture.Pan()
    .minDistance(0) // fire on small movement
    .onStart(g => {
      if (isNaN(g.x) || isNaN(g.y)) return;

      const p = Skia.Path.Make();
      p.moveTo(g.x, g.y);
      livePath.value = p;
      pointsRef.current = [{ x: g.x, y: g.y }];
    })
    .onUpdate(g => {
      if (isNaN(g.x) || isNaN(g.y)) return;

      const p = livePath.value?.copy?.();
      if (!p) return;

      p.lineTo(g.x, g.y);
      livePath.value = p;
      pointsRef.current.push({ x: g.x, y: g.y });
    })
    .onEnd(() => {
      const snapshot = [...pointsRef.current];
      if (snapshot.length > 0) {
        runOnJS(alignScribble)(snapshot);
      }
    });

  return (
    <View style={styles.container}>
      <GestureDetector gesture={pan}>
        <Canvas style={styles.canvas}>
          {/* Background ruled lines */}
          <LinedBackground
            lineSpacing={lineSpacing}
            width={1000}
            height={1000}
          />

          {/* Live stroke in black */}
          <Path path={livePath} color="black" style="stroke" strokeWidth={3} />

          {/* Final aligned strokes in red */}
          {finalPaths.map((p, i) => (
            <Path key={i} path={p} color="red" style="stroke" strokeWidth={3} />
          ))}
        </Canvas>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  canvas: { flex: 1 },
});
