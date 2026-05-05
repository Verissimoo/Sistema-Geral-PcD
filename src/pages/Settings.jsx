import {
  Settings as SettingsIcon, Database, Info, CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Settings() {
  return (
    <div className="space-y-6 max-w-3xl pb-12">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <SettingsIcon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground text-sm">Configurações gerais do sistema</p>
        </div>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            Sincronização de Dados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-emerald-700 dark:text-emerald-300">
              Os dados agora ficam centralizados no Supabase. Cada PC enxerga as
              mesmas informações em tempo real — não é mais necessário exportar
              ou importar backups.
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Apenas a sessão de login (quem está logado neste navegador) ainda
              é armazenada localmente. Tudo o que se refere a clientes, cotações,
              metas, milhas e usuários está na nuvem.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
