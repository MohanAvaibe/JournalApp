import React, { useRef, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Alert } from 'react-native';
import { SketchCanvas } from '@sourcetoad/react-native-sketch-canvas';
import {
  Appbar,
  Button,
  useTheme,
  ToggleButton,
  ActivityIndicator,
} from 'react-native-paper';
import Slider from '@react-native-community/slider';
import MlkitOcr from 'react-native-mlkit-ocr';

export default function TextToOCR() {
  const canvasRef = useRef<SketchCanvas>(null);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [mode, setMode] = useState<'draw' | 'erase'>('draw');
  const [extractedText, setExtractedText] = useState<string>(''); // store OCR result
  const theme = useTheme();
  const [loading, setLoading] = useState(false);

  // Save + OCR in one go
  const handleSaveAndConvert = async () => {
    const fileName = String(Date.now());
    const folder = 'Notes';

    canvasRef.current?.save('png', false, folder, fileName, true, false, false);

    // Wait for onSketchSaved callback
  };

  const handleClear = () => canvasRef.current?.clear();
  const handleUndo = () => canvasRef.current?.undo();

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="✍️ Scribble Notes" />
      </Appbar.Header>
      {loading && (
        <View style={styles.loaderOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}
      {/* TOP HALF: Extracted text */}
      <View style={styles.textOutputBox}>
        <Text style={styles.outputHeader}>📝 Extracted Text</Text>
        <ScrollView style={styles.scrollArea}>
          <Text style={styles.outputText}>
            {extractedText || 'Start scribbling and save to see text here...'}
          </Text>
        </ScrollView>
      </View>

      {/* BOTTOM HALF: Canvas */}

      <View style={styles.canvasBox}>
        <SketchCanvas
          ref={canvasRef}
          style={styles.canvas}
          strokeColor={mode === 'erase' ? '#fafafa' : strokeColor}
          strokeWidth={strokeWidth}
          onSketchSaved={async (success, path) => {
            if (success) {
              setLoading(true);
              try {
                const imageUri = `file://${path}`;
                console.log(imageUri, 'imahye from');
                const result = await MlkitOcr.detectFromFile(imageUri);
                console.log(result, 'result from ocr');
                const text = result.map(block => block.text).join('\n');
                setExtractedText(text || 'No text found.');
              } catch (err) {
                console.error('OCR error:', err);
                setExtractedText('❌ OCR Failed');
              }
              setLoading(false);
            } else {
              Alert.alert('❌ Save failed');
            }
          }}
        />
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <ToggleButton.Row
          onValueChange={value => setMode(value as 'draw' | 'erase')}
          value={mode}
          style={{ marginBottom: 20, justifyContent: 'center' }}
        >
          <ToggleButton icon="pencil" value="draw" />
          <ToggleButton icon="eraser" value="erase" />
        </ToggleButton.Row>

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

        <View style={styles.buttonRow}>
          <Button mode="outlined" onPress={handleUndo}>
            Undo
          </Button>
          <Button mode="contained-tonal" onPress={handleClear}>
            Clear{' '}
          </Button>

          <Button
            mode="contained"
            buttonColor={theme.colors.primary}
            onPress={handleSaveAndConvert}
          >
            Save & Convert
          </Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  loaderOverlay: {
    backgroundColor: 'rgba(255,255,255,0.6)', // semi-transparent overlay
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },

  textOutputBox: {
    // margin: 10,
    // backgroundColor: '#f5f5f5',
    // borderBottomWidth: 1,
    // borderColor: '#ddd',
    flex: 3,
    padding: 10,

    borderWidth: 1,
    borderColor: '#ddd',
    margin: 10,
    borderRadius: 10,
  },
  outputHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  scrollArea: { flex: 1 },
  outputText: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'left',
    color: '#333',
  },

  canvasBox: {
    flex: 7,
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
    paddingBottom: 10,
  },
  colorBtn: { width: 32, height: 32, borderRadius: 16 },
  sliderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  sliderLabel: { marginRight: 10, fontSize: 16 },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
    gap: 10,
  },
});

// import React, { useRef, useState } from 'react';
// import { View, StyleSheet, Text, Alert } from 'react-native';
// import { SketchCanvas } from '@sourcetoad/react-native-sketch-canvas';
// import {
//   Appbar,
//   Button,
//   Snackbar,
//   useTheme,
//   ToggleButton,
// } from 'react-native-paper';
// import Slider from '@react-native-community/slider';
// import MlkitOcr from 'react-native-mlkit-ocr';
// import RNFS from 'react-native-fs';

// import { PermissionsAndroid } from 'react-native';

// export default function TextToOCR() {
//   const canvasRef = useRef<SketchCanvas>(null);
//   const [strokeColor, setStrokeColor] = useState('#000000');
//   const [strokeWidth, setStrokeWidth] = useState(4);
//   const [snackbarVisible, setSnackbarVisible] = useState(false);
//   const [mode, setMode] = useState<'draw' | 'erase'>('draw');
//   const theme = useTheme();
//   const [lastSavedPath, setLastSavedPath] = useState<string | null>(null);

//   const handleClear = () => canvasRef.current?.clear();
//   const handleUndo = () => canvasRef.current?.undo();

//   async function requestStoragePermission() {
//     try {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
//       );
//       return granted === PermissionsAndroid.RESULTS.GRANTED;
//     } catch (err) {
//       console.warn(err);
//       return false;
//     }
//   }

//   // Save and remember path
//   const handleSave = async () => {
//     const fileName = String(Date.now());
//     const folder = 'Notes';
//     const filePath = `${RNFS.PicturesDirectoryPath}/${folder}/${fileName}`;

//     canvasRef.current?.save('png', false, folder, fileName, true, false, false);

//     setLastSavedPath(filePath);
//     Alert.alert('Saved successfully');
//     console.log('✅ Saved Path:', filePath);
//   };

//   // OCR: convert saved image to text
//   const handleConvertToText = async () => {
//     if (!lastSavedPath) {
//       Alert.alert('⚠️ Save first', 'Please save the note as image first.');
//       return;
//     }

//     try {
//       const imageUri = `file://${lastSavedPath}`;
//       const result = await MlkitOcr.detectFromFile(imageUri);
//       const extractedText = result.map(block => block.text).join('\n');
//       Alert.alert('📝 Extracted Text', extractedText || 'No text found.');
//     } catch (err) {
//       console.error('OCR error:', err);
//       Alert.alert('❌ OCR Failed', String(err));
//     }
//   };

//   const activeColor = mode === 'erase' ? '#fafafa' : strokeColor;

//   return (
//     <View style={styles.container}>
//       <Appbar.Header>
//         <Appbar.Content title="✍️ Scribble Notes" />
//       </Appbar.Header>

//       {/* Canvas */}
//       <View style={styles.canvasBox}>
//         {/* <SketchCanvas
//           ref={canvasRef}
//           style={styles.canvas}
//           strokeColor={activeColor}
//           strokeWidth={strokeWidth}
//         /> */}

//         <SketchCanvas
//           ref={canvasRef}
//           style={styles.canvas}
//           strokeColor={activeColor}
//           strokeWidth={strokeWidth}
//           onSketchSaved={(success, path) => {
//             if (success) {
//               setLastSavedPath(path);
//               Alert.alert('Saved!', `✅ Path: ${path}`);
//               console.log('Saved file path:', path);
//             } else {
//               Alert.alert('❌ Save failed');
//             }
//           }}
//         />
//       </View>

//       {/* Controls */}
//       <View style={styles.controls}>
//         <ToggleButton.Row
//           onValueChange={value => setMode(value as 'draw' | 'erase')}
//           value={mode}
//           style={{ marginBottom: 20, justifyContent: 'center' }}
//         >
//           <ToggleButton icon="pencil" value="draw" />
//           <ToggleButton icon="eraser" value="erase" />
//         </ToggleButton.Row>

//         {mode === 'draw' && (
//           <View style={styles.colorRow}>
//             {['#000000', '#FF0000', '#00BFFF', '#008000', '#FFA500'].map(
//               color => (
//                 <View
//                   key={color}
//                   style={[
//                     styles.colorBtn,
//                     {
//                       backgroundColor: color,
//                       borderWidth: strokeColor === color ? 2 : 0,
//                       borderColor: theme.colors.primary,
//                     },
//                   ]}
//                   onTouchEnd={() => setStrokeColor(color)}
//                 />
//               ),
//             )}
//           </View>
//         )}

//         <View style={styles.sliderRow}>
//           <Text style={styles.sliderLabel}>✏️ {strokeWidth}px</Text>
//           <Slider
//             style={{ flex: 1 }}
//             minimumValue={1}
//             maximumValue={30}
//             step={1}
//             value={strokeWidth}
//             minimumTrackTintColor={theme.colors.primary}
//             onValueChange={val => setStrokeWidth(val)}
//           />
//         </View>

//         {/* Buttons */}
//         <View style={styles.buttonRow}>
//           <Button mode="outlined" onPress={handleUndo}>
//             Undo
//           </Button>
//           <Button mode="contained-tonal" onPress={handleClear}>
//             Clear
//           </Button>
//           <Button mode="contained" onPress={handleSave}>
//             Save
//           </Button>
//         </View>

//         <View style={styles.buttonRow}>
//           <Button
//             mode="contained"
//             buttonColor={theme.colors.primary}
//             onPress={handleConvertToText}
//           >
//             Convert to Text
//           </Button>
//         </View>
//       </View>

//       <Snackbar
//         visible={snackbarVisible}
//         onDismiss={() => setSnackbarVisible(false)}
//         duration={2000}
//       >
//         📝 Note saved as image!
//       </Snackbar>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#fff' },
//   canvasBox: {
//     flex: 1,
//     borderWidth: 1,
//     borderColor: '#ddd',
//     margin: 10,
//     borderRadius: 10,
//     overflow: 'hidden',
//   },
//   canvas: { flex: 1, backgroundColor: '#fafafa' },
//   controls: { padding: 15, borderTopWidth: 1, borderColor: '#ddd' },
//   colorRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     marginBottom: 20,
//   },
//   colorBtn: { width: 32, height: 32, borderRadius: 16 },
//   sliderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
//   sliderLabel: { marginRight: 10, fontSize: 16 },
//   buttonRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     marginBottom: 10,
//   },
// });
