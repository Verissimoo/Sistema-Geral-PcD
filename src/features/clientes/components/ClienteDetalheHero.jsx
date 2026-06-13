import { MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { ClientOriginBadge } from "@/features/clientes/components/ClientOriginBadge";
import { initials } from "./clienteDetalheUtils";

export function ClienteDetalheHero({ client, wa }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-5 flex items-center gap-4 flex-wrap">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center font-bold text-xl text-primary shrink-0">
          {initials(client.name)}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-sm text-muted-foreground">{client.phone || "—"}</span>
            <ClientOriginBadge origin={client.lead_origin || "Outro"} />
          </div>
        </div>
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer">
            <Button className="gap-2 bg-success hover:bg-success">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </Button>
          </a>
        )}
      </CardContent>
    </Card>
  );
}
