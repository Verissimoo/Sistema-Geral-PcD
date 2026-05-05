import { useRef, useState } from "react";
import {
  Settings as SettingsIcon, Download, Upload, AlertTriangle, Database, Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

// pcd_users foi migrado para o Supabase — não entra mais no backup local.
const STORAGE_KEYS = [
  "pcd_clients",
  "pcd_quotes",
  "pcd_miles_table",
  "pcd_commercial_goals",
  "pcd_rituals",
  "pcd_contractors",
  "pcd_projects",
  "pcd_sellers",
];

export default function Settings() {
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);

  const handleExport = () => {
    const data = {};
    STORAGE_KEYS.forEach((key) => {
      data[key] = JSON.parse(localStorage.getItem(key) || "[]");
    });
    data._exportedAt = new Date().toISOString();
    data._version = 1;

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pcd-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({ title: "Backup exportado", description: "Arquivo JSON gerado com sucesso." });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm("Importar este backup vai SUBSTITUIR todos os dados atuais. Continuar?")) {
      e.target.value = "";
      return;
    }
    setImporting(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        let imported = 0;
        STORAGE_KEYS.forEach((key) => {
          if (Array.isArray(data[key])) {
            localStorage.setItem(key, JSON.stringify(data[key]));
            imported++;
          }
        });
        if (imported === 0) throw new Error("Nenhum dado válido encontrado no arquivo.");
        toast({ title: "Backup importado", description: "Recarregando..." });
        setTimeout(() => window.location.reload(), 800);
      } catch (err) {
        console.error(err);
        toast({
          title: "Arquivo inválido",
          description: err.message || "Não foi possível ler o backup.",
          variant: "destructive",
        });
        setImporting(false);
      }
    };
    reader.onerror = () => {
      toast({ title: "Erro de leitura", variant: "destructive" });
      setImporting(false);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

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
          <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm">
            <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-blue-700 dark:text-blue-300">
              O sistema armazena dados localmente no navegador. Para usar em outro
              computador, exporte os dados aqui e importe no outro PC.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button onClick={handleExport} className="gap-2 h-auto py-3" variant="outline">
              <Download className="h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">Exportar Backup</div>
                <div className="text-xs text-muted-foreground font-normal">
                  Baixa um arquivo JSON
                </div>
              </div>
            </Button>

            <Button
              onClick={handleImportClick}
              disabled={importing}
              className="gap-2 h-auto py-3"
              variant="outline"
            >
              <Upload className="h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">
                  {importing ? "Importando..." : "Importar Backup"}
                </div>
                <div className="text-xs text-muted-foreground font-normal">
                  Carrega arquivo JSON
                </div>
              </div>
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImport}
            />
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>A importação substitui todos os dados atuais (usuários, clientes, cotações, milhas, metas, etc).</span>
          </div>

          <div className="text-xs text-muted-foreground border-t border-border pt-3">
            <strong>Fluxo recomendado:</strong> crie/edite vendedores e cadastros no PC
            principal → exporte o backup → envie o JSON para os outros computadores →
            importe em cada um.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
