import { Card } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

export default function Settings() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground text-sm mt-1">Configurações gerais do sistema</p>
      </div>
      <Card className="p-8 text-center">
        <SettingsIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="font-semibold text-lg mb-2">Em construção</h2>
        <p className="text-sm text-muted-foreground">As configurações avançadas estarão disponíveis em breve.</p>
      </Card>
    </div>
  );
}