import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Headphones, Wallet } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { cn } from "@/shared/lib/utils";
import {
  PRODUCT_TABS, PRODUCT_DOT_CLASSES,
} from "@/features/cotacao/components/manualPrimitives";
import {
  TabVisaoGeral, TabAtendimento, TabComissoes,
} from "@/features/cotacao/components/ManualTabsGerais";
import { PlaybookNacional } from "@/features/cotacao/components/PlaybookNacional";
import { PlaybookInternacional } from "@/features/cotacao/components/PlaybookInternacional";
import { PlaybookHotel } from "@/features/cotacao/components/PlaybookHotel";
import { PlaybookSeguro } from "@/features/cotacao/components/PlaybookSeguro";
import { PlaybookImigracao } from "@/features/cotacao/components/PlaybookImigracao";

// ─── Página ──────────────────────────────────────────────────────────
export default function VendedorCotacao() {
  const [activeTab, setActiveTab] = useState("visao-geral");
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-lg bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Manual do Vendedor</h1>
        </div>
        <p className="text-muted-foreground text-sm ml-12">
          Base de conhecimento e playbooks de produto da equipe comercial
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1 bg-muted/50 justify-start w-full">
          <TabsTrigger value="visao-geral" className="gap-2 px-3 py-2">
            <BookOpen className="w-4 h-4" /> Visão Geral
          </TabsTrigger>
          <TabsTrigger value="atendimento" className="gap-2 px-3 py-2">
            <Headphones className="w-4 h-4" /> Atendimento
          </TabsTrigger>
          <TabsTrigger value="comissoes" className="gap-2 px-3 py-2">
            <Wallet className="w-4 h-4" /> Comissões
          </TabsTrigger>

          <span className="mx-1 my-1 w-px self-stretch bg-border" aria-hidden />

          {PRODUCT_TABS.map((p) => {
            const Icon = p.icon;
            return (
              <TabsTrigger
                key={p.value}
                value={p.value}
                className="gap-2 px-3 py-2"
              >
                <Icon className="w-4 h-4" />
                {p.label}
                <span className={cn("inline-block w-1.5 h-1.5 rounded-full ml-1", PRODUCT_DOT_CLASSES[p.color])} />
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════
            VISÃO GERAL
        ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="visao-geral" className="space-y-6">
          <TabVisaoGeral setActiveTab={setActiveTab} />
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════
            ATENDIMENTO
        ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="atendimento" className="space-y-6">
          <TabAtendimento />
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════
            COMISSÕES
        ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="comissoes" className="space-y-6">
          <TabComissoes navigate={navigate} />
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════
            PLAYBOOKS DE PRODUTO
        ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="nacional"><PlaybookNacional /></TabsContent>
        <TabsContent value="internacional"><PlaybookInternacional /></TabsContent>
        <TabsContent value="hotel"><PlaybookHotel /></TabsContent>
        <TabsContent value="seguro"><PlaybookSeguro /></TabsContent>
        <TabsContent value="imigracao"><PlaybookImigracao /></TabsContent>
      </Tabs>
    </div>
  );
}
