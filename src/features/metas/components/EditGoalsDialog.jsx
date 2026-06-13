import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Plus, Trash2, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/shared/ui/dialog";
import {
  useCreateGoal, useUpdateGoal, useDeleteGoal,
} from "@/api/hooks";
import { qk } from "@/api/queryKeys";
import { seedCommercialGoals } from "@/api/seeds";
import {
  STATUS_BADGE, incrementMonth, monthLabelFromYM,
} from "@/features/metas/lib/metasUtils";

// ─── Dialog de edição ────────────────────────────────────────────────
export default function EditGoalsDialog({ open, onClose, goals, toast }) {
  const queryClient = useQueryClient();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const [drafts, setDrafts] = useState([]);

  useEffect(() => {
    if (open) {
      setDrafts(goals.map((g) => ({ ...g })));
    }
  }, [open, goals]);

  const updateField = (idx, field, value) => {
    setDrafts((p) => {
      const next = [...p];
      next[idx] = { ...next[idx], [field]: value };
      // Recalcula derivados quando o usuário muda a meta mensal
      if (field === "monthly_target") {
        const monthly = parseFloat(value) || 0;
        next[idx] = {
          ...next[idx],
          monthly_target: value,
          weekly_target: monthly > 0 ? Math.round(monthly / 4) : 0,
          ticket_2500_sales: monthly > 0 ? Math.ceil(monthly / 2500) : 0,
          ticket_3000_sales: monthly > 0 ? Math.ceil(monthly / 3000) : 0,
        };
      }
      return next;
    });
  };

  const addMonth = () => {
    const last = drafts[drafts.length - 1];
    const newMonth = last
      ? incrementMonth(last.month)
      : new Date().toISOString().slice(0, 7);
    setDrafts((p) => [
      ...p,
      {
        id: crypto.randomUUID(),
        month: newMonth,
        month_label: monthLabelFromYM(newMonth),
        monthly_target: 0,
        weekly_target: 0,
        ticket_2500_sales: 0,
        ticket_3000_sales: 0,
        objective: "",
        advance_condition: "",
        advance_next_step: "",
        status: "Futura",
        actual_revenue: 0,
        created_date: new Date().toISOString(),
      },
    ]);
  };

  const removeRow = (idx) => {
    setDrafts((p) => p.filter((_, i) => i !== idx));
  };

  const completeMonth = (idx) => {
    setDrafts((p) => {
      const next = [...p];
      next[idx] = { ...next[idx], status: "Concluída" };
      // Ativa o próximo
      if (next[idx + 1] && next[idx + 1].status === "Futura") {
        next[idx + 1] = { ...next[idx + 1], status: "Ativa" };
      }
      return next;
    });
  };

  const handleSaveAll = async () => {
    // Persiste: atualiza existentes, cria novos, deleta removidos
    const existingIds = new Set(goals.map((g) => g.id));
    const draftIds = new Set(drafts.map((g) => g.id));

    // Deleta removidos
    const deletes = goals
      .filter((g) => !draftIds.has(g.id))
      .map((g) => deleteGoal.mutateAsync(g.id));

    // Atualiza/cria
    const upserts = drafts.map((d) => {
      const payload = {
        month: d.month,
        month_label: d.month_label,
        monthly_target: Number(d.monthly_target) || 0,
        weekly_target: Number(d.weekly_target) || 0,
        ticket_2500_sales: Number(d.ticket_2500_sales) || 0,
        ticket_3000_sales: Number(d.ticket_3000_sales) || 0,
        objective: d.objective || null,
        advance_condition: d.advance_condition || null,
        advance_next_step: d.advance_next_step || null,
        official_target:
          d.official_target === "" || d.official_target == null
            ? null
            : Number(d.official_target),
        status: d.status || "Futura",
      };
      if (existingIds.has(d.id)) {
        return updateGoal.mutateAsync({ id: d.id, updates: payload });
      }
      return createGoal.mutateAsync(payload);
    });

    try {
      await Promise.all([...deletes, ...upserts]);
    } catch {
      // Toast de erro central já exibido pelo queryClient
      return;
    }

    toast({ title: "Escada atualizada" });
    onClose();
  };

  const handleReset = async () => {
    if (!confirm("Resetar todas as metas? Isso apaga as metas atuais e re-aplica o seed.")) return;
    try {
      await Promise.all(goals.map((g) => deleteGoal.mutateAsync(g.id)));
    } catch {
      return;
    }
    await seedCommercialGoals();
    // O seed grava direto no Supabase (fora das mutations) — invalida o cache.
    queryClient.invalidateQueries({ queryKey: qk.goals.all });
    toast({ title: "Metas resetadas para o padrão" });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar escada de metas</DialogTitle>
          <DialogDescription>
            Ajuste valores, adicione meses ou conclua o mês atual para ativar o próximo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {drafts.map((d, idx) => (
            <Card key={d.id} className="border-border/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Input
                      className="w-32 h-8"
                      placeholder="2026-06"
                      value={d.month}
                      onChange={(e) => updateField(idx, "month", e.target.value)}
                    />
                    <Input
                      className="w-32 h-8"
                      placeholder="Junho"
                      value={d.month_label}
                      onChange={(e) => updateField(idx, "month_label", e.target.value)}
                    />
                    <Badge className={STATUS_BADGE[d.status]}>{d.status}</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    {d.status === "Ativa" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => completeMonth(idx)}
                        className="gap-1.5"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Concluir mês
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeRow(idx)}
                      className="text-danger hover:text-danger hover:bg-danger/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <FormField label="Meta mensal (R$)">
                    <Input
                      type="number"
                      value={d.monthly_target}
                      onChange={(e) => updateField(idx, "monthly_target", e.target.value)}
                    />
                  </FormField>
                  <FormField label="Meta semanal (R$) · auto">
                    <Input
                      type="number"
                      value={d.weekly_target}
                      onChange={(e) => updateField(idx, "weekly_target", e.target.value)}
                      className="bg-muted/40"
                    />
                  </FormField>
                  <FormField label="Vendas ticket R$2.500 · auto">
                    <Input
                      type="number"
                      value={d.ticket_2500_sales}
                      onChange={(e) => updateField(idx, "ticket_2500_sales", e.target.value)}
                      className="bg-muted/40"
                    />
                  </FormField>
                  <FormField label="Vendas ticket R$3.000 · auto">
                    <Input
                      type="number"
                      value={d.ticket_3000_sales}
                      onChange={(e) => updateField(idx, "ticket_3000_sales", e.target.value)}
                      className="bg-muted/40"
                    />
                  </FormField>
                </div>

                <FormField label="Objetivo do mês">
                  <Textarea
                    rows={2}
                    value={d.objective}
                    onChange={(e) => updateField(idx, "objective", e.target.value)}
                  />
                </FormField>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField label="Condição de avanço">
                    <Input
                      value={d.advance_condition}
                      onChange={(e) => updateField(idx, "advance_condition", e.target.value)}
                    />
                  </FormField>
                  <FormField label="Próximo passo">
                    <Input
                      value={d.advance_next_step}
                      onChange={(e) => updateField(idx, "advance_next_step", e.target.value)}
                    />
                  </FormField>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button onClick={addMonth} variant="outline" className="w-full gap-2">
            <Plus className="h-4 w-4" /> Adicionar mês
          </Button>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button onClick={handleReset} variant="outline" className="text-danger gap-2">
            <RotateCcw className="h-4 w-4" /> Resetar metas
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSaveAll}>Salvar tudo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FormField({ label, children }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-widest font-semibold">
        {label}
      </Label>
      {children}
    </div>
  );
}
