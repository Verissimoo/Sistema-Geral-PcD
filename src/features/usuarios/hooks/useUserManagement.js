import { useState, useMemo, useRef } from "react";
import { useToast } from "@/shared/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  useUsers, useCreateUser, useUpdateUser,
  usePartners, useCreatePartner, useUpdatePartner,
} from "@/api/hooks";
import { deleteUser } from "@/api/users";
import { deletePartner, updatePartnerCompany } from "@/api/partners";
import { qk } from "@/api/queryKeys";
import { useAuth } from "@/features/auth/AuthContext";
import { ADMIN_USERNAME } from "../components/userUtils";

const emptyForm = {
  name: "", username: "", password: "", confirm: "",
  status: "Ativo", career_level: "N0", role: "vendedor",
  phone: "", email: "",
};

export function useUserManagement() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { data: usersList = [] } = useUsers();
  const { data: partnersList = [] } = usePartners();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const createPartner = useCreatePartner();
  const updatePartner = useUpdatePartner();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [showPwd, setShowPwd] = useState(false);
  const [formError, setFormError] = useState("");
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  // Trava síncrona — fecha a janela em que setSaving ainda não rerenderizou.
  const isSavingRef = useRef(false);
  const isDeletingRef = useRef(false);

  const users = useMemo(() => {
    const merged = [
      ...usersList.map((u) => ({ ...u, _source: "users" })),
      ...partnersList.map((p) => ({
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
    return merged;
  }, [usersList, partnersList]);

  const metrics = useMemo(() => {
    const total = users.length;
    const vendedoresAtivos = users.filter((u) => u.role === "vendedor" && u.status === "Ativo").length;
    const admins = users.filter((u) => u.role === "admin").length;
    return { total, vendedoresAtivos, admins };
  }, [users]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
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
          try {
            await updatePartner.mutateAsync({ id: editing.id, updates });
          } catch {
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
          try {
            await updateUser.mutateAsync({ id: editing.id, updates });
          } catch {
            setFormError("Erro ao atualizar usuário. Tente novamente.");
            setSaving(false);
            return;
          }
          toast({ title: "Usuário atualizado", description: form.name });
        }
      } else {
        if (isPartner) {
          let created;
          try {
            created = await createPartner.mutateAsync({
              name: form.name.trim(),
              username,
              password: form.password,
              phone: form.phone.trim(),
              email: form.email.trim(),
              status: form.status || "Ativo",
            });
          } catch {
            setFormError("Erro ao criar parceiro. Tente novamente.");
            setSaving(false);
            return;
          }
          toast({
            title: "Parceiro criado",
            description: `${created.name} poderá configurar a empresa no primeiro acesso ao portal.`,
          });
        } else {
          let created;
          try {
            created = await createUser.mutateAsync({
              name: form.name.trim(),
              username,
              password: form.password,
              role: form.role || "vendedor",
              status: form.status || "Ativo",
              career_level: form.role === "vendedor" ? form.career_level : null,
              created_date: new Date().toISOString(),
            });
          } catch {
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
    } finally {
      isSavingRef.current = false;
      setSaving(false);
    }
  };

  const toggleStatus = async (u) => {
    const next = u.status === "Ativo" ? "Inativo" : "Ativo";
    if (next === "Inativo" && !confirm(`Desativar ${u.name}?`)) return;
    const mutation = u._source === "partners" ? updatePartner : updateUser;
    try {
      await mutation.mutateAsync({ id: u.id, updates: { status: next } });
    } catch {
      // Erro já notificado pelo toast central
      return;
    }
    const label = u._source === "partners" ? "Parceiro" : "Usuário";
    toast({ title: `${label} ${next.toLowerCase()}`, description: u.name });
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
          await updatePartnerCompany(u.company_id, { partner_id: null });
          queryClient.invalidateQueries({ queryKey: qk.partnerCompanies.all });
        } catch (err) {
          console.warn("Falha ao desvincular empresa do parceiro:", err);
        }
      }

      if (u._source === "partners") {
        await deletePartner(u.id);
        queryClient.invalidateQueries({ queryKey: qk.partners.all });
      } else {
        await deleteUser(u.id);
        queryClient.invalidateQueries({ queryKey: qk.users.all });
      }
      toast({
        title: u._source === "partners" ? "Parceiro excluído" : "Usuário excluído",
        description: `${u.name} foi removido. Orçamentos/cotações anteriores preservam o nome no histórico.`,
      });
      setUserToDelete(null);
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

  return {
    currentUser,
    users,
    metrics,
    dialogOpen,
    setDialogOpen,
    editing,
    form,
    setForm,
    showPwd,
    setShowPwd,
    formError,
    userToDelete,
    setUserToDelete,
    deleting,
    saving,
    openCreate,
    openEdit,
    handleSave,
    toggleStatus,
    handleDelete,
  };
}
