import { useRef } from "react";
import { ImagePlus } from "lucide-react";

// Área de colar/selecionar imagem, compartilhada entre a seção de hotel do
// orçamento (fotos base64 efêmeras) e o editor de campanhas (upload pro
// Storage). tabIndex permite focar e colar (Ctrl+V).
export default function PasteDropzone({ busy, compact, onPaste, onFiles }) {
  const inputRef = useRef(null);
  return (
    <div
      tabIndex={0}
      onPaste={onPaste}
      onClick={() => inputRef.current?.click()}
      className={`cursor-pointer rounded-lg border border-dashed border-border bg-muted/20 hover:bg-muted/40 transition-colors text-center text-text-muted focus:outline-none focus:ring-2 focus:ring-ring ${compact ? "p-3 text-xs" : "p-4 text-sm"}`}
    >
      <ImagePlus className={`mx-auto mb-1 ${compact ? "h-4 w-4" : "h-5 w-5"}`} />
      {busy ? "Processando imagem…" : "Clique para selecionar ou cole (Ctrl+V) uma imagem aqui"}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={!compact}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length) onFiles(files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
