import React, { useRef, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { SketchCanvas } from '@sourcetoad/react-native-sketch-canvas';
import {
  Appbar,
  Button,
  Snackbar,
  useTheme,
  ToggleButton,
} from 'react-native-paper';
import Slider from '@react-native-community/slider';

export default function ScribbleNote() {
  const canvasRef = useRef<SketchCanvas>(null);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [mode, setMode] = useState<'draw' | 'erase'>('draw');
  const theme = useTheme();

  const handleClear = () => canvasRef.current?.clear();
  const handleUndo = () => canvasRef.current?.undo();

  const handleSave = () => {
    canvasRef.current?.save(
      'png',
      false,
      'Notes',
      String(Date.now()),
      true,
      false,
      false,
    );
    setSnackbarVisible(true);
  };

  // Effective stroke color
  const activeColor = mode === 'erase' ? '#fafafa' : strokeColor;

  return (
    <View style={styles.container}>
      {/* Header */}
      <Appbar.Header>
        <Appbar.Content title="✍️ Scribble Notes" />
      </Appbar.Header>

      {/* Canvas */}
      <View style={styles.canvasBox}>
        <SketchCanvas
          ref={canvasRef}
          style={styles.canvas}
          strokeColor={activeColor}
          strokeWidth={strokeWidth}
        />
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {/* Mode Toggle */}
        <ToggleButton.Row
          onValueChange={value => {
            setMode(value as 'draw' | 'erase');
          }}
          value={mode}
          style={{ marginBottom: 20, justifyContent: 'center' }}
        >
          <ToggleButton icon="pencil" value="draw" />
          <ToggleButton icon="eraser" value="erase" />
        </ToggleButton.Row>

        {/* Color palette (only when in draw mode) */}
        {mode === 'draw' && (
          <View style={styles.colorRow}>
            {['#000000', '#FF0000', '#00BFFF', '#008000', '#FFA500'].map(
              color => (
                <View
                  key={color}
                  style={[
                    styles.colorBtn,
                    {
                      backgroundColor: color,
                      borderWidth: strokeColor === color ? 2 : 0,
                      borderColor: theme.colors.primary,
                    },
                  ]}
                  onTouchEnd={() => setStrokeColor(color)}
                />
              ),
            )}
          </View>
        )}

        {/* Thickness slider */}
        <View style={styles.sliderRow}>
          <Text style={styles.sliderLabel}>✏️ {strokeWidth}px</Text>
          <Slider
            style={{ flex: 1 }}
            minimumValue={1}
            maximumValue={30}
            step={1}
            value={strokeWidth}
            minimumTrackTintColor={theme.colors.primary}
            onValueChange={val => setStrokeWidth(val)}
          />
        </View>

        {/* Action buttons */}
        <View style={styles.buttonRow}>
          <Button mode="outlined" onPress={handleUndo}>
            Undo
          </Button>
          <Button mode="contained-tonal" onPress={handleClear}>
            Clear
          </Button>
          <Button mode="contained" onPress={handleSave}>
            Save
          </Button>
        </View>
      </View>

      {/* Snackbar */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2000}
      >
        📝 Note saved as image!
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  canvasBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    margin: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  canvas: { flex: 1, backgroundColor: '#fafafa' },
  controls: { padding: 15, borderTopWidth: 1, borderColor: '#ddd' },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  colorBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  sliderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  sliderLabel: { marginRight: 10, fontSize: 16 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-around' },
});
