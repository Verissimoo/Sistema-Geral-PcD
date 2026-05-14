import { Building2 } from "lucide-react";

/**
 * Logo da empresa parceira — sem fundo, apenas a imagem com borda âmbar opcional.
 * A imagem se encaixa naturalmente com o background do banner.
 *
 * variants:
 *   - "banner"  → grande (h: 80px) — portal do parceiro
 *   - "preview" → médio (h: 80px) — configuração da empresa
 *   - "header"  → médio (h: 64px) — header do PDF
 *   - "card"    → pequeno (h: 56px) — listagens
 */
const SIZE_CLASSES = {
  banner: "h-20 max-w-[260px]",
  preview: "h-20 max-w-[260px]",
  header: "h-16 max-w-[220px]",
  card: "h-14 max-w-[180px]",
};

const FALLBACK_SIZE_CLASSES = {
  banner: "h-20 w-20",
  preview: "h-20 w-20",
  header: "h-16 w-16",
  card: "h-14 w-14",
};

export default function PartnerLogo({
  src,
  alt,
  variant = "banner",
  showBorder = true,
  className = "",
}) {
  if (!src) {
    return (
      <div
        className={`${FALLBACK_SIZE_CLASSES[variant]} rounded-xl ${
          showBorder ? "border-2 border-amber-400" : ""
        } bg-white/10 backdrop-blur-sm flex items-center justify-center ${className}`}
      >
        <Building2 className="w-1/2 h-1/2 text-white/60" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || "Logo"}
      loading="lazy"
      className={`${SIZE_CLASSES[variant]} w-auto object-contain ${
        showBorder ? "border-2 border-[#F4A224] rounded-xl p-1.5" : ""
      } ${className}`}
    />
  );
}
