import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Star, Plus, Pencil, Trash2, Layers, X, AlertTriangle, ChevronDown,
  ChevronUp, TrendingUp, TrendingDown, Award, Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { localClient, seedMilesIfEmpty } from "@/api/localClient";
import { useAuth } from "@/lib/AuthContext";
import {
  getMarginPercent, isOutdated, daysSinceUpdate,
} from "@/lib/milesHelper";

const fmt = (v) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
};

const emptyForm = {
  program: "",
  cost_per_thousand: "",
  sale_per_thousand: "",
  has_variable_pricing: false,
  variable_tiers: [],
};

export default function VendedorMilhas() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadData = useCallback(async () => {
    await seedMilesIfEmpty();
    const list = await localClient.entities.MilesTable.list();
    setData(list || []);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Métricas de resumo
  const summary = useMemo(() => {
    if (data.length === 0) return null;
    const cheapest = [...data].sort((a, b) => a.cost_per_thousand - b.cost_per_thousand)[0];
    const withMargin = data.map((d) => ({
      ...d, marginPct: getMarginPercent(d.cost_per_thousand, d.sale_per_thousand),
    }));
    const highestMargin = [...withMargin].sort((a, b) => b.marginPct - a.marginPct)[0];
    const outdatedCount = data.filter((d) => isOutdated(d.updated_date, 30)).length;
    return { cheapest, highestMargin, outdatedCount };
  }, [data]);

  // Dialog handlers
  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };
  const openEdit = (item) => {
    setEditing(item);
    setForm({
      program: item.program,
      cost_per_thousand: String(item.cost_per_thousand),
      sale_per_thousand: String(item.sale_per_thousand),
      has_variable_pricing: !!item.has_variable_pricing,
      variable_tiers: item.variable_tiers ? item.variable_tiers.map((t) => ({ ...t })) : [],
    });
    setDialogOpen(true);
  };
  const openEditTiers = (item) => {
    openEdit(item);
  };
  const handleDelete = async (id) => {
    if (!confirm("Tem certeza que deseja excluir este programa?")) return;
    await localClient.entities.MilesTable.delete(id);
    toast({ title: "Programa excluído" });
    loadData();
  };

  const baseMargin =
    (Number(form.sale_per_thousand) || 0) - (Number(form.cost_per_thousand) || 0);

  const handleAddTier = () => {
    setForm((p) => ({
      ...p,
      variable_tiers: [
        ...p.variable_tiers,
        { min_miles: 0, max_miles: null, label: "Nova faixa", cost: Number(p.cost_per_thousand) || 0 },
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
          .map((t) => ({
            min_miles: Number(t.min_miles) || 0,
            max_miles: t.max_miles === "" || t.max_miles === null ? null : Number(t.max_miles),
            label: t.label || `Faixa ${t.min_miles}+`,
            cost: Number(t.cost) || 0,
          }))
          .sort((a, b) => b.min_miles - a.min_miles)
      : [];

    const payload = {
      program: form.program.trim(),
      cost_per_thousand: cost,
      sale_per_thousand: sale,
      has_variable_pricing: !!form.has_variable_pricing,
      variable_tiers: tiers,
      updated_date: new Date().toISOString(),
    };

    if (editing) {
      await localClient.entities.MilesTable.update(editing.id, payload);
      toast({ title: "Programa atualizado", description: payload.program });
    } else {
      await localClient.entities.MilesTable.create(payload);
      toast({ title: "Programa criado", description: payload.program });
    }
    setDialogOpen(false);
    loadData();
  };

  const previewMarginPct =
    Number(form.cost_per_thousand) > 0
      ? getMarginPercent(Number(form.cost_per_thousand), Number(form.sale_per_thousand))
      : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-primary/10">
              <Star className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Tabela de Valor de Milhas</h1>
            <Badge variant="outline" className="font-medium">
              {data.length} programa{data.length === 1 ? "" : "s"} ativo{data.length === 1 ? "" : "s"}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm ml-12">
            Preços de custo e venda por programa de milhagem · Atualizado pela gestão
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" /> Adicionar Programa
          </Button>
        )}
      </div>

      {/* Cards de resumo */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="border-emerald-200 bg-emerald-50/40 dark:bg-emerald-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 mb-2">
                <TrendingDown className="h-4 w-4" />
                <span>Programa mais barato</span>
              </div>
              <div className="font-bold text-base">{summary.cheapest.program}</div>
              <div className="text-emerald-700 dark:text-emerald-400 font-semibold mt-1">
                {fmt(summary.cheapest.cost_per_thousand)} / mil
              </div>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50/40 dark:bg-amber-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 mb-2">
                <Award className="h-4 w-4" />
                <span>Maior margem</span>
              </div>
              <div className="font-bold text-base">{summary.highestMargin.program}</div>
              <div className="text-amber-700 dark:text-amber-400 font-semibold mt-1">
                {summary.highestMargin.marginPct}%
              </div>
            </CardContent>
          </Card>
          <Card className={cn(
            "border-border/50",
            summary.outdatedCount > 0 && "border-red-300 bg-red-50/40 dark:bg-red-500/5"
          )}>
            <CardContent className="p-4">
              <div className={cn(
                "flex items-center gap-2 text-xs mb-2",
                summary.outdatedCount > 0
                  ? "text-red-700 dark:text-red-400"
                  : "text-muted-foreground"
              )}>
                <AlertTriangle className="h-4 w-4" />
                <span>Alertas de atualização</span>
              </div>
              <div className="font-bold text-base">
                {summary.outdatedCount} programa{summary.outdatedCount === 1 ? "" : "s"}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Mais de 30 dias sem atualizar
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabela */}
      <Card className="border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <Th>Programa</Th>
                <Th>Custo/mil</Th>
                <Th>Venda/mil</Th>
                <Th>Margem</Th>
                <Th>Variabilidade</Th>
                <Th>Atualização</Th>
                {isAdmin && <Th align="right">Ações</Th>}
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <ProgramRow
                  key={item.id}
                  item={item}
                  isAdmin={isAdmin}
                  expanded={expandedId === item.id}
                  onToggleExpand={() =>
                    setExpandedId(expandedId === item.id ? null : item.id)
                  }
                  onEdit={() => openEdit(item)}
                  onEditTiers={() => openEditTiers(item)}
                  onDelete={() => handleDelete(item.id)}
                />
              ))}
              {data.length === 0 && (
                <tr>
                  <td
                    colSpan={isAdmin ? 7 : 6}
                    className="px-6 py-12 text-center text-sm text-muted-foreground"
                  >
                    Nenhum programa cadastrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
                    const tierSale = Number(t.cost || 0) + baseMargin;
                    return (
                      <div
                        key={idx}
                        className="grid grid-cols-1 md:grid-cols-[1fr_1fr_2fr_1fr_1fr_auto] gap-2 items-center p-3 rounded-lg border border-border bg-muted/20"
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
                          <div className="h-8 flex items-center text-sm font-medium">
                            {fmt(tierSale)}
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemoveTier(idx)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
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
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>{editing ? "Salvar alterações" : "Criar programa"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Subcomponentes ────────────────────────────────────────────────

function Th({ children, align = "left" }) {
  return (
    <th
      className={cn(
        "text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3",
        align === "right" ? "text-right" : "text-left"
      )}
    >
      {children}
    </th>
  );
}

function MarginBadge({ pct }) {
  const cls = pct >= 20
    ? "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
    : pct >= 10
    ? "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100"
    : "bg-red-100 text-red-700 border-red-200 hover:bg-red-100";
  return (
    <Badge className={cn("border font-bold", cls)}>
      {pct}%
    </Badge>
  );
}

function UpdateBadge({ updatedDate }) {
  const days = daysSinceUpdate(updatedDate);
  if (days === null) return <Badge variant="outline">—</Badge>;
  if (days > 30) {
    return (
      <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 gap-1 animate-pulse">
        <AlertTriangle className="h-3 w-3" /> Desatualizado
      </Badge>
    );
  }
  if (days > 14) {
    return (
      <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 gap-1">
        <Clock className="h-3 w-3" /> Revisar em breve
      </Badge>
    );
  }
  return (
    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
      Atualizado
    </Badge>
  );
}

function ProgramRow({ item, isAdmin, expanded, onToggleExpand, onEdit, onEditTiers, onDelete }) {
  const marginPct = getMarginPercent(item.cost_per_thousand, item.sale_per_thousand);
  const marginAbs = (item.sale_per_thousand || 0) - (item.cost_per_thousand || 0);
  const days = daysSinceUpdate(item.updated_date);

  return (
    <>
      <tr className="border-b border-border/50 hover:bg-muted/20 transition-colors">
        <td className="px-6 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{item.program}</span>
            {item.has_variable_pricing && (
              <Badge className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100 text-[10px] gap-1 border">
                <Layers className="h-3 w-3" /> Preço variável
              </Badge>
            )}
          </div>
        </td>
        <td className="px-6 py-3">
          <div className="text-sm font-medium">{fmt(item.cost_per_thousand)}</div>
          {item.has_variable_pricing && (
            <div className="text-[10px] text-muted-foreground">(faixa base)</div>
          )}
        </td>
        <td className="px-6 py-3">
          <span className="text-sm font-bold text-primary">{fmt(item.sale_per_thousand)}</span>
        </td>
        <td className="px-6 py-3">
          <div className="space-y-0.5">
            <MarginBadge pct={marginPct} />
            <div className="text-[10px] text-muted-foreground">{fmt(marginAbs)} / mil</div>
          </div>
        </td>
        <td className="px-6 py-3">
          {item.has_variable_pricing ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={onToggleExpand}
              className="h-7 gap-1.5 text-xs"
            >
              <Layers className="h-3 w-3" />
              Ver faixas
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">Preço fixo</span>
          )}
        </td>
        <td className="px-6 py-3">
          <div className="space-y-0.5">
            <div className="text-sm font-medium">{fmtDate(item.updated_date)}</div>
            <div className="text-[10px] text-muted-foreground">
              {days !== null ? `há ${days} dias` : "—"}
            </div>
            <div className="mt-1">
              <UpdateBadge updatedDate={item.updated_date} />
            </div>
          </div>
        </td>
        {isAdmin && (
          <td className="px-6 py-3">
            <div className="flex items-center justify-end gap-1">
              {item.has_variable_pricing && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-purple-600"
                  onClick={onEditTiers}
                  title="Editar faixas"
                >
                  <Layers className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-primary"
                onClick={onEdit}
                title="Editar"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-red-500"
                onClick={onDelete}
                title="Excluir"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </td>
        )}
      </tr>

      {/* Expand: tabela de faixas */}
      {expanded && item.has_variable_pricing && (
        <tr>
          <td colSpan={isAdmin ? 7 : 6} className="bg-muted/20 px-6 py-4 border-b border-border">
            <div className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-3 flex items-center gap-2">
              <Layers className="h-3.5 w-3.5" /> Faixas de preço — {item.program}
            </div>
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left text-[10px] font-bold uppercase tracking-widest px-4 py-2">Faixa</th>
                    <th className="text-left text-[10px] font-bold uppercase tracking-widest px-4 py-2">Custo/mil</th>
                    <th className="text-left text-[10px] font-bold uppercase tracking-widest px-4 py-2">Venda/mil</th>
                    <th className="text-left text-[10px] font-bold uppercase tracking-widest px-4 py-2">Margem</th>
                  </tr>
                </thead>
                <tbody>
                  {item.variable_tiers.map((t, idx) => {
                    const baseM = (item.sale_per_thousand || 0) - (item.cost_per_thousand || 0);
                    const tierSale = Number(t.cost) + baseM;
                    const tierMarginPct = getMarginPercent(t.cost, tierSale);
                    return (
                      <tr key={idx} className="border-b border-border/50 last:border-0">
                        <td className="px-4 py-2 font-medium">{t.label}</td>
                        <td className="px-4 py-2">{fmt(t.cost)}</td>
                        <td className="px-4 py-2 font-semibold text-primary">{fmt(tierSale)}</td>
                        <td className="px-4 py-2"><MarginBadge pct={tierMarginPct} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
