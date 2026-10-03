// GLB coordinates are meters: interaction reach is ten feet.
export const INTERACTION_DISTANCE_METERS = 3.048;
export type FinishTheme = string;
export const finishThemes = ['original', 'warm', 'light', 'dark'];
export function parseModelVariant(name: string) {
  const match = name.toUpperCase().match(/^THEME_([A-Z0-9_]+?)__([A-Z]+)(?:__(.+))?$/);
  if (!match) return null;
  const palette = match[1].toLowerCase();
  return { theme: ['warm', 'light', 'dark'].includes(palette) ? palette : `model:${palette}`, category: match[2], surface: match[3] ?? '*' };
}
export function parseModelFinish(name: string) {
  const match = name.toUpperCase().match(/^FINISH_([A-Z]+)__(.+)$/);
  return match ? { category: match[1], surface: match[2] } : null;
}
export function availableFinishThemes(samples?: Partial<Record<FinishTheme, unknown>>) {
  return Object.keys(samples ?? {}).filter((theme) => samples?.[theme] !== undefined);
}
export function cycleFinishTheme(current: FinishTheme, direction: number, available: FinishTheme[] = finishThemes): FinishTheme {
  if (!available.length) return 'original';
  const index = Math.max(0, available.indexOf(current));
  return available[(index + Math.sign(direction) + available.length) % available.length];
}
export function walkAction(code: string) {
  return code === 'KeyE' ? 'door' : ['ShiftLeft', 'ShiftRight', 'Shift'].includes(code) ? 'finish' : null;
}
