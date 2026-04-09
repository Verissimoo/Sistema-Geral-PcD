import { useState } from "react";
import { localClient } from "@/api/localClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ContractorFormDialog({ open, onClose, onSave, contractor }) {
  const [form, setForm] = useState(contractor || {
    name: "",
    scope_type: "TI/Automações",
    monthly_fixed_value: 0,
    contract_start_date: new Date().toISOString().split("T")[0],
    status: "Ativo",
    monthly_point_goal: 10,
    bonus_tier1_value: 0,
    bonus_tier2_value: 0,
    bonus_additional_value: 0,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    if (contractor?.id) {
      await localClient.entities.Contractor.update(contractor.id, form);
    } else {
      await localClient.entities.Contractor.create(form);
    }
    setSaving(false);
    onSave();
    onClose();
  };

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
          <div>
            <Label>Meta Mínima de Pontos do Período</Label>
            <Input type="number" value={form.monthly_point_goal} onChange={e => set("monthly_point_goal", parseInt(e.target.value) || 0)} />
          </div>
          <div className="rounded-lg border border-dashed p-4 space-y-3 bg-muted/30">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Estrutura de Remuneração Variável</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Desconto máx. por baixo desempenho (R$)</Label>
                <Input type="number" value={form.bonus_tier1_value} onChange={e => set("bonus_tier1_value", parseFloat(e.target.value) || 0)} />
                <p className="text-xs text-muted-foreground mt-1">Redução no fixo se meta não for atingida</p>
              </div>
              <div>
                <Label className="text-xs">Bônus máx. por meta atingida (R$)</Label>
                <Input type="number" value={form.bonus_tier2_value} onChange={e => set("bonus_tier2_value", parseFloat(e.target.value) || 0)} />
                <p className="text-xs text-muted-foreground mt-1">Acréscimo no fixo ao atingir meta bônus</p>
              </div>
            </div>
            <div>
              <Label className="text-xs">Bônus por automação ativa (R$)</Label>
              <Input type="number" value={form.bonus_additional_value} onChange={e => set("bonus_additional_value", parseFloat(e.target.value) || 0)} />
              <p className="text-xs text-muted-foreground mt-1">Valor adicional por automação/entrega em produção ativa</p>
            </div>
            {(form.monthly_fixed_value > 0) && (
              <div className="rounded-md bg-secondary/10 border border-secondary/30 p-3 text-xs space-y-1">
                <p className="font-semibold text-secondary-foreground">Faixa de remuneração estimada:</p>
                <p className="text-muted-foreground">
                  Mínimo: <span className="font-medium text-foreground">R$ {(form.monthly_fixed_value - (form.bonus_tier1_value || 0)).toLocaleString("pt-BR")}</span>
                  {" · "}
                  Base: <span className="font-medium text-foreground">R$ {(form.monthly_fixed_value).toLocaleString("pt-BR")}</span>
                  {" · "}
                  Máximo fixo: <span className="font-medium text-foreground">R$ {(form.monthly_fixed_value + (form.bonus_tier2_value || 0)).toLocaleString("pt-BR")}</span>
                  {form.bonus_additional_value > 0 && <span className="text-secondary font-medium"> + R$ {form.bonus_additional_value?.toLocaleString("pt-BR")}/automação</span>}
                </p>
              </div>
            )}
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