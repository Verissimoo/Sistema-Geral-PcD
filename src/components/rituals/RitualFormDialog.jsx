import { useState, useEffect } from "react";
import { supabaseClient } from "@/api/supabaseClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function RitualFormDialog({ open, onClose, onSave, ritual }) {
  const [contractors, setContractors] = useState([]);
  const [form, setForm] = useState(ritual || {
    title: "",
    type: "Planejamento mensal",
    contractor_id: "",
    contractor_name: "",
    event_date: new Date().toISOString().split("T")[0],
    notes: "",
    completed: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabaseClient.entities.Contractor.list().then(setContractors);
  }, []);

  useEffect(() => {
    if (ritual) setForm(ritual);
    else setForm({
      title: "", type: "Planejamento mensal", contractor_id: "", contractor_name: "",
      event_date: new Date().toISOString().split("T")[0], notes: "", completed: false,
    });
  }, [ritual]);

  const set = (key, value) => {
    setForm(prev => {
      const updated = { ...prev, [key]: value };
      if (key === "contractor_id") {
        const c = contractors.find(x => x.id === value);
        if (c) updated.contractor_name = c.name;
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (ritual?.id) {
        await supabaseClient.entities.Ritual.update(ritual.id, form);
      } else {
        await supabaseClient.entities.Ritual.create(form);
      }
      onSave();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar ritual:', error);
      alert('Erro ao salvar os dados: ' + (error.message || JSON.stringify(error)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{ritual ? "Editar Evento" : "Novo Evento"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Título</Label>
            <Input required value={form.title} onChange={e => set("title", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={v => set("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Planejamento mensal">Planejamento mensal</SelectItem>
                  <SelectItem value="Acompanhamento quinzenal">Acompanhamento quinzenal</SelectItem>
                  <SelectItem value="Fechamento mensal">Fechamento mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data</Label>
              <Input type="date" required value={form.event_date} onChange={e => set("event_date", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Prestador</Label>
            <Select value={form.contractor_id} onValueChange={v => set("contractor_id", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {contractors.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Ata / Notas</Label>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={5} placeholder="Registre aqui a ata da reunião..." />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}