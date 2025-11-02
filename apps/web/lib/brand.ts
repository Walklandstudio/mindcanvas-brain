// Utilities to convert HEX to HSL strings and apply brand.json to CSS vars
type Hex = `#${string}`;

function hexToHsl(hex: Hex): string {
  const m = hex.replace('#', '');
  const bigint = parseInt(m.length === 3 ? m.split('').map(c => c + c).join('') : m, 16);
  const r = (bigint >> 16) & 255, g = (bigint >> 8) & 255, b = bigint & 255;
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  let h = 0, s = 0, l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn: h = (gn - bn) / d + (gn < bn ? 6 : 0); break;
      case gn: h = (bn - rn) / d + 2; break;
      case bn: h = (rn - gn) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export type Brand = {
  primary: { hex: Hex; fgHex: Hex };
  neutral: { bgHex: Hex; surfaceHex: Hex; borderHex: Hex; textHex: Hex; subtleHex: Hex };
  frequencies: { A: Hex; B: Hex; C: Hex; D: Hex };
  radii: { md: number; lg: number };
  shadow: { sm: string; md: string };
  typography: {
    h1Px: number; h2Px: number; h3Px: number; bodyPx: number;
    tightTracking: number; sansFontVar: string; displayFontVar: string;
  };
};

export async function loadBrand(): Promise<Brand> {
  const res = await fetch('/brand.json', { cache: 'no-store' });
  return res.json();
}

export function applyBrand(b: Brand) {
  const root = document.documentElement.style;

  // neutrals
  root.setProperty('--mc-bg', hexToHsl(b.neutral.bgHex));
  root.setProperty('--mc-surface', hexToHsl(b.neutral.surfaceHex));
  root.setProperty('--mc-border', hexToHsl(b.neutral.borderHex));
  root.setProperty('--mc-text', hexToHsl(b.neutral.textHex));
  root.setProperty('--mc-subtle', hexToHsl(b.neutral.subtleHex));

  // primary
  root.setProperty('--mc-primary', hexToHsl(b.primary.hex));
  root.setProperty('--mc-primary-fg', hexToHsl(b.primary.fgHex));

  // frequencies
  root.setProperty('--freq-a', hexToHsl(b.frequencies.A));
  root.setProperty('--freq-b', hexToHsl(b.frequencies.B));
  root.setProperty('--freq-c', hexToHsl(b.frequencies.C));
  root.setProperty('--freq-d', hexToHsl(b.frequencies.D));

  // radii + shadows
  root.setProperty('--mc-radius-md', `${b.radii.md}px`);
  root.setProperty('--mc-radius-lg', `${b.radii.lg}px`);
  root.setProperty('--mc-shadow-sm', b.shadow.sm);
  root.setProperty('--mc-shadow-md', b.shadow.md);

  // type scale
  root.setProperty('--mc-h1', `${b.typography.h1Px}px`);
  root.setProperty('--mc-h2', `${b.typography.h2Px}px`);
  root.setProperty('--mc-h3', `${b.typography.h3Px}px`);
  root.setProperty('--mc-body', `${b.typography.bodyPx}px`);
  root.setProperty('--mc-tight', `${b.typography.tightTracking}em`);
}
