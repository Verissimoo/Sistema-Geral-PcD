import { useRef, useState } from "react";
import { Hotel, ImagePlus, Trash2, Plus, ArrowUp, ArrowDown, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { parseBR, sanitizeBRInput } from "@/shared/lib/parseBR";
import { formatBRL } from "@/shared/lib/format";
import { compressImage, imageFileFromPaste } from "@/shared/lib/imageCompress";

export const EMPTY_HOTEL = {
  name: "",
  location: "",
  check_in: "",
  check_out: "",
  nights: "",
  description: "",
  // Comissão fixa da consolidadora (R$) — entra como LUCRO da agência sobre o
  // hotel (ver pricingCalculator: análogo ao DU da consolidadora aérea).
  hotel_commission: "",
  // Quarto principal para o cálculo/comissão (o cliente escolhe um). Default na
  // precificação = primeiro quarto quando vazio.
  selected_room_id: null,
  photos: [],
  rooms: [],
};

let _seq = 0;
const newId = () =>
  (globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${_seq++}`);

// Nº de diárias derivado das datas (quando ambas presentes).
function nightsFromDates(checkIn, checkOut) {
  if (!checkIn || !checkOut) return null;
  const a = new Date(checkIn + "T12:00:00");
  const b = new Date(checkOut + "T12:00:00");
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  const diff = Math.round((b - a) / 86400000);
  return diff > 0 ? diff : null;
}

export default function HotelSection({ hotel, onChange }) {
  const h = hotel || EMPTY_HOTEL;
  const photos = Array.isArray(h.photos) ? h.photos : [];
  const rooms = Array.isArray(h.rooms) ? h.rooms : [];
  const [busy, setBusy] = useState(false);

  const derivedNights = nightsFromDates(h.check_in, h.check_out);

  // Heurística de "reaberto": tem metadados de hotel mas nenhuma foto carregada
  // → as imagens foram removidas ao salvar e precisam ser coladas de novo.
  const hasMeta = !!h.name || rooms.length > 0;
  const noPhotos = photos.length === 0 && rooms.every((r) => !r.photo);
  const looksReopened = hasMeta && noPhotos;

  const setPhotos = (next) => onChange({ photos: next });
  const setRooms = (next) => onChange({ rooms: next });

  const addPhotoFromFile = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const src = await compressImage(file, { maxWidth: 1600, quality: 0.8 });
      setPhotos([...photos, { id: newId(), src }]);
    } catch {
      /* ignora arquivo inválido */
    } finally {
      setBusy(false);
    }
  };

  const onGalleryPaste = (e) => {
    const file = imageFileFromPaste(e);
    if (file) {
      e.preventDefault();
      addPhotoFromFile(file);
    }
  };

  const movePhoto = (idx, dir) => {
    const j = idx + dir;
    if (j < 0 || j >= photos.length) return;
    const next = [...photos];
    [next[idx], next[j]] = [next[j], next[idx]];
    setPhotos(next);
  };
  const removePhoto = (idx) => setPhotos(photos.filter((_, i) => i !== idx));

  // Quarto principal para o cálculo (default = primeiro). O cliente escolhe um;
  // o vendedor marca qual entra na precificação/comissão.
  const selectedRoomId = h.selected_room_id || rooms[0]?.id || null;
  const setSelectedRoom = (id) => onChange({ selected_room_id: id });

  const addRoom = () => {
    const id = newId();
    const next = [...rooms, { id, name: "", value: "", photo: null }];
    // Primeiro quarto criado vira automaticamente o principal.
    onChange(rooms.length === 0 ? { rooms: next, selected_room_id: id } : { rooms: next });
  };
  const updateRoom = (idx, patch) =>
    setRooms(rooms.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const removeRoom = (idx) => {
    const removed = rooms[idx];
    const next = rooms.filter((_, i) => i !== idx);
    // Se removeu o principal, reaponta para o primeiro restante.
    if (removed?.id === selectedRoomId) {
      onChange({ rooms: next, selected_room_id: next[0]?.id || null });
    } else {
      onChange({ rooms: next });
    }
  };

  const setRoomPhotoFromFile = async (idx, file) => {
    if (!file) return;
    setBusy(true);
    try {
      const src = await compressImage(file, { maxWidth: 1600, quality: 0.8 });
      updateRoom(idx, { photo: src });
    } catch {
      /* ignora */
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-border/50">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Hotel className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Hotel</h3>
        </div>

        {/* Aviso fixo sobre fotos efêmeras */}
        <div className={`flex items-start gap-2 rounded-lg p-3 text-xs border ${looksReopened ? "bg-warning/10 border-warning/30 text-warning" : "bg-accent/5 border-accent/30 text-text-muted"}`}>
          <AlertTriangle className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${looksReopened ? "text-warning" : "text-accent"}`} />
          {looksReopened
            ? "As imagens não ficam salvas no orçamento. Para gerar o PDF novamente, cole as fotos do hotel e dos quartos outra vez."
            : "As fotos não são salvas no banco — ficam só na memória para gerar o PDF agora. Ao reabrir o orçamento, será preciso colá-las de novo."}
        </div>

        {/* Dados do hotel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Nome do hotel</Label>
            <Input placeholder="Ex: Hotel Copacabana Palace"
              value={h.name} onChange={(e) => onChange({ name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Localização (opcional)</Label>
            <Input placeholder="Ex: Rio de Janeiro — Copacabana"
              value={h.location} onChange={(e) => onChange({ location: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Check-in (opcional)</Label>
            <Input type="date" value={h.check_in} onChange={(e) => onChange({ check_in: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Check-out (opcional)</Label>
            <Input type="date" value={h.check_out} onChange={(e) => onChange({ check_out: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Diárias {derivedNights ? `(sugerido: ${derivedNights})` : "(opcional)"}</Label>
            <Input type="number" min="0" placeholder={derivedNights ? String(derivedNights) : "Ex: 5"}
              value={h.nights} onChange={(e) => onChange({ nights: e.target.value })} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Descrição (opcional)</Label>
          <Textarea rows={2} placeholder="Café da manhã incluso, vista para o mar, etc."
            value={h.description} onChange={(e) => onChange({ description: e.target.value })} />
        </div>

        {/* Comissão da consolidadora — campo INTERNO (não vai pro cliente/parceiro) */}
        <div className="space-y-1.5 rounded-lg border border-accent/30 bg-accent/5 p-3">
          <Label className="text-xs">Comissão da consolidadora (R$) — interno</Label>
          <Input type="text" inputMode="decimal" placeholder="Ex: 500,00" className="max-w-xs"
            value={h.hotel_commission}
            onChange={(e) => onChange({ hotel_commission: sanitizeBRInput(e.target.value) })} />
          <p className="text-[11px] text-text-muted">
            Lucro da agência sobre o hotel. Não aparece no orçamento do cliente.
            {parseBR(h.hotel_commission) > 0 && ` (${formatBRL(parseBR(h.hotel_commission))})`}
          </p>
        </div>

        {/* Galeria de fotos */}
        <div className="space-y-2">
          <Label>Fotos do hotel</Label>
          <PasteDropzone busy={busy} onPaste={onGalleryPaste} onFiles={(files) => files.forEach(addPhotoFromFile)} />
          {photos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {photos.map((p, idx) => (
                <div key={p.id} className="relative group rounded-lg overflow-hidden border border-border">
                  <img src={p.src} alt={`Foto ${idx + 1}`} className="w-full h-24 object-cover" />
                  <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" className="p-1 text-white disabled:opacity-30" disabled={idx === 0} onClick={() => movePhoto(idx, -1)} title="Mover para esquerda">
                      <ArrowUp className="h-3.5 w-3.5 -rotate-90" />
                    </button>
                    <button type="button" className="p-1 text-white" onClick={() => removePhoto(idx)} title="Remover">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" className="p-1 text-white disabled:opacity-30" disabled={idx === photos.length - 1} onClick={() => movePhoto(idx, 1)} title="Mover para direita">
                      <ArrowDown className="h-3.5 w-3.5 -rotate-90" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Opções de quarto */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Opções de quarto (o cliente escolhe uma)</Label>
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addRoom}>
              <Plus className="h-3.5 w-3.5" /> Adicionar opção de quarto
            </Button>
          </div>
          {rooms.length === 0 && (
            <p className="text-xs text-text-muted">Nenhuma opção de quarto ainda.</p>
          )}
          {rooms.map((room, idx) => (
            <Card key={room.id} className="border-border bg-muted/30">
              <CardContent className="p-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Quarto {idx + 1}</span>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-[11px] text-text-muted cursor-pointer select-none">
                      <input
                        type="radio"
                        name="hotel-principal-room"
                        className="accent-primary"
                        checked={selectedRoomId === room.id}
                        onChange={() => setSelectedRoom(room.id)}
                      />
                      Principal (cálculo)
                    </label>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-text-muted hover:text-danger" onClick={() => removeRoom(idx)} title="Remover">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nome / categoria</Label>
                    <Input placeholder="Ex: Suíte Luxo Vista Mar"
                      value={room.name} onChange={(e) => updateRoom(idx, { name: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Valor (R$)</Label>
                    <Input type="text" inputMode="decimal" placeholder="Ex: 4.500,00"
                      value={room.value} onChange={(e) => updateRoom(idx, { value: sanitizeBRInput(e.target.value) })} />
                    {parseBR(room.value) > 0 && (
                      <p className="text-[11px] text-text-muted">{formatBRL(parseBR(room.value))}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Foto do quarto (opcional)</Label>
                  {room.photo ? (
                    <div className="relative inline-block rounded-lg overflow-hidden border border-border">
                      <img src={room.photo} alt={`Quarto ${idx + 1}`} className="h-28 w-auto object-cover" />
                      <button type="button" className="absolute top-1 right-1 bg-black/60 text-white rounded p-1" onClick={() => updateRoom(idx, { photo: null })} title="Remover foto">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <PasteDropzone
                      busy={busy}
                      compact
                      onPaste={(e) => {
                        const file = imageFileFromPaste(e);
                        if (file) { e.preventDefault(); setRoomPhotoFromFile(idx, file); }
                      }}
                      onFiles={(files) => files[0] && setRoomPhotoFromFile(idx, files[0])}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Área de colar/selecionar imagem. tabIndex permite focar e colar (Ctrl+V).
function PasteDropzone({ busy, compact, onPaste, onFiles }) {
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
