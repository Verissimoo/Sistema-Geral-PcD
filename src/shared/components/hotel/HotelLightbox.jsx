import { useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

// Lightbox read-only reutilizável para galerias de hotel. Recebe uma lista de
// URLs (ou data URLs) e o índice atual; navegação por setas/teclado.
export default function HotelLightbox({ images = [], index = 0, open, onClose, onPrev, onNext }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      else if (e.key === "ArrowLeft") onPrev?.();
      else if (e.key === "ArrowRight") onNext?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, onPrev, onNext]);

  if (!open || images.length === 0) return null;
  const safeIndex = Math.max(0, Math.min(index, images.length - 1));
  const multiple = images.length > 1;

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        className="absolute top-4 right-4 text-white/70 hover:text-white"
        onClick={onClose}
        title="Fechar (Esc)"
      >
        <X className="h-7 w-7" />
      </button>

      {multiple && (
        <button
          className="absolute left-3 sm:left-6 text-white/70 hover:text-white p-2"
          onClick={(e) => { e.stopPropagation(); onPrev?.(); }}
          title="Anterior (←)"
        >
          <ChevronLeft className="h-9 w-9" />
        </button>
      )}

      <img
        src={images[safeIndex]}
        alt={`Foto ${safeIndex + 1}`}
        className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />

      {multiple && (
        <button
          className="absolute right-3 sm:right-6 text-white/70 hover:text-white p-2"
          onClick={(e) => { e.stopPropagation(); onNext?.(); }}
          title="Próxima (→)"
        >
          <ChevronRight className="h-9 w-9" />
        </button>
      )}

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-xs text-white/70 bg-black/40 rounded-full px-3 py-1">
        {safeIndex + 1} / {images.length}
      </div>
    </div>
  );
}
