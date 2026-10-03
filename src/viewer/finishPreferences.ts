export type SavedTheme = string;
export type FinishPreferences = { theme: SavedTheme; overrides: Record<string, SavedTheme>; landscaping: boolean };
const themes = new Set(['original', 'warm', 'light', 'dark']);
const isTheme = (value: unknown): value is string => typeof value === 'string' && (themes.has(value) || /^(?:model|viewer):[a-z0-9]+(?:_[a-z0-9]+)*$/.test(value));
export function parseFinishPreferences(raw: string | null): FinishPreferences | null {
  try {
    const value = JSON.parse(raw ?? 'null');
    if (!value || !isTheme(value.theme) || typeof value.landscaping !== 'boolean' || !value.overrides || typeof value.overrides !== 'object' || Array.isArray(value.overrides)) return null;
    const overrides: Record<string, SavedTheme> = {};
    for (const [key, theme] of Object.entries(value.overrides)) {
      if (isTheme(theme) && key !== '__proto__' && key !== 'constructor') overrides[key] = theme as SavedTheme;
    }
    return { theme: value.theme, landscaping: value.landscaping, overrides };
  } catch { return null; }
}
