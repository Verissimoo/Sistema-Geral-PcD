import { useState, useEffect, useMemo } from "react";
import {
  Handshake, UserPlus, Pencil, ShieldCheck, ShieldOff,
  AlertCircle, Eye, EyeOff, Building2, Phone, Mail,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { localClient } from "@/api/localClient";

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
};

const emptyForm = {
  name: "",
  username: "",
  password: "",
  confirm: "",
  phone: "",
  email: "",
  company: "",
  status: "Ativo",
};

export default function GerenteParceiros() {
  const { toast } = useToast();
  const [partners, setPartners] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [showPwd, setShowPwd] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    const list = await localClient.entities.Partners.list();
    setPartners(list || []);
  };
  useEffect(() => { reload(); }, []);

  const metrics = useMemo(() => {
    const total = partners.length;
    const ativos = partners.filter((p) => p.status === "Ativo").length;
    const inativos = partners.filter((p) => p.status === "Inativo").length;
    return { total, ativos, inativos };
  }, [partners]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setShowPwd(false);
    setDialogOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name || "",
      username: p.username || "",
      password: "",
      confirm: "",
      phone: p.phone || "",
      email: p.email || "",
      company: p.company || "",
      status: p.status || "Ativo",
    });
    setFormError("");
    setShowPwd(false);
    setDialogOpen(true);
  };

  const validate = () => {
    if (!form.name.trim()) return "Nome é obrigatório";
    const username = form.username.trim().toLowerCase();
    if (!username) return "Nome de usuário é obrigatório";
    if (/\s/.test(username)) return "Nome de usuário não pode conter espaços";
    const conflict = partners.find(
      (p) => p.username === username && (!editing || p.id !== editing.id)
    );
    if (conflict) return "Já existe um parceiro com esse username";
    if (!editing && !form.password) return "Senha é obrigatória ao criar";
    if (form.password && form.password !== form.confirm) return "Senhas não conferem";
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      setFormError(err);
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      const username = form.username.trim().toLowerCase();
      if (editing) {
        const updates = {
          name: form.name.trim(),
          username,
          phone: form.phone.trim(),
          email: form.email.trim(),
          company: form.company.trim(),
          status: form.status,
        };
        if (form.password) updates.password = form.password;
        const updated = await localClient.entities.Partners.update(editing.id, updates);
        if (!updated) {
          setFormError("Erro ao atualizar parceiro. Tente novamente.");
          setSaving(false);
          return;
        }
        toast({ title: "Parceiro atualizado", description: form.name });
      } else {
        const created = await localClient.entities.Partners.create({
          name: form.name.trim(),
          username,
          password: form.password,
          phone: form.phone.trim(),
          email: form.email.trim(),
          company: form.company.trim(),
          status: form.status || "Ativo",
        });
        if (!created) {
          setFormError("Erro ao criar parceiro. Tente novamente.");
          setSaving(false);
          return;
        }
        toast({
          title: "Parceiro criado",
          description: `Acesso "${created.username}" salvo. Já pode entrar no portal.`,
        });
      }
      setDialogOpen(false);
      await reload();
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (p) => {
    const next = p.status === "Ativo" ? "Inativo" : "Ativo";
    if (next === "Inativo" && !confirm(`Desativar ${p.name}?`)) return;
    const updated = await localClient.entities.Partners.update(p.id, { status: next });
    if (!updated) {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
      return;
    }
    toast({ title: `Parceiro ${next.toLowerCase()}`, description: p.name });
    await reload();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-primary/10">
              <Handshake className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Gestão de Parceiros</h1>
          </div>
          <p className="text-muted-foreground text-sm ml-12">
            Cadastre e gerencie parceiros que receberão orçamentos do sistema
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <UserPlus className="h-4 w-4" /> Novo Parceiro
        </Button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SummaryCard icon={<Handshake className="h-4 w-4" />} label="Total de parceiros" value={metrics.total} />
        <SummaryCard
          icon={<ShieldCheck className="h-4 w-4 text-emerald-600" />}
          label="Parceiros ativos"
          value={metrics.ativos}
        />
        <SummaryCard
          icon={<ShieldOff className="h-4 w-4 text-red-600" />}
          label="Inativos"
          value={metrics.inativos}
        />
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {partners.map((p) => (
          <Card key={p.id} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-4 flex-wrap">
              <div className="h-11 w-11 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm shrink-0">
                {initials(p.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{p.name}</span>
                  {p.company && (
                    <Badge variant="secondary" className="gap-1">
                      <Building2 className="h-3 w-3" /> {p.company}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
                  <span>@{p.username}</span>
                  {p.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {p.phone}</span>}
                  {p.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {p.email}</span>}
                  <span>· criado em {fmtDate(p.created_date)}</span>
                </div>
              </div>
              <Badge
                className={cn(
                  "border",
                  p.status === "Ativo"
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                    : "bg-red-100 text-red-700 border-red-200 hover:bg-red-100"
                )}
              >
                {p.status}
              </Badge>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => openEdit(p)}
                  className="gap-1.5"
                >
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toggleStatus(p)}
                  className={cn(
                    "gap-1.5",
                    p.status === "Ativo" ? "text-red-600 hover:text-red-700" : "text-emerald-600 hover:text-emerald-700"
                  )}
                >
                  {p.status === "Ativo" ? <ShieldOff className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                  {p.status === "Ativo" ? "Desativar" : "Ativar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {partners.length === 0 && (
          <Card className="border-border/50">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Nenhum parceiro cadastrado ainda.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog criar/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar parceiro" : "Novo parceiro"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Atualize os dados do parceiro. Deixe a senha em branco para manter a atual."
                : "Crie um novo acesso para um parceiro receber orçamentos."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Nome completo</Label>
              <Input
                id="p-name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ex: José da Silva"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-company">Empresa <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Input
                id="p-company"
                value={form.company}
                onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
                placeholder="Ex: Agência Lume"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-username">Nome de usuário</Label>
              <Input
                id="p-username"
                value={form.username}
                onChange={(e) =>
                  setForm((p) => ({ ...p, username: e.target.value.replace(/\s/g, "").toLowerCase() }))
                }
                placeholder="Ex: jose"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-password">
                  Senha {editing && <span className="text-muted-foreground text-xs">(opcional)</span>}
                </Label>
                <div className="relative">
                  <Input
                    id="p-password"
                    type={showPwd ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    className="pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-confirm">Confirmar senha</Label>
                <Input
                  id="p-confirm"
                  type={showPwd ? "text" : "password"}
                  value={form.confirm}
                  onChange={(e) => setForm((p) => ({ ...p, confirm: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-phone">Telefone</Label>
                <Input
                  id="p-phone"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="(61) 99999-9999"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-email">Email</Label>
                <Input
                  id="p-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="parceiro@email.com"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
              <div>
                <div className="font-medium text-sm">Status</div>
                <div className="text-xs text-muted-foreground">
                  Parceiro inativo não consegue fazer login.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={form.status === "Ativo" ? "default" : "outline"}
                  onClick={() => setForm((p) => ({ ...p, status: "Ativo" }))}
                >
                  Ativo
                </Button>
                <Button
                  size="sm"
                  variant={form.status === "Inativo" ? "default" : "outline"}
                  onClick={() => setForm((p) => ({ ...p, status: "Inativo" }))}
                >
                  Inativo
                </Button>
              </div>
            </div>

            {formError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                {formError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : editing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ icon, label, value }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          {icon}
          <span>{label}</span>
        </div>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
