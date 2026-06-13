import {
  Users, UserPlus, ShieldCheck, Crown,
} from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { useUserManagement } from "../hooks/useUserManagement";
import { SummaryCard } from "../components/UserSummaryCard";
import { UserListItem } from "../components/UserListItem";
import { UserFormDialog } from "../components/UserFormDialog";
import { DeleteUserDialog } from "../components/DeleteUserDialog";

export default function UserManagement() {
  const {
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
  } = useUserManagement();

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
        {users.map((u) => (
          <UserListItem
            key={`${u._source}-${u.id}`}
            user={u}
            currentUser={currentUser}
            onEdit={openEdit}
            onToggleStatus={toggleStatus}
            onDelete={setUserToDelete}
          />
        ))}
        {users.length === 0 && (
          <Card className="border-border/50">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Nenhum usuário cadastrado.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog criar/editar */}
      <UserFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        form={form}
        setForm={setForm}
        showPwd={showPwd}
        setShowPwd={setShowPwd}
        formError={formError}
        saving={saving}
        onSave={handleSave}
      />

      {/* Confirmação de exclusão permanente */}
      <DeleteUserDialog
        userToDelete={userToDelete}
        deleting={deleting}
        onOpenChange={(open) => !open && !deleting && setUserToDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
