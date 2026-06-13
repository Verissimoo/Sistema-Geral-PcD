import { useState, useMemo } from "react";
import {
  Trophy, TrendingUp, Map, Users, AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import { useAuth } from "@/features/auth/AuthContext";
import { useUsers, useQuotes } from "@/api/hooks";
import { ProgressView } from "@/features/carreira/components/ProgressView";
import { CareerMap } from "@/features/carreira/components/CareerMap";

export default function VendedorCarreira() {
  const { user, isAdmin } = useAuth();
  const { data: users = [] } = useUsers();
  const { data: quotes = [] } = useQuotes();
  const [selectedSellerId, setSelectedSellerId] = useState(null);

  const sellersList = useMemo(
    () => users.filter((u) => u.role === "vendedor"),
    [users]
  );

  // Vendedor: o próprio user. Admin: o vendedor selecionado (se houver).
  const sellerId = isAdmin ? selectedSellerId : user?.id;
  const seller = useMemo(() => {
    if (!sellerId) return null;
    if (!isAdmin) {
      return {
        id: user.id,
        name: user.name,
        career_level: users.find((u) => u.id === user.id)?.career_level || "N0",
      };
    }
    return users.find((u) => u.id === sellerId);
  }, [sellerId, isAdmin, user, users]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-lg bg-primary/10">
            <Trophy className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Plano de Carreira</h1>
        </div>
        <p className="text-muted-foreground text-sm ml-12">
          Acompanhe seu progresso, metas e evolução rumo ao próximo nível
        </p>
      </div>

      <Tabs defaultValue="progresso" className="space-y-6">
        <TabsList>
          <TabsTrigger value="progresso" className="gap-2">
            <TrendingUp className="h-4 w-4" /> Meu Progresso
          </TabsTrigger>
          <TabsTrigger value="mapa" className="gap-2">
            <Map className="h-4 w-4" /> Mapa de Carreira
          </TabsTrigger>
        </TabsList>

        <TabsContent value="progresso" className="space-y-6">
          {isAdmin && (
            <Card className="border-warning/30 bg-warning/10 dark:bg-warning/5">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3 text-sm text-warning dark:text-warning">
                  <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <span>
                    Você está logado como administrador. Selecione um vendedor
                    para ver o progresso dele.
                  </span>
                </div>
                <Select
                  value={selectedSellerId || ""}
                  onValueChange={(v) => setSelectedSellerId(v)}
                >
                  <SelectTrigger className="max-w-sm">
                    <SelectValue placeholder="Selecione um vendedor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sellersList.length === 0 ? (
                      <div className="px-2 py-2 text-xs text-muted-foreground">
                        Nenhum vendedor cadastrado
                      </div>
                    ) : (
                      sellersList.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} · {s.career_level || "N0"}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {seller ? (
            <ProgressView seller={seller} quotes={quotes} />
          ) : (
            <Card className="border-border/50">
              <CardContent className="py-16 text-center">
                <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {isAdmin
                    ? "Selecione um vendedor acima para ver o progresso."
                    : "Carregando seus dados..."}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="mapa" className="space-y-6">
          <CareerMap currentLevelCode={isAdmin ? null : (seller?.career_level || "N0")} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
