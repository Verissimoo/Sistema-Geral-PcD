import { useState } from "react";
import { Trash2, Plus, ArrowUp, ArrowDown, Loader2, Hotel } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/ui/dialog";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { useToast } from "@/shared/ui/use-toast";
import { parseBR, sanitizeBRInput } from "@/shared/lib/parseBR";
import { formatBRL } from "@/shared/lib/format";
import { compressImage, imageFileFromPaste } from "@/shared/lib/imageCompress";
import PasteDropzone from "@/shared/components/hotel/PasteDropzone";
import { useUpdateHotel } from "@/api/hooks";
import { uploadCampaignPhoto, removeCampaignPhoto } from "@/api/campanhas";

let _seq = 0;
const newId = () => globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${_seq++}`;
// Número (DB) → string BR para o input ("4.500,00"); vazio quando nulo.
const toBRInput = (n) =>
  n == null || n === "" ? "" : Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Editor de um hotel de campanha. As fotos vão direto pro Storage (bucket
// campaign-hotels) e cada alteração é PERSISTIDA na hora (sem botão salvar):
// assim o DB e o Storage nunca ficam dessincronizados. O hotel já existe (foi
// criado vazio antes de abrir o editor), então sempre temos um id.
export default function CampanhaHotelEditor({ hotel, campaignId, open, onOpenChange }) {
  const { toast } = useToast();
  const updateHotel = useUpdateHotel();
  const [busy, setBusy] = useState(false);

  // Estado local de edição. Preços ficam como string BR enquanto edita.
  const [name, setName] = useState(hotel?.name || "");
  const [location, setLocation] = useState(hotel?.location || "");
  const [description, setDescription] = useState(hotel?.description || "");
  const [commission, setCommission] = useState(toBRInput(hotel?.hotel_commission_suggested));
  const [photos, setPhotos] = useState(Array.isArray(hotel?.photos) ? hotel.photos : []);
  const [rooms, setRooms] = useState(
    (Array.isArray(hotel?.rooms) ? hotel.rooms : []).map((r) => ({
      id: r.id || newId(),
      name: r.name || "",
      price_from: toBRInput(r.price_from),
      photo_url: r.photo_url || null,
      photo_path: r.photo_path || null,
    }))
  );
  const [additionals, setAdditionals] = useState(
    (Array.isArray(hotel?.additionals) ? hotel.additionals : []).map((a) => ({
      name: a.name || "",
      price_from: toBRInput(a.price_from),
    }))
  );

  const roomsToDb = (list) =>
    list.map((r) => ({
      id: r.id,
      name: r.name,
      price_from: parseBR(r.price_from),
      photo_url: r.photo_url || null,
      photo_path: r.photo_path || null,
    }));
  const additionalsToDb = (list) =>
    list.map((a) => ({ name: a.name, price_from: parseBR(a.price_from) }));

  // Persiste um patch no hotel (DB). Mostra toast em caso de erro.
  const persist = async (updates) => {
    try {
      await updateHotel.mutateAsync({ id: hotel.id, updates });
    } catch {
      toast({ title: "Erro ao salvar o hotel", variant: "destructive" });
    }
  };

  // ── Galeria de fotos (Storage) ────────────────────────────────────
  const addPhotoFromFile = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await compressImage(file, { maxWidth: 1600, quality: 0.8 });
      const saved = await uploadCampaignPhoto(dataUrl, { campaignId, hotelId: hotel.id });
      const next = [...photos, saved];
      setPhotos(next);
      await persist({ photos: next });
    } catch {
      toast({ title: "Falha ao enviar a imagem", variant: "destructive" });
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
    persist({ photos: next });
  };
  const removePhoto = async (idx) => {
    const target = photos[idx];
    const next = photos.filter((_, i) => i !== idx);
    setPhotos(next);
    await persist({ photos: next });
    if (target?.path) {
      try { await removeCampaignPhoto(target.path); } catch { /* arquivo órfão, sem bloquear */ }
    }
  };

  // ── Quartos ───────────────────────────────────────────────────────
  const addRoom = () => {
    const next = [...rooms, { id: newId(), name: "", price_from: "", photo_url: null, photo_path: null }];
    setRooms(next);
    persist({ rooms: roomsToDb(next) });
  };
  const updateRoomLocal = (idx, patch) =>
    setRooms((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const saveRooms = (list) => persist({ rooms: roomsToDb(list) });
  const removeRoom = async (idx) => {
    const target = rooms[idx];
    const next = rooms.filter((_, i) => i !== idx);
    setRooms(next);
    await persist({ rooms: roomsToDb(next) });
    if (target?.photo_path) {
      try { await removeCampaignPhoto(target.photo_path); } catch { /* órfão */ }
    }
  };
  const setRoomPhoto = async (idx, file) => {
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await compressImage(file, { maxWidth: 1600, quality: 0.8 });
      const saved = await uploadCampaignPhoto(dataUrl, { campaignId, hotelId: hotel.id });
      const old = rooms[idx];
      const next = rooms.map((r, i) =>
        i === idx ? { ...r, photo_url: saved.url, photo_path: saved.path } : r
      );
      setRooms(next);
      await persist({ rooms: roomsToDb(next) });
      if (old?.photo_path) {
        try { await removeCampaignPhoto(old.photo_path); } catch { /* órfão */ }
      }
    } catch {
      toast({ title: "Falha ao enviar a imagem", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };
  const removeRoomPhoto = async (idx) => {
    const target = rooms[idx];
    const next = rooms.map((r, i) => (i === idx ? { ...r, photo_url: null, photo_path: null } : r));
    setRooms(next);
    await persist({ rooms: roomsToDb(next) });
    if (target?.photo_path) {
      try { await removeCampaignPhoto(target.photo_path); } catch { /* órfão */ }
    }
  };

  // ── Adicionais ────────────────────────────────────────────────────
  const addAdditional = () => {
    const next = [...additionals, { name: "", price_from: "" }];
    setAdditionals(next);
    persist({ additionals: additionalsToDb(next) });
  };
  const updateAdditionalLocal = (idx, patch) =>
    setAdditionals((as) => as.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  const removeAdditional = (idx) => {
    const next = additionals.filter((_, i) => i !== idx);
    setAdditionals(next);
    persist({ additionals: additionalsToDb(next) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hotel className="h-4 w-4 text-primary" /> Hotel da campanha
            {updateHotel.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-text-muted" />}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-xs text-text-muted">
            Preços são <strong>ilustrativos</strong> ("a partir de") — entram como sugestão editável no orçamento.
            As alterações são salvas automaticamente.
          </p>

          {/* Dados do hotel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nome do hotel</Label>
              <Input value={name} placeholder="Ex: Hotel Praia Mansa"
                onChange={(e) => setName(e.target.value)} onBlur={() => persist({ name })} />
            </div>
            <div className="space-y-1.5">
              <Label>Localização</Label>
              <Input value={location} placeholder="Ex: Fortaleza — Praia do Futuro"
                onChange={(e) => setLocation(e.target.value)} onBlur={() => persist({ location })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea rows={2} value={description} placeholder="All inclusive, café da manhã, etc."
              onChange={(e) => setDescription(e.target.value)} onBlur={() => persist({ description })} />
          </div>
          <div className="space-y-1.5 max-w-xs">
            <Label>Comissão sugerida (R$)</Label>
            <Input type="text" inputMode="decimal" value={commission} placeholder="Ex: 400,00"
              onChange={(e) => setCommission(sanitizeBRInput(e.target.value))}
              onBlur={() => persist({ hotel_commission_suggested: parseBR(commission) })} />
            <p className="text-[11px] text-text-muted">Editável no orçamento. Não aparece pro cliente.</p>
          </div>

          {/* Galeria */}
          <div className="space-y-2">
            <Label>Fotos do hotel</Label>
            <PasteDropzone busy={busy} onPaste={onGalleryPaste} onFiles={(files) => files.forEach(addPhotoFromFile)} />
            {photos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {photos.map((p, idx) => (
                  <div key={p.path || idx} className="relative group rounded-lg overflow-hidden border border-border">
                    <img src={p.url} alt={`Foto ${idx + 1}`} className="w-full h-24 object-cover" />
                    <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button type="button" className="p-1 text-white disabled:opacity-30" disabled={idx === 0} onClick={() => movePhoto(idx, -1)} title="Mover">
                        <ArrowUp className="h-3.5 w-3.5 -rotate-90" />
                      </button>
                      <button type="button" className="p-1 text-white" onClick={() => removePhoto(idx)} title="Remover">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" className="p-1 text-white disabled:opacity-30" disabled={idx === photos.length - 1} onClick={() => movePhoto(idx, 1)} title="Mover">
                        <ArrowDown className="h-3.5 w-3.5 -rotate-90" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quartos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Quartos (preço "a partir de")</Label>
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addRoom}>
                <Plus className="h-3.5 w-3.5" /> Adicionar quarto
              </Button>
            </div>
            {rooms.length === 0 && <p className="text-xs text-text-muted">Nenhum quarto ainda.</p>}
            {rooms.map((room, idx) => (
              <Card key={room.id} className="border-border bg-muted/30">
                <CardContent className="p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Quarto {idx + 1}</span>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-text-muted hover:text-danger" onClick={() => removeRoom(idx)} title="Remover">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nome / categoria</Label>
                      <Input value={room.name} placeholder="Ex: Suíte Vista Mar"
                        onChange={(e) => updateRoomLocal(idx, { name: e.target.value })}
                        onBlur={() => saveRooms(rooms)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">A partir de (R$)</Label>
                      <Input type="text" inputMode="decimal" value={room.price_from} placeholder="Ex: 3.500,00"
                        onChange={(e) => updateRoomLocal(idx, { price_from: sanitizeBRInput(e.target.value) })}
                        onBlur={() => saveRooms(rooms)} />
                      {parseBR(room.price_from) > 0 && (
                        <p className="text-[11px] text-text-muted">{formatBRL(parseBR(room.price_from))}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Foto do quarto (opcional)</Label>
                    {room.photo_url ? (
                      <div className="relative inline-block rounded-lg overflow-hidden border border-border">
                        <img src={room.photo_url} alt={`Quarto ${idx + 1}`} className="h-28 w-auto object-cover" />
                        <button type="button" className="absolute top-1 right-1 bg-black/60 text-white rounded p-1" onClick={() => removeRoomPhoto(idx)} title="Remover foto">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <PasteDropzone busy={busy} compact
                        onPaste={(e) => { const f = imageFileFromPaste(e); if (f) { e.preventDefault(); setRoomPhoto(idx, f); } }}
                        onFiles={(files) => files[0] && setRoomPhoto(idx, files[0])} />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Adicionais */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Adicionais (preço "a partir de")</Label>
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addAdditional}>
                <Plus className="h-3.5 w-3.5" /> Adicionar
              </Button>
            </div>
            {additionals.length === 0 && <p className="text-xs text-text-muted">Nenhum adicional ainda.</p>}
            {additionals.map((a, idx) => (
              <div key={idx} className="flex items-end gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs">Descrição</Label>
                  <Input value={a.name} placeholder="Ex: Passeio de buggy"
                    onChange={(e) => updateAdditionalLocal(idx, { name: e.target.value })}
                    onBlur={() => persist({ additionals: additionalsToDb(additionals) })} />
                </div>
                <div className="w-36 space-y-1.5">
                  <Label className="text-xs">A partir de (R$)</Label>
                  <Input type="text" inputMode="decimal" value={a.price_from} placeholder="Ex: 200,00"
                    onChange={(e) => updateAdditionalLocal(idx, { price_from: sanitizeBRInput(e.target.value) })}
                    onBlur={() => persist({ additionals: additionalsToDb(additionals) })} />
                </div>
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-text-muted hover:text-danger" onClick={() => removeAdditional(idx)} title="Remover">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>Concluir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
