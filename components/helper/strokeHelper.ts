export function getSvgPathFromStroke(points: number[][]): string {
  if (!points.length) return '';

  const d = points.reduce((acc, [x0, y0], i, arr) => {
    const [x1, y1] = arr[(i + 1) % arr.length];
    acc.push(`${i === 0 ? 'M' : 'L'} ${x0.toFixed(2)} ${y0.toFixed(2)}`);
    if (x1 !== undefined) {
      acc.push(`L ${x1.toFixed(2)} ${y1.toFixed(2)}`);
    }
    return acc;
  }, [] as string[]);

  return d.join(' ');
}
