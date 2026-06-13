import { useState, useMemo } from "react";
import { User, UserPlus, Search, Check, Handshake } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/shared/ui/select";
import { useToast } from "@/shared/ui/use-toast";
import { cn } from "@/shared/lib/utils";
import { useClients, usePartners, useCreateClient } from "@/api/hooks";
import { useAuth } from "@/features/auth/AuthContext";
import { useClientOrigins } from "@/features/clientes/useClientOrigins";

// ─── Bloco 1 — Cliente ou Parceiro ──────────────────────────────────
export default function BlocoCliente({ formData, setFormData }) {
  const [mode, setMode] = useState(formData.client?.id ? "select" : "select");
  const [search, setSearch] = useState("");
  const { data: allClients = [] } = useClients();
  const { data: partners = [] } = usePartners();
  const createClientMutation = useCreateClient();
  const [newClient, setNewClient] = useState({ name: "", phone: "", lead_origin: "" });
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const clientOrigins = useClientOrigins();

  // Vendedor enxerga apenas os próprios clientes; admin vê todos.
  const clients = useMemo(
    () => (isAdmin ? allClients : allClients.filter((c) => c.created_by === user?.id)),
    [allClients, isAdmin, user?.id]
  );

  const filtered = useMemo(
    () => clients.filter((c) => c.name?.toLowerCase().includes(search.toLowerCase())),
    [clients, search]
  );

  const selectClient = (c) => {
    setFormData((p) => ({ ...p, client: c }));
  };

  const saveNewClient = async () => {
    if (!newClient.name.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    let created;
    try {
      created = await createClientMutation.mutateAsync({
        name: newClient.name.trim(),
        phone: newClient.phone,
        lead_origin: newClient.lead_origin || "Outro",
        created_by: user?.id || null,
        created_by_name: user?.name || null,
      });
    } catch {
      return; // Erro já notificado pelo toast central do queryClient.
    }
    setFormData((p) => ({ ...p, client: created }));
    setNewClient({ name: "", phone: "", lead_origin: "" });
    setMode("select");
    toast({ title: "Cliente cadastrado", description: created.name });
  };

  const recipientType = formData.recipient_type || "cliente";

  return (
    <div className="space-y-4">
      {/* Toggle: Cliente Final vs Parceiro */}
      <div>
        <Label className="text-sm font-semibold mb-2 block">Para quem é este orçamento?</Label>
        <Tabs
          value={recipientType}
          onValueChange={(v) =>
            setFormData((p) => ({
              ...p,
              recipient_type: v,
              client: v === "cliente" ? p.client : null,
              partner_id: v === "parceiro" ? p.partner_id : null,
              partner_name: v === "parceiro" ? p.partner_name : null,
            }))
          }
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cliente" className="gap-2">
              <User className="w-4 h-4" /> Cliente Final
            </TabsTrigger>
            <TabsTrigger value="parceiro" className="gap-2">
              <Handshake className="w-4 h-4" /> Parceiro
            </TabsTrigger>
          </TabsList>

          <TabsContent value="parceiro" className="mt-4 space-y-3">
            <Label>Selecionar parceiro</Label>
            <Select
              value={formData.partner_id || ""}
              onValueChange={(v) => {
                const partner = partners.find((p) => p.id === v);
                setFormData((prev) => ({
                  ...prev,
                  partner_id: v,
                  partner_name: partner?.name || null,
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={partners.length === 0 ? "Sem parceiros cadastrados" : "Escolha um parceiro"} />
              </SelectTrigger>
              <SelectContent>
                {partners.filter((p) => p.status === "Ativo").map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}{p.company ? ` · ${p.company}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {formData.partner_id && (
              <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg text-sm text-warning">
                <strong>ℹ️ Modo Parceiro:</strong> você define livremente o valor a cobrar da parceira. O Nipon aparece apenas como sugestão.
              </div>
            )}
          </TabsContent>

          <TabsContent value="cliente" className="mt-4">

      <Tabs value={mode} onValueChange={setMode}>
        <TabsList>
          <TabsTrigger value="select" className="gap-2">
            <User className="h-3.5 w-3.5" /> Selecionar existente
          </TabsTrigger>
          <TabsTrigger value="new" className="gap-2">
            <UserPlus className="h-3.5 w-3.5" /> Cadastrar novo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="select" className="space-y-3 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {filtered.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {clients.length === 0
                  ? "Nenhum cliente cadastrado ainda. Vá em \"Cadastrar novo\"."
                  : "Nenhum cliente encontrado."}
              </div>
            )}
            {filtered.map((c) => {
              const isSelected = formData.client?.id === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectClient(c)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-all",
                    isSelected
                      ? "border-warning/30 bg-warning/10 dark:bg-warning/10 ring-1 ring-warning/40"
                      : "border-border hover:border-primary/40 hover:bg-muted/40"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{c.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {c.phone || "Sem telefone"} · {c.lead_origin || "—"}
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-warning" />}
                  </div>
                </button>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="new" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="cli-name">Nome completo *</Label>
            <Input
              id="cli-name"
              value={newClient.name}
              onChange={(e) => setNewClient((p) => ({ ...p, name: e.target.value }))}
              placeholder="Ex: João da Silva"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cli-phone">Telefone</Label>
            <Input
              id="cli-phone"
              value={newClient.phone}
              onChange={(e) => setNewClient((p) => ({ ...p, phone: e.target.value }))}
              placeholder="(61) 99999-9999"
            />
          </div>
          <div className="space-y-2">
            <Label>Origem do Lead</Label>
            <Select
              value={newClient.lead_origin}
              onValueChange={(v) => setNewClient((p) => ({ ...p, lead_origin: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {clientOrigins.map((o) => (
                  <SelectItem key={o.id} value={o.label}>
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: o.color || "#94A3B8" }}
                      />
                      {o.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={saveNewClient} className="w-full">
            <UserPlus className="h-4 w-4 mr-2" /> Salvar cliente
          </Button>
        </TabsContent>
      </Tabs>

      {formData.client && (
        <div className="p-3 rounded-lg bg-success/10 border border-success/30 flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-success" />
          <span><strong>{formData.client.name}</strong> selecionado</span>
        </div>
      )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
