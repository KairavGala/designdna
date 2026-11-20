import type { HSLColor, LabColor, RGBColor } from '../../types/colors';

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

export function rgbToHex({ r, g, b }: RGBColor): string {
  const rr = clampByte(r).toString(16).padStart(2, '0');
  const gg = clampByte(g).toString(16).padStart(2, '0');
  const bb = clampByte(b).toString(16).padStart(2, '0');
  return `#${rr}${gg}${bb}`.toUpperCase();
}

export function rgbToHsl({ r, g, b }: RGBColor): HSLColor {
  const rn = clampByte(r) / 255;
  const gn = clampByte(g) / 255;
  const bn = clampByte(b) / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const lightness = (max + min) / 2;

  let hue = 0;
  let saturation = 0;

  if (delta !== 0) {
    saturation =
      lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

    switch (max) {
      case rn:
        hue = ((gn - bn) / delta + (gn < bn ? 6 : 0)) / 6;
        break;
      case gn:
        hue = ((bn - rn) / delta + 2) / 6;
        break;
      case bn:
        hue = ((rn - gn) / delta + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(hue * 360) % 360,
    s: Math.round(saturation * 100),
    l: Math.round(lightness * 100)
  };
}

function linearizeSrgbChannel(channel255: number): number {
  const c = channel255 / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Converts sRGB (0..255) to CIE Lab (D65 illuminant) for perceptually uniform
 * colour distance comparisons during deterministic cluster merging.
 */
export function rgbToLab({ r, g, b }: RGBColor): LabColor {
  const lr = linearizeSrgbChannel(r);
  const lg = linearizeSrgbChannel(g);
  const lb = linearizeSrgbChannel(b);

  // sRGB to CIE XYZ (D65 reference white: Xn=0.95047, Yn=1.0, Zn=1.08883)
  const x = (lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375) / 0.95047;
  const y = (lr * 0.2126729 + lg * 0.7151522 + lb * 0.072175) / 1.0;
  const z = (lr * 0.0193339 + lg * 0.119192 + lb * 0.9503041) / 1.08883;

  const f = (t: number): number =>
    t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;

  const fx = f(x);
  const fy = f(y);
  const fz = f(z);

  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz)
  };
}

export function deltaE76(a: LabColor, b: LabColor): number {
  const dl = a.l - b.l;
  const da = a.a - b.a;
  const db = a.b - b.b;
  return Math.sqrt(dl * dl + da * da + db * db);
}

export function formatRgb({ r, g, b }: RGBColor): string {
  return `rgb(${clampByte(r)}, ${clampByte(g)}, ${clampByte(b)})`;
}

export function formatHsl({ h, s, l }: HSLColor): string {
  return `hsl(${h}, ${s}%, ${l}%)`;
}

export function getRelativeLuminance({ r, g, b }: RGBColor): number {
  const lr = linearizeSrgbChannel(clampByte(r));
  const lg = linearizeSrgbChannel(clampByte(g));
  const lb = linearizeSrgbChannel(clampByte(b));
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

export function isLightColor(rgb: RGBColor): boolean {
  return getRelativeLuminance(rgb) > 0.55;
}
