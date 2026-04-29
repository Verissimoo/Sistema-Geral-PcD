import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function GerenteVendedorDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate("/gerente/vendedores")} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Button>
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-lg bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Detalhe do Vendedor</h1>
        </div>
        <p className="text-muted-foreground text-sm ml-12">ID: {id}</p>
      </div>
      <Card className="border-border/50">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Página em construção — detalhamento individual será implementado no próximo passo.
        </CardContent>
      </Card>
    </div>
  );
}
