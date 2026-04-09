import { useState, useEffect } from "react";
import { localClient } from "@/api/localClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { calculateScore } from "@/lib/scoring";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const emptyProject = {
  name: "", impacted_area: "", value_type: "Financeiro direto", scope_summary: "",
  deadline: "", validation_responsible: "", success_criteria: "", status: "Backlog",
  contractor_id: "", contractor_name: "", scope_type: "TI/Automações",
  complexity: "Médio", business_impact: "Médio", documentation_level: "Sem documentação",
  deadline_status: "No prazo", edu_delivery_type: "Documento simples",
  estimated_score: 0, final_score: 0, documentation_link: "", documentation_file: "",
  acceptance_tested: false, acceptance_validated: false, acceptance_documented: false,
  acceptance_monitored: false, change_log: [],
};

export default function ProjectFormDialog({ open, onClose, onSave, project }) {
  const [form, setForm] = useState(project || emptyProject);
  const [contractors, setContractors] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    localClient.entities.Contractor.list().then(setContractors);
  }, []);

  useEffect(() => {
    if (project) setForm(project);
    else setForm(emptyProject);
  }, [project]);

  const set = (key, value) => {
    setForm(prev => {
      const updated = { ...prev, [key]: value };
      if (key === "contractor_id") {
        const c = contractors.find(x => x.id === value);
        if (c) {
          updated.contractor_name = c.name;
          updated.scope_type = c.scope_type;
        }
      }
      updated.estimated_score = calculateScore(updated);
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = { ...form, estimated_score: calculateScore(form) };
    
    if (project?.id) {
      const changeEntry = {
        date: new Date().toISOString(),
        description: "Projeto atualizado",
        changed_by: "sistema",
      };
      data.change_log = [...(data.change_log || []), changeEntry];
      if (data.status === "Concluído") {
        data.final_score = calculateScore(data);
      }
      await localClient.entities.Project.update(project.id, data);
    } else {
      await localClient.entities.Project.create(data);
    }
    setSaving(false);
    onSave();
    onClose();
  };

  const isIT = form.scope_type === "TI/Automações";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project ? "Editar Projeto" : "Novo Projeto"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="info">Informações</TabsTrigger>
              <TabsTrigger value="scoring">Pontuação</TabsTrigger>
              <TabsTrigger value="acceptance">Aceite</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4 mt-4">
              <div>
                <Label>Nome do Projeto</Label>
                <Input required value={form.name} onChange={e => set("name", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Prestador Responsável</Label>
                  <Select value={form.contractor_id} onValueChange={v => set("contractor_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {contractors.filter(c => c.status === "Ativo").map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Área Impactada</Label>
                  <Input required value={form.impacted_area} onChange={e => set("impacted_area", e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Tipo de Valor Gerado</Label>
                <Select value={form.value_type} onValueChange={v => set("value_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Financeiro direto">Financeiro direto</SelectItem>
                    <SelectItem value="Tempo/Produtividade">Tempo/Produtividade</SelectItem>
                    <SelectItem value="Experiência do cliente">Experiência do cliente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Escopo Resumido</Label>
                <Textarea required value={form.scope_summary} onChange={e => set("scope_summary", e.target.value)} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Prazo Previsto</Label>
                  <Input type="date" required value={form.deadline} onChange={e => set("deadline", e.target.value)} />
                </div>
                <div>
                  <Label>Responsável pela Validação</Label>
                  <Input required value={form.validation_responsible} onChange={e => set("validation_responsible", e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Critério de Sucesso</Label>
                <Textarea required value={form.success_criteria} onChange={e => set("success_criteria", e.target.value)} rows={2} />
              </div>
              <div>
                <Label>Link de Documentação</Label>
                <Input value={form.documentation_link} onChange={e => set("documentation_link", e.target.value)} placeholder="https://..." />
              </div>
            </TabsContent>

            <TabsContent value="scoring" className="space-y-4 mt-4">
              {isIT ? (
                <>
                  <div>
                    <Label>Complexidade Técnica</Label>
                    <Select value={form.complexity} onValueChange={v => set("complexity", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Baixo", "Médio", "Alto", "Muito alto"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Impacto no Negócio</Label>
                    <Select value={form.business_impact} onValueChange={v => set("business_impact", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Baixo", "Médio", "Alto", "Muito alto"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Documentação/Autonomia</Label>
                    <Select value={form.documentation_level} onValueChange={v => set("documentation_level", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Sem documentação", "Parcial", "Completo"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status do Prazo</Label>
                    <Select value={form.deadline_status} onValueChange={v => set("deadline_status", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Atrasado", "No prazo", "Antecipado"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <div>
                  <Label>Tipo de Entrega Educacional</Label>
                  <Select value={form.edu_delivery_type} onValueChange={v => set("edu_delivery_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Documento simples", "Documento completo com passo a passo", "Aula gravada ou live estruturada", "Módulo de treinamento completo", "Trilha de onboarding estruturada"].map(v => (
                        <SelectItem key={v} value={v}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Pontuação Estimada</p>
                <p className="text-3xl font-bold text-secondary">{form.estimated_score || calculateScore(form)} pontos</p>
              </div>
            </TabsContent>

            <TabsContent value="acceptance" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">Todos os critérios devem ser marcados para que o projeto seja considerado concluído para fins de pontuação.</p>
              {[
                { key: "acceptance_tested", label: "Funcionalidade testada" },
                { key: "acceptance_validated", label: "Validação do responsável" },
                { key: "acceptance_documented", label: "Documentação entregue" },
                { key: "acceptance_monitored", label: "Monitoramento inicial realizado" },
              ].map(item => (
                <div key={item.key} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Checkbox
                    checked={form[item.key]}
                    onCheckedChange={v => set(item.key, v)}
                  />
                  <span className="text-sm">{item.label}</span>
                </div>
              ))}

              {form.change_log?.length > 0 && (
                <div className="mt-4">
                  <Label>Histórico de Alterações</Label>
                  <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto">
                    {form.change_log.map((log, i) => (
                      <div key={i} className="text-xs p-2 bg-muted/50 rounded">
                        <span className="text-muted-foreground">{new Date(log.date).toLocaleString("pt-BR")}:</span>{" "}
                        {log.description}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}