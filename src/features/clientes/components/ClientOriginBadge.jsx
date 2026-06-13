import { useClientOrigins } from "@/features/clientes/useClientOrigins";
import { useTheme } from "@/shared/lib/ThemeContext";

// Converte "#RRGGBB" → [r,g,b]. Tolera valores inválidos (usa cinza neutro).
function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "").trim());
  if (!m) return [148, 163, 184]; // slate-400
  const int = parseInt(m[1], 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

const rgbStr = (rgb) => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
const rgba = (rgb, a) => `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a})`;

// Luminância relativa perceptual (0 = preto, 1 = branco).
function luminance([r, g, b]) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

// Mistura linear entre duas cores. t=0 → c1, t=1 → c2.
const mix = (c1, c2, t) => c1.map((v, i) => Math.round(v + (c2[i] - v) * t));

const WHITE = [255, 255, 255];
const BLACK = [15, 18, 24];

// Ajusta a cor base para ter contraste suficiente contra o fundo do tema:
// no dark, clareia cores escuras; no light, escurece cores muito claras.
// Preserva a matiz (mistura só com branco/preto), então a identidade da cor fica.
function readableText(rgb, isDark) {
  const lum = luminance(rgb);
  if (isDark) {
    if (lum >= 0.55) return rgb;
    // quanto mais escura, mais clareia (até ~0.6 de mistura com branco)
    const t = Math.min(0.6, (0.6 - lum) * 1.1);
    return mix(rgb, WHITE, t);
  }
  if (lum <= 0.6) return rgb;
  const t = Math.min(0.55, (lum - 0.5) * 1.1);
  return mix(rgb, BLACK, t);
}

export function ClientOriginBadge({ origin }) {
  const origins = useClientOrigins();
  const { isDark } = useTheme();
  const found = origins.find((o) => o.label === origin);
  const baseRgb = hexToRgb(found?.color || "#94A3B8");
  const textRgb = readableText(baseRgb, isDark);

  return (
    <span
      className="inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-medium whitespace-nowrap"
      style={{
        background: rgba(baseRgb, isDark ? 0.18 : 0.12),
        color: rgbStr(textRgb),
        borderColor: rgba(textRgb, isDark ? 0.45 : 0.5),
      }}
    >
      {origin || "—"}
    </span>
  );
}
