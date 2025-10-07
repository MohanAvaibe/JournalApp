import React, { useRef, useState } from 'react';
import { View, Button, Dimensions, ScrollView } from 'react-native';
import RNSketchCanvas from '@sourcetoad/react-native-sketch-canvas';
import Svg, { Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

/** Helpers for stroke normalization + layout */
const getBoundingBox = (points: { x: number; y: number }[]) => {
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
};

const normalizeStroke = (stroke: any, targetHeight = 40) => {
  const box = getBoundingBox(stroke.path);
  const scale = targetHeight / (box.height || 1);

  return stroke.path.map((p: any) => ({
    x: (p.x - box.x) * scale,
    y: (p.y - box.y) * scale,
  }));
};

const layoutStrokes = (
  strokes: any[],
  lineWidth = width - 40,
  lineHeight = 60,
  margin = 10,
) => {
  let x = margin,
    y = margin;
  const arranged: any[] = [];

  strokes.forEach(stroke => {
    const normPoints = normalizeStroke(stroke);
    const box = getBoundingBox(normPoints);

    // wrap line if too wide
    if (x + box.width > lineWidth) {
      x = margin;
      y += lineHeight;
    }

    arranged.push({
      ...stroke,
      path: normPoints.map(p => ({
        x: p.x + x,
        y: p.y + y,
      })),
    });

    x += box.width + margin;
  });

  return arranged;
};

export default function JournalScreen() {
  const canvasRef = useRef<any>(null);
  const [strokes, setStrokes] = useState<any[]>([]);
  const [alignedStrokes, setAlignedStrokes] = useState<any[]>([]);

  /** Save button → extract strokes, layout neatly, clear canvas */
  const handleSave = () => {
    if (!strokes || strokes.length === 0) return;

    const arranged = layoutStrokes(strokes);
    setAlignedStrokes(prev => [...prev, ...arranged]);

    // clear canvas for next input
    canvasRef.current?.clear();
    setStrokes([]);
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Drawing Canvas */}
      <View style={{ flex: 1, borderBottomWidth: 1, borderColor: '#ddd' }}>
        <RNSketchCanvas
          ref={canvasRef}
          containerStyle={{ flex: 1 }}
          canvasStyle={{ flex: 1, backgroundColor: 'white' }}
          defaultStrokeIndex={0}
          defaultStrokeWidth={4}
          onPathsChange={(paths: any) => setStrokes(paths)}
        />
        <Button title="Save & Align" onPress={handleSave} />
      </View>

      {/* Journal Preview Area */}
      <ScrollView style={{ flex: 1, backgroundColor: '#fafafa' }}>
        <Svg height={800} width={width}>
          {alignedStrokes.map((stroke, i) => (
            <Path
              key={i}
              d={`M ${stroke.path.map(p => `${p.x},${p.y}`).join(' L ')}`}
              stroke="black"
              strokeWidth={2}
              fill="none"
            />
          ))}
        </Svg>
      </ScrollView>
    </View>
  );
}
