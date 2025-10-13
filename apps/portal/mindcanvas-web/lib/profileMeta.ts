// lib/profileMeta.ts
export type Flow = 'A' | 'B' | 'C' | 'D';

export const FLOW_LABELS: Record<Flow, string> = {
  A: 'Catalyst',
  B: 'Communications',
  C: 'Rhythmic',
  D: 'Observer',
};

// Profile metadata: name, brand color (HEX), primary flow letter
export const PROFILE_META = {
  P1: { name: 'The Innovator',        color: '#175f15', flow: 'A' as Flow },
  P2: { name: 'The Storyteller',      color: '#2ecc2f', flow: 'B' as Flow },          // Catalyst–Communications (we pick B)
  P3: { name: 'The Heart-Centred Coach', color: '#ea430e', flow: 'B' as Flow },
  P4: { name: 'The Negotiator',       color: '#f52905', flow: 'C' as Flow },          // Communications–Rhythmic (we pick C)
  P5: { name: 'The Grounded Guide',   color: '#f3c90d', flow: 'C' as Flow },
  P6: { name: 'The Thinker',          color: '#f8ee18', flow: 'D' as Flow },          // Rhythmic–Observer (we pick D)
  P7: { name: 'The Mastermind',       color: '#5d5d5d', flow: 'D' as Flow },
  P8: { name: 'The Change Agent',     color: '#8a8583', flow: 'A' as Flow },          // Catalyst–Observer (we pick A)
} as const;

export function safeHex(hex?: string | null, fallback = '#111111') {
  if (!hex) return fallback;
  const v = String(hex).trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v) ? v : fallback; // avoid oklch() etc.
}

export function profileImagePath(code?: string | null) {
  const c = (code ?? '').toUpperCase();
  // put your images in /public/profiles/p1.png ... p8.png (or .jpg)
  const fname = ({
    P1: 'p1.png', P2: 'p2.png', P3: 'p3.png', P4: 'p4.png',
    P5: 'p5.png', P6: 'p6.png', P7: 'p7.png', P8: 'p8.png',
  } as Record<string,string>)[c];
  return fname ? `/profiles/${fname}` : '';
}

