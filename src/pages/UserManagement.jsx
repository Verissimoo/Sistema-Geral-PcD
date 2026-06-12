import { useState, useEffect, useMemo, useRef } from "react";
import {
  Users, UserPlus, Pencil, ShieldCheck, ShieldOff, Lock,
  Crown, AlertCircle, Eye, EyeOff, Trash2, Phone, Mail, Handshake,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { localClient } from "@/api/localClient";
import { CAREER_LEVELS } from "@/lib/careerPlan";
import { useAuth } from "@/lib/AuthContext";
import { formatDateBR } from "@/shared/lib/format";

const ADMIN_USERNAME = "admin";

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

export default function UserManagement() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: "", username: "", password: "", confirm: "",
    status: "Ativo", career_level: "N0", role: "vendedor",
    phone: "", email: "",
  });
  const [showPwd, setShowPwd] = useState(false);
  const [formError, setFormError] = useState("");
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const reload = async () => {
    const [usersList, partnersList] = await Promise.all([
      localClient.entities.Users.list(),
      localClient.entities.Partners.list(),
    ]);
    const merged = [
      ...(usersList || []).map((u) => ({ ...u, _source: "users" })),
      ...(partnersList || []).map((p) => ({
        ...p,
        _source: "partners",
        role: "parceiro",
      })),
    ];
    merged.sort(
      (a, b) =>
        new Date(b.created_date || 0).getTime() -
        new Date(a.created_date || 0).getTime()
    );
    setUsers(merged);
  };
  useEffect(() => { reload(); }, []);

  const metrics = useMemo(() => {
    const total = users.length;
    const vendedoresAtivos = users.filter((u) => u.role === "vendedor" && u.status === "Ativo").length;
    const admins = users.filter((u) => u.role === "admin").length;
    return { total, vendedoresAtivos, admins };
  }, [users]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: "", username: "", password: "", confirm: "",
      status: "Ativo", career_level: "N0", role: "vendedor",
      phone: "", email: "",
    });
    setFormError("");
    setShowPwd(false);
    setDialogOpen(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({
      name: u.name || "",
      username: u.username || "",
      password: "",
      confirm: "",
      status: u.status || "Ativo",
      career_level: u.career_level || "N0",
      role: u.role || "vendedor",
      phone: u.phone || "",
      email: u.email || "",
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
    if (username === ADMIN_USERNAME && (!editing || editing.username !== ADMIN_USERNAME)) {
      return "Username 'admin' é reservado";
    }
    // Conflito de username em qualquer das tabelas (users ou partners)
    const conflict = users.find(
      (u) => u.username === username && (!editing || u.id !== editing.id || u._source !== editing._source)
    );
    if (conflict) return "Já existe um usuário (ou parceiro) com esse username";
    if (!editing && !form.password) return "Senha é obrigatória ao criar";
    if (form.password && form.password !== form.confirm) return "Senhas não conferem";
    if (form.role === "parceiro") {
      if (!form.phone.trim()) return "Telefone é obrigatório para parceiro";
      if (!form.email.trim()) return "Email é obrigatório para parceiro";
    }
    return null;
  };

  const [saving, setSaving] = useState(false);
  // Trava síncrona — fecha a janela em que setSaving ainda não rerenderizou.
  const isSavingRef = useRef(false);
  const isDeletingRef = useRef(false);

  const handleSave = async () => {
    const err = validate();
    if (err) {
      setFormError(err);
      return;
    }
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setSaving(true);
    try {
      const username = form.username.trim().toLowerCase();
      const isPartner = form.role === "parceiro";
      const editingIsPartner = editing?._source === "partners";

      if (editing) {
        // Não permitimos mudar entre parceiro ↔ usuário comum no edit
        if (isPartner !== editingIsPartner) {
          setFormError(
            "Não é possível trocar o tipo entre parceiro e usuário comum. Exclua e crie novamente."
          );
          setSaving(false);
          return;
        }

        if (isPartner) {
          const updates = {
            name: form.name.trim(),
            username,
            phone: form.phone.trim(),
            email: form.email.trim(),
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
          const updates = {
            name: form.name.trim(),
            username,
            status: form.status,
          };
          if (editing.role !== "admin") {
            updates.career_level = form.role === "vendedor" ? form.career_level : null;
            updates.role = form.role;
          }
          if (form.password) updates.password = form.password;
          const updated = await localClient.entities.Users.update(editing.id, updates);
          if (!updated) {
            setFormError("Erro ao atualizar usuário. Tente novamente.");
            setSaving(false);
            return;
          }
          toast({ title: "Usuário atualizado", description: form.name });
        }
      } else {
        if (isPartner) {
          const created = await localClient.entities.Partners.create({
            name: form.name.trim(),
            username,
            password: form.password,
            phone: form.phone.trim(),
            email: form.email.trim(),
            status: form.status || "Ativo",
          });
          if (!created) {
            setFormError("Erro ao criar parceiro. Tente novamente.");
            setSaving(false);
            return;
          }
          toast({
            title: "Parceiro criado",
            description: `${created.name} poderá configurar a empresa no primeiro acesso ao portal.`,
          });
        } else {
          const created = await localClient.entities.Users.create({
            name: form.name.trim(),
            username,
            password: form.password,
            role: form.role || "vendedor",
            status: form.status || "Ativo",
            career_level: form.role === "vendedor" ? form.career_level : null,
            created_date: new Date().toISOString(),
          });
          if (!created) {
            setFormError("Erro ao criar usuário. Tente novamente.");
            setSaving(false);
            return;
          }
          const roleLabel = created.role === "suporte"
            ? "Suporte"
            : created.role === "gerente"
              ? "Gerente"
              : "Vendedor";
          toast({
            title: "Usuário criado",
            description: `${roleLabel} "${created.username}" salvo no banco. Pode fazer login de qualquer computador.`,
          });
        }
      }
      setDialogOpen(false);
      await reload();
    } finally {
      isSavingRef.current = false;
      setSaving(false);
    }
  };

  const entityFor = (u) =>
    u?._source === "partners"
      ? localClient.entities.Partners
      : localClient.entities.Users;

  const toggleStatus = async (u) => {
    const next = u.status === "Ativo" ? "Inativo" : "Ativo";
    if (next === "Inativo" && !confirm(`Desativar ${u.name}?`)) return;
    const updated = await entityFor(u).update(u.id, { status: next });
    if (!updated) {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
      return;
    }
    const label = u._source === "partners" ? "Parceiro" : "Usuário";
    toast({ title: `${label} ${next.toLowerCase()}`, description: u.name });
    await reload();
  };

  const handleDelete = async (u) => {
    if (!u) return;
    if (u.username === ADMIN_USERNAME) {
      toast({
        title: "Não permitido",
        description: "O admin do sistema não pode ser excluído.",
        variant: "destructive",
      });
      return;
    }
    if (u.id === currentUser?.id && u._source !== "partners") {
      toast({
        title: "Não permitido",
        description: "Você não pode excluir sua própria conta.",
        variant: "destructive",
      });
      return;
    }
    if (isDeletingRef.current) return;
    isDeletingRef.current = true;
    setDeleting(true);
    try {
      // Parceiro: desvincula empresa antes de excluir (mantém o registro da empresa)
      if (u._source === "partners" && u.company_id) {
        try {
          await localClient.entities.PartnerCompanies.update(u.company_id, { partner_id: null });
        } catch (err) {
          console.warn("Falha ao desvincular empresa do parceiro:", err);
        }
      }

      const result = await entityFor(u).delete(u.id);
      if (!result) {
        toast({ title: "Erro ao excluir", variant: "destructive" });
        return;
      }
      toast({
        title: u._source === "partners" ? "Parceiro excluído" : "Usuário excluído",
        description: `${u.name} foi removido. Orçamentos/cotações anteriores preservam o nome no histórico.`,
      });
      setUserToDelete(null);
      await reload();
    } catch (err) {
      toast({
        title: "Erro ao excluir",
        description: err.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      isDeletingRef.current = false;
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Gestão de Usuários</h1>
          </div>
          <p className="text-muted-foreground text-sm ml-12">
            Crie e gerencie os acessos dos vendedores ao sistema
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <UserPlus className="h-4 w-4" /> Novo Usuário
        </Button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SummaryCard icon={<Users className="h-4 w-4" />} label="Total de usuários" value={metrics.total} />
        <SummaryCard
          icon={<ShieldCheck className="h-4 w-4 text-success" />}
          label="Vendedores ativos"
          value={metrics.vendedoresAtivos}
        />
        <SummaryCard
          icon={<Crown className="h-4 w-4 text-[#0B1E3D]" />}
          label="Administradores"
          value={metrics.admins}
        />
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {users.map((u) => {
          const isSystemAdmin = u.username === ADMIN_USERNAME;
          const isPartner = u._source === "partners";
          const isSelf = !isPartner && u.id === currentUser?.id;
          return (
            <Card key={`${u._source}-${u.id}`} className="border-border/50">
              <CardContent className="p-4 flex items-center gap-4 flex-wrap">
                <div
                  className={cn(
                    "h-11 w-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0",
                    isPartner
                      ? "bg-success/10 text-success"
                      : "bg-primary/10 text-primary"
                  )}
                >
                  {initials(u.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{u.name}</span>
                    {isSystemAdmin && (
                      <Badge className="bg-muted text-muted-foreground hover:bg-muted gap-1">
                        <Lock className="h-3 w-3" /> Conta do sistema
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
                    <span>@{u.username}</span>
                    {isPartner && u.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {u.phone}
                      </span>
                    )}
                    {isPartner && u.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {u.email}
                      </span>
                    )}
                    <span>· criado em {formatDateBR(u.created_date)}</span>
                  </div>
                </div>
                <Badge
                  className={cn(
                    "border",
                    u.role === "admin"
                      ? "bg-[#0B1E3D] text-white border-transparent hover:bg-[#0B1E3D]"
                      : u.role === "gerente"
                        ? "bg-accent text-white border-transparent hover:bg-accent"
                        : u.role === "parceiro"
                          ? "bg-success text-white border-transparent hover:bg-success"
                          : u.role === "suporte"
                            ? "bg-accent/10 text-accent border-accent/30 hover:bg-accent/10"
                            : "bg-warning/10 text-warning border-warning/30 hover:bg-warning/10"
                  )}
                >
                  {u.role === "admin"
                    ? "Admin"
                    : u.role === "gerente"
                      ? "Gerente"
                      : u.role === "parceiro"
                        ? "Parceiro"
                        : u.role === "suporte"
                          ? "Suporte"
                          : "Vendedor"}
                </Badge>
                <Badge
                  className={cn(
                    "border",
                    u.status === "Ativo"
                      ? "bg-success/10 text-success border-success/30 hover:bg-success/10"
                      : "bg-danger/10 text-danger border-danger/30 hover:bg-danger/10"
                  )}
                >
                  {u.status}
                </Badge>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEdit(u)}
                    disabled={isSystemAdmin}
                    className="gap-1.5"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleStatus(u)}
                    disabled={isSystemAdmin}
                    className={cn(
                      "gap-1.5",
                      u.status === "Ativo" ? "text-danger hover:text-danger" : "text-success hover:text-success"
                    )}
                  >
                    {u.status === "Ativo" ? <ShieldOff className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                    {u.status === "Ativo" ? "Desativar" : "Ativar"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setUserToDelete(u)}
                    disabled={isSystemAdmin || isSelf}
                    title={
                      isSystemAdmin
                        ? "Admin do sistema não pode ser excluído"
                        : isSelf
                          ? "Você não pode excluir sua própria conta"
                          : isPartner
                            ? "Excluir parceiro"
                            : "Excluir usuário"
                    }
                    className="gap-1.5 text-danger hover:text-danger hover:bg-danger/10 disabled:opacity-30"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {users.length === 0 && (
          <Card className="border-border/50">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Nenhum usuário cadastrado.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog criar/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar usuário" : "Novo usuário"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Atualize os dados do vendedor. Deixe a senha em branco para manter a atual."
                : "Crie um novo acesso para a equipe comercial."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="u-name">Nome completo</Label>
              <Input
                id="u-name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ex: João Silva"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-username">Nome de usuário</Label>
              <Input
                id="u-username"
                value={form.username}
                onChange={(e) =>
                  setForm((p) => ({ ...p, username: e.target.value.replace(/\s/g, "").toLowerCase() }))
                }
                placeholder="Ex: joao"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="u-password">
                  Senha {editing && <span className="text-muted-foreground text-xs">(opcional)</span>}
                </Label>
                <div className="relative">
                  <Input
                    id="u-password"
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
                <Label htmlFor="u-confirm">Confirmar senha</Label>
                <Input
                  id="u-confirm"
                  type={showPwd ? "text" : "password"}
                  value={form.confirm}
                  onChange={(e) => setForm((p) => ({ ...p, confirm: e.target.value }))}
                />
              </div>
            </div>
            {(!editing || editing.role !== "admin") && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="u-role">Tipo de acesso</Label>
                  <Select
                    value={form.role}
                    onValueChange={(v) => setForm((p) => ({ ...p, role: v }))}
                    disabled={!!editing /* não trocamos tipo no edit */}
                  >
                    <SelectTrigger id="u-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vendedor">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-warning" />
                          Vendedor
                        </span>
                      </SelectItem>
                      <SelectItem value="suporte">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-accent" />
                          Suporte
                        </span>
                      </SelectItem>
                      <SelectItem value="gerente">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-accent" />
                          Gerente
                        </span>
                      </SelectItem>
                      <SelectItem value="parceiro">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-success" />
                          Parceiro
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {editing && (
                    <p className="text-[11px] text-muted-foreground">
                      O tipo de acesso não pode ser alterado depois da criação.
                    </p>
                  )}
                </div>

                {form.role === "parceiro" && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="u-phone" className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" /> Telefone *
                      </Label>
                      <Input
                        id="u-phone"
                        value={form.phone}
                        onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                        placeholder="(61) 99999-9999"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="u-email" className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" /> Email *
                      </Label>
                      <Input
                        id="u-email"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                        placeholder="parceiro@email.com"
                      />
                    </div>
                    <div className="bg-success/10 border border-success/30 rounded-lg p-3 text-xs text-success flex items-start gap-2">
                      <Handshake className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>
                        O parceiro configurará a empresa dele (logo, cores, dados) no primeiro acesso ao portal.
                      </span>
                    </div>
                  </div>
                )}

                {form.role === "vendedor" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="u-career">Nível de Carreira</Label>
                    <Select
                      value={form.career_level}
                      onValueChange={(v) => setForm((p) => ({ ...p, career_level: v }))}
                    >
                      <SelectTrigger id="u-career">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CAREER_LEVELS.map((l) => (
                          <SelectItem key={l.level} value={l.level}>
                            {l.level} — {l.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Use para promover manualmente o vendedor conforme avaliação.
                    </p>
                  </div>
                )}
              </>
            )}

            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
              <div>
                <div className="font-medium text-sm">Status</div>
                <div className="text-xs text-muted-foreground">
                  Usuário inativo não consegue fazer login.
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
              <div className="flex items-start gap-2 p-3 rounded-lg bg-danger/10 border border-danger/30 text-sm text-danger">
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

      {/* Confirmação de exclusão permanente */}
      <AlertDialog
        open={!!userToDelete}
        onOpenChange={(open) => !open && !deleting && setUserToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir {userToDelete?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O usuário será permanentemente removido do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 text-sm">
            <div className="text-warning bg-warning/10 border border-warning/30 rounded p-3">
              ⚠️ Cotações criadas por este usuário <strong>permanecem no sistema</strong> com o nome dele preservado no histórico, mas ele não poderá mais fazer login.
            </div>
            <p className="text-xs text-muted-foreground">
              Se você só quer impedir o acesso temporariamente, use a opção <strong>Desativar</strong> em vez de excluir.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete(userToDelete);
              }}
              disabled={deleting}
              className="bg-danger hover:bg-danger text-white"
            >
              {deleting ? "Excluindo..." : "Sim, excluir permanentemente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
