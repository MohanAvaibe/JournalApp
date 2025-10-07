// NotebookPage.tsx
import React, { useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, Path, Skia, SkPath } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

const lineSpacing = 40;
const pageWidth = 1000;
const pageHeight = 1400;

// Draw ruled paper
const RuledPaper = () => {
  const lines: any[] = [];
  for (let y = lineSpacing; y < pageHeight; y += lineSpacing) {
    const linePath = Skia.Path.Make();
    linePath.addRect({ x: 0, y, width: pageWidth, height: 1 });
    lines.push(
      <Path
        key={y}
        path={linePath}
        color="#d0d0d0"
        style="stroke"
        strokeWidth={1}
      />,
    );
  }
  return <>{lines}</>;
};

export default function NotebookPage() {
  const [lineGroups, setLineGroups] = useState<SkPath[][]>([]);
  const [livePath, setLivePath] = useState<SkPath | null>(null);
  const pointsRef = useRef<{ x: number; y: number }[]>([]);
  const currentGroup = useRef<SkPath[]>([]);
  const lastLineY = useRef<number | null>(null);
  const groupTimer = useRef<NodeJS.Timeout | null>(null);

  const snapToLine = (y: number) => Math.round(y / lineSpacing) * lineSpacing;

  const alignAndSaveGroup = (group: SkPath[]) => {
    if (group.length === 0) return;

    let allYs: number[] = [];
    group.forEach(path => {
      const bounds = path.computeTightBounds();
      const top = bounds.y;
      const bottom = bounds.y + bounds.height;
      allYs.push(top, bottom);
    });

    const avgY = allYs.reduce((sum, y) => sum + y, 0) / allYs.length;

    let targetY: number;
    if (lastLineY.current !== null && Math.abs(avgY - lastLineY.current) < 15) {
      targetY = lastLineY.current;
    } else {
      targetY = snapToLine(avgY);
    }

    const offsetY = targetY - avgY;

    const alignedGroup = group.map(p => {
      const shifted = p.copy();
      shifted.transform(Skia.Matrix().translate(0, offsetY));
      return shifted;
    });

    setLineGroups(prev => [...prev, alignedGroup]);
    lastLineY.current = targetY;
  };

  const finalizeStroke = (pts: { x: number; y: number }[]) => {
    if (pts.length < 2) return;

    const path = Skia.Path.Make();
    path.moveTo(pts[0].x, pts[0].y);
    pts.forEach(p => path.lineTo(p.x, p.y));

    currentGroup.current.push(path);

    if (groupTimer.current) clearTimeout(groupTimer.current);

    groupTimer.current = setTimeout(() => {
      alignAndSaveGroup(currentGroup.current);
      currentGroup.current = [];
      groupTimer.current = null;
    }, 400);
  };

  // Reanimated gesture
  const pan = Gesture.Pan()
    .minDistance(1)
    .onStart(g => {
      if (groupTimer.current) {
        clearTimeout(groupTimer.current);
        groupTimer.current = null;
      }
      const p = Skia.Path.Make();
      p.moveTo(g.x, g.y);
      setLivePath(p);
      pointsRef.current = [{ x: g.x, y: g.y }];
    })
    .onUpdate(g => {
      if (!livePath) return;
      const p = livePath.copy();
      p.lineTo(g.x, g.y);
      setLivePath(p);
      pointsRef.current.push({ x: g.x, y: g.y });
    })
    .onEnd(() => {
      // ✅ Call JS function via runOnJS
      runOnJS(finalizeStroke)([...pointsRef.current]);
      setLivePath(null);
      pointsRef.current = [];
    });

  return (
    <View style={styles.container}>
      <GestureDetector gesture={pan}>
        <Canvas style={styles.canvas}>
          <RuledPaper />

          {lineGroups.map((group, gi) =>
            group.map((p, i) => (
              <Path
                key={`${gi}-${i}`}
                path={p}
                color="red"
                style="stroke"
                strokeWidth={3}
              />
            )),
          )}

          {livePath && (
            <Path path={livePath} color="blue" style="stroke" strokeWidth={3} />
          )}
        </Canvas>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  canvas: { flex: 1 },
});
