import { Wrench, Calculator, CreditCard, Plane } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import ComissaoTab from "@/features/vendedores/components/ComissaoTab";
import TaxaJurosTab from "@/features/vendedores/components/TaxaJurosTab";
import CalculadoraMilhasTab from "@/features/vendedores/components/CalculadoraMilhasTab";

// ─── Página Principal ──────────────────────────────────────────────
export default function VendedorFerramentas() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-lg bg-primary/10">
            <Wrench className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Ferramentas do Vendedor</h1>
        </div>
        <p className="text-muted-foreground text-sm ml-12">Calculadoras de comissão e simulador de taxas de cartão</p>
      </div>

      <Tabs defaultValue="comissao" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl">
          <TabsTrigger value="comissao" className="gap-2">
            <Calculator className="h-4 w-4" />
            Cálculo de Comissão
          </TabsTrigger>
          <TabsTrigger value="taxas" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Taxa de Juros
          </TabsTrigger>
          <TabsTrigger value="milhas" className="gap-2">
            <Plane className="h-4 w-4" />
            Calculadora de Milhas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="comissao">
          <ComissaoTab />
        </TabsContent>

        <TabsContent value="taxas">
          <TaxaJurosTab />
        </TabsContent>

        <TabsContent value="milhas">
          <CalculadoraMilhasTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
