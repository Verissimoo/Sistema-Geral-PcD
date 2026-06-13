import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/shared/ui/alert-dialog";

export function DeleteUserDialog({ userToDelete, deleting, onOpenChange, onConfirm }) {
  return (
    <AlertDialog
      open={!!userToDelete}
      onOpenChange={onOpenChange}
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
              onConfirm(userToDelete);
            }}
            disabled={deleting}
            className="bg-danger hover:bg-danger text-white"
          >
            {deleting ? "Excluindo..." : "Sim, excluir permanentemente"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
