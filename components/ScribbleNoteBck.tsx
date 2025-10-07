import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Dimensions,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Canvas, Path, SkPath, Skia } from '@shopify/react-native-skia';
import { runOnJS } from 'react-native-reanimated';
import Slider from '@react-native-community/slider';

type PtType = 'moveTo' | 'lineTo' | 'quadTo';
type Point = { x: number; y: number; type?: PtType; cx?: number; cy?: number };
type DrawPath = {
  path: SkPath;
  pts: Point[];
  color: string;
  strokeWidth: number;
  lineIndex?: number;
};

const { width, height } = Dimensions.get('window');
const LINE_HEIGHT = 60;
const SNAP_THRESHOLD = 14;

function getClosestLineY(y: number, ruledLines: number[]): number {
  'worklet';
  let minDist = Number.MAX_VALUE;
  let closest: number | null = null;
  for (const lineY of ruledLines) {
    const dist = Math.abs(y - lineY);
    if (dist < minDist) {
      minDist = dist;
      closest = lineY;
    }
  }
  return minDist < SNAP_THRESHOLD ? (closest as number) : y;
}

function snapYBetweenLines(y: number, ruledLines: number[]): number {
  'worklet';
  for (let i = 0; i < ruledLines.length - 1; i++) {
    if (y >= ruledLines[i] && y <= ruledLines[i + 1]) {
      return Math.min(Math.max(y, ruledLines[i] + 4), ruledLines[i + 1] - 4);
    }
  }
  return getClosestLineY(y, ruledLines);
}
//

// ... your imports remain the same

const ScribbleCanvasBck: React.FC = () => {
  const [lineHeight, setLineHeight] = useState(60);

  // 🟢 Multi-page state
  const [pages, setPages] = useState([
    { paths: [] as DrawPath[], undone: [] as DrawPath[] },
  ]);
  const [currentPage, setCurrentPage] = useState(0);

  // 🟢 Instead of single arrays, always use the current page
  const paths = pages[currentPage]?.paths || [];
  const undonePaths = pages[currentPage]?.undone || [];

  const [originalPaths, setOriginalPaths] = useState<DrawPath[]>([]);
  const [currentPath, setCurrentPath] = useState<DrawPath | null>(null);

  const [strokeWidth, setStrokeWidth] = useState(3);
  const [strokeColor, setStrokeColor] = useState('black');
  const [isWriting, setIsWriting] = useState(false);
  const currentPathRef = useRef<DrawPath | null>(null);

  const ruledLines = useMemo<number[]>(
    () =>
      Array.from(
        { length: Math.floor(height / lineHeight) },
        (_, i) => i * lineHeight + lineHeight / 2,
      ),
    [lineHeight],
  );

  // --- your alignment effect remains unchanged ---
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (!isWriting) {
      timer = setTimeout(() => {
        alignEachLineToLeft(10);
      }, 2000);
    }
    return () => clearTimeout(timer);
  }, [isWriting]);

  // ---------------------------
  // ✏️ Writing functions (no major changes)
  // ---------------------------
  function handleStart(x: number, y: number) {
    setIsWriting(true);
    const ySnapped = getClosestLineY(y, ruledLines);
    const lineIndex = ruledLines.findIndex(lineY => lineY === ySnapped);

    const path = Skia.Path.Make();
    path.moveTo(x, ySnapped);
    const newPath: DrawPath = {
      path,
      pts: [{ x, y: ySnapped, type: 'moveTo' }],
      color: strokeColor,
      strokeWidth,
      lineIndex,
    };
    currentPathRef.current = newPath;
    setCurrentPath(newPath);
  }

  function handleUpdate(x: number, y: number) {
    setIsWriting(true);
    if (!currentPathRef.current) return;
    const ySnapped = snapYBetweenLines(y, ruledLines);
    const pts = currentPathRef.current.pts;

    if (pts.length > 0) {
      const lastPt = pts[pts.length - 1];
      const dx = x - lastPt.x;
      const dy = ySnapped - lastPt.y;
      if (dx * dx + dy * dy < 4) return;
    }

    pts.push({ x, y: ySnapped });
    if (pts.length === 2) {
      currentPathRef.current.path.lineTo(x, ySnapped);
    } else if (pts.length > 2) {
      const len = pts.length;
      const prevPrev = pts[len - 3];
      const prev = pts[len - 2];
      const curr = pts[len - 1];
      const mid1 = {
        x: (prevPrev.x + prev.x) / 2,
        y: (prevPrev.y + prev.y) / 2,
      };
      const mid2 = { x: (prev.x + curr.x) / 2, y: (prev.y + curr.y) / 2 };

      if (len === 3) currentPathRef.current.path.moveTo(mid1.x, mid1.y);
      currentPathRef.current.path.quadTo(prev.x, prev.y, mid2.x, mid2.y);
    }
    setCurrentPath({ ...currentPathRef.current });
  }

  function handleEnd() {
    setIsWriting(false);
    if (!currentPathRef.current) return;
    const finishedPath = currentPathRef.current;

    // 🟢 Save to current page
    setPages(prev => {
      const updated = [...prev];
      updated[currentPage].paths = [
        ...updated[currentPage].paths,
        finishedPath,
      ];
      return updated;
    });

    setOriginalPaths(prev => [...prev, finishedPath]);
    currentPathRef.current = null;
    setTimeout(() => setCurrentPath(null), 50);
  }

  const pan = Gesture.Pan()
    .onBegin(e => runOnJS(handleStart)(e.x, e.y))
    .onUpdate(e => runOnJS(handleUpdate)(e.x, e.y))
    .onEnd(() => runOnJS(handleEnd)());

  // ---------------------------
  // ✏️ Editing actions per page
  // ---------------------------
  function handleClear() {
    setPages(prev => {
      const updated = [...prev];
      updated[currentPage].paths = [];
      updated[currentPage].undone = [];
      return updated;
    });
    setCurrentPath(null);
  }

  function handleUndo() {
    setPages(prev => {
      const updated = [...prev];
      const page = updated[currentPage];
      if (page.paths.length > 0) {
        const undone = page.paths.pop()!;
        page.undone = [undone, ...page.undone];
      }
      return updated;
    });
  }

  function handleRedo() {
    setPages(prev => {
      const updated = [...prev];
      const page = updated[currentPage];
      if (page.undone.length > 0) {
        const restored = page.undone.shift()!;
        page.paths.push(restored);
      }
      return updated;
    });
  }

  // function alignEachLineToLeft(marginX: number = 10) {
  //   if (paths.length === 0) return;
  //   // (your alignment logic unchanged, just use paths)
  // }

  function alignEachLineToLeft(marginX: number = 10) {
    setPages(prevPages => {
      const pagesCopy = [...prevPages];
      const page = { ...pagesCopy[currentPage] };

      const pagePaths = page.paths;
      if (!pagePaths || pagePaths.length === 0) return prevPages;

      const lineThreshold = lineHeight;
      const groups: DrawPath[][] = [];

      // Group strokes by approximate Y (use stroke avg Y)
      for (const stroke of pagePaths) {
        if (!stroke.pts || stroke.pts.length === 0) continue;
        const avgY =
          stroke.pts.reduce((s, p) => s + p.y, 0) / stroke.pts.length;

        let found = groups.find(group => {
          // compute group's average Y (all pts in the group)
          const groupPts = group.flatMap(g => g.pts);
          const groupAvgY =
            groupPts.reduce((s, p) => s + p.y, 0) / groupPts.length;
          return Math.abs(groupAvgY - avgY) < lineThreshold;
        });

        if (!found) {
          found = [];
          groups.push(found);
        }
        found.push(stroke);
      }

      if (groups.length === 0) return prevPages;

      // Sort groups top -> bottom by average Y (so output order is preserved)
      const avgOfGroup = (g: DrawPath[]) => {
        const pts = g.flatMap(s => s.pts);
        return pts.reduce((s, p) => s + p.y, 0) / pts.length;
      };
      groups.sort((a, b) => avgOfGroup(a) - avgOfGroup(b));

      // Build shifted paths
      const shiftedPaths: DrawPath[] = [];
      for (const group of groups) {
        const minX = Math.min(...group.flatMap(st => st.pts.map(pt => pt.x)));
        const offsetX = marginX - minX;

        group.forEach(stroke => {
          const newPath = stroke.path.copy(); // SkPath
          // 3x3 translation matrix for Skia
          newPath.transform([1, 0, offsetX, 0, 1, 0, 0, 0, 1]);

          const shiftedPts = stroke.pts.map(pt => ({
            ...pt,
            x: pt.x + offsetX,
          }));

          shiftedPaths.push({
            ...stroke,
            path: newPath,
            pts: shiftedPts,
          });
        });
      }

      // Write back to current page (preserve undone stack)
      page.paths = shiftedPaths;
      pagesCopy[currentPage] = page;

      // Optional: update originalPaths if you rely on it elsewhere
      setOriginalPaths(shiftedPaths);

      return pagesCopy;
    });
  }

  // ---------------------------
  // 🟢 Multi-page navigation
  // ---------------------------
  const handleNextPage = () => {
    setPages(prev => {
      if (currentPage === prev.length - 1) {
        return [...prev, { paths: [], undone: [] }];
      }
      return prev;
    });
    setCurrentPage(p => p + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 0) setCurrentPage(p => p - 1);
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Canvas */}
      <GestureDetector gesture={pan}>
        <Canvas style={{ width, height: height - 190 }}>
          {ruledLines.map((lineY, i) => {
            const ruledPath = Skia.Path.Make();
            ruledPath.moveTo(0, lineY);
            ruledPath.lineTo(width, lineY);
            return (
              <Path
                key={i}
                path={ruledPath}
                color="#EEE"
                strokeWidth={2}
                style="stroke"
              />
            );
          })}
          {paths.map((p, idx) => (
            <Path
              key={idx}
              path={p.path}
              color={p.color}
              strokeWidth={p.strokeWidth}
              style="stroke"
            />
          ))}
          {currentPath && (
            <Path
              path={currentPath.path}
              color={currentPath.color}
              strokeWidth={currentPath.strokeWidth}
              style="stroke"
            />
          )}
        </Canvas>
      </GestureDetector>

      {/* Page indicator */}
      <Text style={{ textAlign: 'center', marginVertical: 5 }}>
        Page {currentPage + 1} / {pages.length}
      </Text>
      <View style={styles.sliderContainer}>
        <Text>Stroke Width: {strokeWidth}</Text>
        <Slider
          style={{ flex: 1 }}
          minimumValue={1}
          maximumValue={20}
          step={1}
          value={strokeWidth}
          onValueChange={setStrokeWidth}
        />
      </View>

      <View style={styles.colorRow}>
        {['black', 'red', 'blue', 'green', 'orange', 'purple'].map(c => (
          <TouchableOpacity
            key={c}
            style={[
              styles.colorButton,
              { backgroundColor: c, borderWidth: strokeColor === c ? 2 : 0 },
            ]}
            onPress={() => setStrokeColor(c)}
          />
        ))}
      </View>
      {/* Bottom Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.ctrlBtn, currentPage === 0 && styles.disabled]}
          onPress={handlePrevPage}
          disabled={currentPage === 0}
        >
          <Text style={styles.ctrlText}>Prev</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.ctrlBtn} onPress={handleUndo}>
          <Text style={styles.ctrlText}>Undo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.ctrlBtn} onPress={handleRedo}>
          <Text style={styles.ctrlText}>Redo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ctrlBtn}
          onPress={() => alignEachLineToLeft(10)}
          disabled={paths.length === 0}
        >
          <Text style={styles.ctrlText}>Align</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctrlBtn} onPress={handleClear}>
          <Text style={styles.ctrlText}>Clear</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.ctrlBtn} onPress={handleNextPage}>
          <Text style={styles.ctrlText}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // keep your old styles
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#f9f9f9',
  },
  ctrlBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  ctrlText: { color: 'white', fontWeight: '600' },
  disabled: { backgroundColor: '#ccc' },

  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 60,
    marginBottom: 5,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 15,
    marginBottom: 10,
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  colorButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginHorizontal: 5,
  },
});
export default ScribbleCanvasBck;
