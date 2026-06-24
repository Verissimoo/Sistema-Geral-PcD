// Redimensiona/comprime uma imagem no client (canvas) e devolve um data URL
// base64 JPEG. Usado para fotos efêmeras (não vão pro banco) que serão
// injetadas no HTML do PDF na hora de gerar.

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Comprime uma imagem (File/Blob ou data URL) para no máximo `maxWidth` de
 * largura e qualidade JPEG `quality`. Retorna um data URL (string).
 */
export async function compressImage(input, { maxWidth = 1600, quality = 0.8 } = {}) {
  const dataUrl = typeof input === "string" ? input : await fileToDataUrl(input);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        // Sem canvas: devolve o original (melhor que falhar).
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      try {
        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// Extrai o primeiro arquivo de imagem de um evento de paste (Ctrl+V).
export function imageFileFromPaste(e) {
  const items = e.clipboardData?.items ? Array.from(e.clipboardData.items) : [];
  const item = items.find((it) => it.type && it.type.startsWith("image/"));
  return item ? item.getAsFile() : null;
}
