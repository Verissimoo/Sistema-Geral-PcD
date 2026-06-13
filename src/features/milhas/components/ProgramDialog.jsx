import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/shared/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import { Plus, Layers, X } from "lucide-react";
import { supabase } from "@/shared/lib/supabase";
import { getMarginPercent } from "@/features/milhas/milesHelper";
import { fmt, MarginBadge } from "./milhasShared";

const emptyForm = {
  program: "",
  cost_per_thousand: "",
  sale_per_thousand: "",
  has_variable_pricing: false,
  variable_tiers: [],
  stock_status: "supplier",
};

export function ProgramDialog({
  open, onOpenChange, editing, user, createProgram, updateProgram, toast,
}) {
  const [form, setForm] = useState(emptyForm);

  // Sincroniza o form ao abrir o dialog (criar vs editar).
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        program: editing.program,
        cost_per_thousand: String(editing.cost_per_thousand),
        sale_per_thousand: String(editing.sale_per_thousand),
        has_variable_pricing: !!editing.has_variable_pricing,
        variable_tiers: editing.variable_tiers ? editing.variable_tiers.map((t) => ({ ...t })) : [],
        stock_status: editing.stock_status || "supplier",
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, editing]);

  const baseMargin =
    (Number(form.sale_per_thousand) || 0) - (Number(form.cost_per_thousand) || 0);

  const handleAddTier = () => {
    setForm((p) => ({
      ...p,
      variable_tiers: [
        ...p.variable_tiers,
        {
          min_miles: 0,
          max_miles: null,
          label: "Nova faixa",
          cost: Number(p.cost_per_thousand) || 0,
          sale: Number(p.sale_per_thousand) || 0,
        },
      ],
    }));
  };
  const handleRemoveTier = (idx) => {
    setForm((p) => ({
      ...p,
      variable_tiers: p.variable_tiers.filter((_, i) => i !== idx),
    }));
  };
  const handleUpdateTier = (idx, field, value) => {
    setForm((p) => {
      const tiers = [...p.variable_tiers];
      tiers[idx] = { ...tiers[idx], [field]: value };
      return { ...p, variable_tiers: tiers };
    });
  };

  const handleSave = async () => {
    if (!form.program.trim()) {
      toast({ title: "Nome do programa é obrigatório", variant: "destructive" });
      return;
    }
    const cost = parseFloat(form.cost_per_thousand);
    const sale = parseFloat(form.sale_per_thousand);
    if (isNaN(cost) || isNaN(sale)) {
      toast({ title: "Custo e venda são obrigatórios", variant: "destructive" });
      return;
    }

    // Ordena tiers por min_miles desc
    const tiers = form.has_variable_pricing
      ? [...form.variable_tiers]
          .map((t) => {
            const tCost = Number(t.cost) || 0;
            const tSaleRaw = t.sale === "" || t.sale === null || t.sale === undefined
              ? null
              : Number(t.sale);
            return {
              min_miles: Number(t.min_miles) || 0,
              max_miles: t.max_miles === "" || t.max_miles === null ? null : Number(t.max_miles),
              label: t.label || `Faixa ${t.min_miles}+`,
              cost: tCost,
              sale: tSaleRaw && tSaleRaw > 0 ? tSaleRaw : null,
            };
          })
          .sort((a, b) => b.min_miles - a.min_miles)
      : [];

    const payload = {
      program: form.program.trim(),
      cost_per_thousand: cost,
      sale_per_thousand: sale,
      has_variable_pricing: !!form.has_variable_pricing,
      variable_tiers: tiers,
      stock_status: form.stock_status || "supplier",
      updated_date: new Date().toISOString(),
    };

    if (editing) {
      // Registra histórico ANTES do update se cost/sale mudaram. Tolerância
      // de 1 centavo evita logar mudanças apenas cosméticas (string vs num).
      const oldCost = Number(editing.cost_per_thousand) || 0;
      const oldSale = Number(editing.sale_per_thousand) || 0;
      const priceChanged =
        Math.abs(cost - oldCost) > 0.01 || Math.abs(sale - oldSale) > 0.01;
      if (priceChanged) {
        const { error: histErr } = await supabase
          .from("pcd_miles_price_history")
          .insert([
            {
              program_id: editing.id,
              program_name: payload.program,
              old_cost_per_thousand: oldCost,
              new_cost_per_thousand: cost,
              old_sale_per_thousand: oldSale,
              new_sale_per_thousand: sale,
              changed_by_id: user?.id || null,
              changed_by_name: user?.name || null,
            },
          ]);
        if (histErr) {
          console.error("Falha ao registrar histórico de preço:", histErr);
          // Não bloqueia o update — só perde a auditoria desta mudança.
        }
      }
      try {
        await updateProgram.mutateAsync({ id: editing.id, updates: payload });
      } catch {
        return; // Erro já notificado pelo toast central do queryClient.
      }
      toast({ title: "Programa atualizado", description: payload.program });
    } else {
      try {
        await createProgram.mutateAsync(payload);
      } catch {
        return; // Erro já notificado pelo toast central do queryClient.
      }
      toast({ title: "Programa criado", description: payload.program });
    }
    onOpenChange(false);
  };

  const previewMarginPct =
    Number(form.cost_per_thousand) > 0
      ? getMarginPercent(Number(form.cost_per_thousand), Number(form.sale_per_thousand))
      : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar programa" : "Novo programa de milhas"}
          </DialogTitle>
          <DialogDescription>
            Configure custo, venda e variabilidade por faixa de milhas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="prog-name">Nome do programa</Label>
            <Input
              id="prog-name"
              value={form.program}
              onChange={(e) => setForm((p) => ({ ...p, program: e.target.value }))}
              placeholder="Ex: LATAM"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Custo por mil (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.cost_per_thousand}
                onChange={(e) =>
                  setForm((p) => ({ ...p, cost_per_thousand: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Venda por mil (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.sale_per_thousand}
                onChange={(e) =>
                  setForm((p) => ({ ...p, sale_per_thousand: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Status de estoque</Label>
            <Select
              value={form.stock_status || "supplier"}
              onValueChange={(v) => setForm((p) => ({ ...p, stock_status: v }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="own">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-success inline-block" />
                    Estoque próprio
                  </span>
                </SelectItem>
                <SelectItem value="supplier">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-warning inline-block" />
                    Fornecedor
                  </span>
                </SelectItem>
                <SelectItem value="unavailable">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-danger inline-block" />
                    Em falta
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          <Card className="bg-muted/40 border-border">
            <CardContent className="p-3 flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Margem:</span>
              <span className="font-bold flex items-center gap-2">
                <MarginBadge pct={previewMarginPct} />
                ({fmt(baseMargin)} por mil)
              </span>
            </CardContent>
          </Card>

          {/* Toggle variabilidade */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
            <div>
              <div className="font-medium text-sm">Preço variável por faixa de milhas</div>
              <div className="text-xs text-muted-foreground">
                Custo do milheiro muda conforme quantidade comprada
              </div>
            </div>
            <Switch
              checked={form.has_variable_pricing}
              onCheckedChange={(v) =>
                setForm((p) => ({
                  ...p,
                  has_variable_pricing: v,
                  variable_tiers: v && p.variable_tiers.length === 0
                    ? [
                        { min_miles: 100000, max_miles: null, label: "100K+ por pax", cost: Number(p.cost_per_thousand) || 0 },
                        { min_miles: 0, max_miles: 99999, label: "Até 99K por pax", cost: Number(p.cost_per_thousand) || 0 },
                      ]
                    : p.variable_tiers,
                }))
              }
            />
          </div>

          {/* Faixas */}
          {form.has_variable_pricing && (
            <Card className="border-border">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" /> Faixas de preço
                </CardTitle>
                <Button size="sm" variant="outline" onClick={handleAddTier} className="gap-1">
                  <Plus className="h-3.5 w-3.5" /> Adicionar faixa
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {form.variable_tiers.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    Adicione faixas para diferenciar custos por quantidade.
                  </div>
                )}
                {form.variable_tiers.map((t, idx) => {
                  const tCost = Number(t.cost) || 0;
                  const hasOwnSale = t.sale != null && t.sale !== "" && Number(t.sale) > 0;
                  const tierSale = hasOwnSale ? Number(t.sale) : tCost + baseMargin;
                  const tierMarginAbs = tierSale - tCost;
                  return (
                    <div
                      key={idx}
                      className="grid grid-cols-1 md:grid-cols-[1fr_1fr_2fr_1fr_1fr_auto] gap-2 items-end p-3 rounded-lg border border-border bg-muted/20"
                    >
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wider">Mín milhas</Label>
                        <Input
                          type="number"
                          value={t.min_miles}
                          onChange={(e) => handleUpdateTier(idx, "min_miles", e.target.value)}
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wider">Máx milhas</Label>
                        <Input
                          type="number"
                          placeholder="(sem limite)"
                          value={t.max_miles ?? ""}
                          onChange={(e) =>
                            handleUpdateTier(idx, "max_miles", e.target.value === "" ? null : e.target.value)
                          }
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wider">Label</Label>
                        <Input
                          value={t.label}
                          onChange={(e) => handleUpdateTier(idx, "label", e.target.value)}
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wider">Custo/mil</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={t.cost}
                          onChange={(e) => handleUpdateTier(idx, "cost", e.target.value)}
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wider">Venda/mil</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={t.sale ?? ""}
                          placeholder="Auto"
                          onChange={(e) => handleUpdateTier(idx, "sale", e.target.value)}
                          className="h-8"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Margem: {tCost && tierSale ? `${fmt(tierMarginAbs)}/mil` : "—"}
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveTier(idx)}
                        className="text-danger hover:text-danger hover:bg-danger/10 self-start mt-5"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>{editing ? "Salvar alterações" : "Criar programa"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
