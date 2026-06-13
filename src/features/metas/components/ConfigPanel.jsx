import { useState } from "react";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import {
  Settings,
  Save,
  Plus,
  Trash2,
  Star,
  CheckCircle,
} from "lucide-react";
import { fmt } from "@/features/metas/lib/goalsFormat";

// ──────────────────────────────────────────────────────────────────────────────
// Painel de configurações do gestor
// ──────────────────────────────────────────────────────────────────────────────
export default function ConfigPanel({ config, onSave }) {
  const [local, setLocal] = useState({ ...config });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave(local);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const setScope = (scope, key, value) => {
    setLocal(prev => ({
      ...prev,
      [scope]: { ...prev[scope], [key]: value }
    }));
  };

  // Bônus especiais
  const addSpecial = () => {
    setLocal((prev) => ({
      ...prev,
      special_bonuses: [
        ...(prev.special_bonuses || []),
        { id: Date.now(), name: "", value: 0, active: true },
      ],
    }));
  };

  const removeSpecial = (id) => {
    setLocal((prev) => ({
      ...prev,
      special_bonuses: prev.special_bonuses.filter((b) => b.id !== id),
    }));
  };

  const updateSpecial = (id, field, value) => {
    setLocal((prev) => ({
      ...prev,
      special_bonuses: prev.special_bonuses.map((b) =>
        b.id === id ? { ...b, [field]: value } : b
      ),
    }));
  };

  const renderScopeConfig = (scope) => {
    const data = local[scope];
    return (
      <div className="space-y-6 pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Meta Mensal (pontos)
            </Label>
            <Input
              type="number"
              min={1}
              value={data.monthly_point_goal}
              onChange={(e) => setScope(scope, "monthly_point_goal", parseInt(e.target.value) || 1)}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Salário abaixo da meta
            </Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
              <Input
                type="number"
                min={0}
                value={data.salary_below_goal}
                onChange={(e) => setScope(scope, "salary_below_goal", parseFloat(e.target.value) || 0)}
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Salário ao atingir a meta
            </Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
              <Input
                type="number"
                min={0}
                value={data.salary_at_goal}
                onChange={(e) => setScope(scope, "salary_at_goal", parseFloat(e.target.value) || 0)}
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Bônus por ponto excedente
            </Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
              <Input
                type="number"
                min={0}
                value={data.bonus_per_extra_point}
                onChange={(e) => setScope(scope, "bonus_per_extra_point", parseFloat(e.target.value) || 0)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-muted/40 border p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Abaixo da meta</span>
            <span className="font-bold text-danger">{fmt(data.salary_below_goal)}</span>
            <span className="text-xs text-muted-foreground">0 – {data.monthly_point_goal - 1} pontos</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Meta atingida</span>
            <span className="font-bold text-accent">{fmt(data.salary_at_goal)}</span>
            <span className="text-xs text-muted-foreground">Exatamente {data.monthly_point_goal} pontos</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Meta superada (+5 pts)</span>
            <span className="font-bold text-success">
              {fmt(data.salary_at_goal + 5 * data.bonus_per_extra_point)}
            </span>
            <span className="text-xs text-muted-foreground">
              {fmt(data.salary_at_goal)} + 5 × {fmt(data.bonus_per_extra_point)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="p-6 border-l-4 border-l-primary">
      <div className="flex items-center gap-2 mb-5">
        <Settings className="h-5 w-5 text-primary" />
        <h2 className="font-semibold text-lg">Configurações de Metas e Bônus</h2>
      </div>

      <Tabs defaultValue="TI/Automações" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="TI/Automações">TI / Automações</TabsTrigger>
          <TabsTrigger value="Educacional/Comercial">Educação / Comercial</TabsTrigger>
          <TabsTrigger value="especiais">Bônus Pontuais</TabsTrigger>
        </TabsList>

        <TabsContent value="TI/Automações">
          {renderScopeConfig("TI/Automações")}
        </TabsContent>

        <TabsContent value="Educacional/Comercial">
          {renderScopeConfig("Educacional/Comercial")}
        </TabsContent>

        <TabsContent value="especiais" className="space-y-4 pt-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-semibold text-sm flex items-center gap-1.5">
                <Star className="h-4 w-4 text-warning" />
                Bônus Especiais Pontuais
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Válidos para todos os contratos neste mês</p>
            </div>
            <Button size="sm" variant="outline" onClick={addSpecial} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Adicionar
            </Button>
          </div>

          {(local.special_bonuses || []).length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2">Nenhum bônus especial configurado.</p>
          ) : (
            <div className="space-y-2">
              {local.special_bonuses.map((b) => (
                <div key={b.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                  <button
                    type="button"
                    onClick={() => updateSpecial(b.id, "active", !b.active)}
                    className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      b.active ? "bg-success border-success/30" : "border-muted-foreground"
                    }`}
                  >
                    {b.active && <CheckCircle className="h-3 w-3 text-white" />}
                  </button>
                  <Input
                    placeholder="Nome do bônus"
                    value={b.name}
                    onChange={(e) => updateSpecial(b.id, "name", e.target.value)}
                    className="flex-1 h-8 text-sm"
                  />
                  <div className="relative w-36 shrink-0">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                    <Input
                      type="number"
                      value={b.value}
                      onChange={(e) => updateSpecial(b.id, "value", parseFloat(e.target.value) || 0)}
                      className="pl-8 h-8 text-sm"
                    />
                  </div>
                  <button onClick={() => removeSpecial(b.id)} className="shrink-0 text-muted-foreground hover:text-danger">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t">
        {saved && (
          <span className="text-xs text-success flex items-center gap-1">
            <CheckCircle className="h-3.5 w-3.5" /> Salvo com sucesso!
          </span>
        )}
        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" /> Salvar Todas as Configurações
        </Button>
      </div>
    </Card>
  );
}
