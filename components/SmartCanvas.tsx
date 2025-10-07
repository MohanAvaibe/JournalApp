import React, { useRef, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Appbar, IconButton } from 'react-native-paper';
import { SketchCanvas } from '@sourcetoad/react-native-sketch-canvas';

type Point = { x: number; y: number };

export default function SmartCanvas() {
  const canvasRef = useRef<SketchCanvas>(null);
  const [recognizedText, setRecognizedText] = useState('');
  const [strokeColor, setStrokeColor] = useState('#000');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [allStrokes, setAllStrokes] = useState<Point[][]>([]);

  const handleClear = () => {
    canvasRef.current?.clear();
    setRecognizedText('');
    setAllStrokes([]);
  };

  // Collect stroke data (raw points)
  const handleStrokeEnd = (path: any) => {
    if (!path?.path?.data) return;

    const points: Point[] = path.path.data.map((d: string) => {
      const [x, y] = d.split(',').map(Number);
      return { x, y };
    });

    setAllStrokes(prev => [...prev, points]);
  };

  /** Align strokes and redraw */
  const processAndRecognize = async () => {
    if (!allStrokes.length) return;

    const baselines = allStrokes.map(stroke => {
      const ys = stroke.map(p => p.y);
      return ys[Math.floor(ys.length / 2)];
    });
    const avgBaseline = baselines.reduce((a, b) => a + b, 0) / baselines.length;

    const adjusted = allStrokes.map(stroke => {
      const ys = stroke.map(p => p.y);
      const strokeBaseline = ys[Math.floor(ys.length / 2)];
      const diff = avgBaseline - strokeBaseline;
      return stroke.map(p => ({ x: p.x, y: p.y + diff }));
    });

    canvasRef.current?.clear();
    const canvasSize = canvasRef.current?._size || { width: 1, height: 1 };
    adjusted.forEach((stroke, idx) => {
      canvasRef.current?.addPath({
        size: canvasSize,
        path: {
          id: idx + 1,
          color: strokeColor,
          width: strokeWidth,
          data: stroke.map(p => `${p.x},${p.y}`),
        },
      });
    });
  };

  /** Convert canvas to base64 and call OCR */
  const handleRecognize = () => {
    canvasRef.current?.getBase64(
      'png',
      false, // transparent
      true, // includeImage
      false, // includeText
      false, // cropToImageSize
    );
  };

  /** Call OCR.Space API */
  const recognizeWithAPI = async (base64: string) => {
    try {
      const form = new FormData();
      form.append('apikey', 'helloworld'); // demo key
      form.append('base64Image', `data:image/png;base64,${base64}`);

      const res = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        body: form,
      });

      const json = await res.json();
      console.log('OCR API raw:', json);

      return json.ParsedResults?.[0]?.ParsedText || '';
    } catch (err) {
      console.error('OCR API error:', err);
      return '';
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="✍️ Smart Notes" />
        <Appbar.Action icon="delete" onPress={handleClear} />
        <Appbar.Action icon="check" onPress={processAndRecognize} />
        <Appbar.Action icon="text-box-check" onPress={handleRecognize} />
      </Appbar.Header>

      <View style={styles.textBox}>
        <Text style={styles.textPreview}>
          {recognizedText || '👇 Write below, then press ✔ to align or OCR'}
        </Text>
      </View>

      <View style={styles.canvasBox}>
        {/* <SketchCanvas
          ref={canvasRef}
          style={StyleSheet.absoluteFill}
          strokeColor={strokeColor}
          strokeWidth={strokeWidth}
          onStrokeEnd={handleStrokeEnd}
        /> */}
        <SketchCanvas
          ref={canvasRef}
          style={StyleSheet.absoluteFill}
          strokeColor={strokeColor}
          strokeWidth={strokeWidth}
          onStrokeEnd={handleStrokeEnd}
          getBase64={async (base64: string) => {
            try {
              const text = await recognizeWithAPI(base64);
              setRecognizedText(text);
            } catch (err) {
              console.error('OCR API error:', err);
            }
          }}
        />
      </View>

      <View style={styles.controls}>
        <IconButton icon="circle" onPress={() => setStrokeColor('#000')} />
        <IconButton
          icon="circle"
          iconColor="red"
          onPress={() => setStrokeColor('red')}
        />
        <IconButton
          icon="circle"
          iconColor="blue"
          onPress={() => setStrokeColor('blue')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  textBox: {
    height: '25%',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#ddd',
    padding: 10,
  },
  textPreview: { fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  canvasBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    margin: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
  },
});
