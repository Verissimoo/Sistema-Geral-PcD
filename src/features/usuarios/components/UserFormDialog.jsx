import {
  AlertCircle, Eye, EyeOff, Phone, Mail, Handshake,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/shared/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import { CAREER_LEVELS } from "@/features/carreira/careerPlan";

export function UserFormDialog({
  open, onOpenChange, editing, form, setForm,
  showPwd, setShowPwd, formError, saving, onSave,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Salvando..." : editing ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
