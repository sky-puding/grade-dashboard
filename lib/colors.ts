export const SUBJECT_COLORS = [
  "#2563eb", // blue
  "#dc2626", // red
  "#16a34a", // green
  "#d97706", // amber
  "#7c3aed", // violet
  "#0891b2", // cyan
];

export function colorForIndex(index: number) {
  return SUBJECT_COLORS[index % SUBJECT_COLORS.length];
}
