import { useState } from "react";
import { useCreateContractor, useUpdateContractor } from "@/api/hooks";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

export default function ContractorFormDialog({ open, onClose, contractor }) {
  const [form, setForm] = useState(contractor || {
    name: "",
    scope_type: "TI/Automações",
    monthly_fixed_value: 0,
    contract_start_date: new Date().toISOString().split("T")[0],
    status: "Ativo",
  });
  const [saving, setSaving] = useState(false);
  const createContractor = useCreateContractor();
  const updateContractor = useUpdateContractor();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (contractor?.id) {
        await updateContractor.mutateAsync({ id: contractor.id, updates: form });
      } else {
        await createContractor.mutateAsync(form);
      }
      // Invalidação automática pós-mutation recarrega as listas
      onClose();
    } catch (error) {
      // Toast central de erro já notifica o usuário; mantém o dialog aberto
      console.error('Erro ao salvar prestador:', error);
    } finally {
      setSaving(false);
    }
  };

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{contractor ? "Editar Prestador" : "Novo Prestador PJ"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome do Prestador</Label>
            <Input required value={form.name} onChange={e => set("name", e.target.value)} />
          </div>
          <div>
            <Label>Tipo de Escopo</Label>
            <Select value={form.scope_type} onValueChange={v => set("scope_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TI/Automações">TI/Automações</SelectItem>
                <SelectItem value="Educacional/Comercial">Educacional/Comercial</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground mt-1">As regras de metas e bônus seguem o padrão global do escopo selecionado.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor Fixo Mensal (R$)</Label>
              <Input type="number" required value={form.monthly_fixed_value} onChange={e => set("monthly_fixed_value", parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Data de Início</Label>
              <Input type="date" required value={form.contract_start_date} onChange={e => set("contract_start_date", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Ativo">Ativo</SelectItem>
                <SelectItem value="Em revisão">Em revisão</SelectItem>
                <SelectItem value="Encerrado">Encerrado</SelectItem>
              </SelectContent>
            </Select>
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