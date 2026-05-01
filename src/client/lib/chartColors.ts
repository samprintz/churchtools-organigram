const CT_COLOR_MAP: Record<string, string> = {
  sky: '#0ea5e9',
  lime: '#84cc16',
};

const FALLBACK_COLOR = '#1976D2';

export function ctColorToHex(ctColor: string | undefined): string {
  if (!ctColor) return FALLBACK_COLOR;
  return CT_COLOR_MAP[ctColor.toLowerCase()] ?? FALLBACK_COLOR;
}
