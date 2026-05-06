import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Plane, Calendar, User, Phone, Mail, DollarSign,
  Save, FileText, AlertCircle, TrendingUp, Loader2, CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { localClient } from "@/api/localClient";
import { openQuoteInNewTab } from "@/lib/generateQuoteHTML";
import { useAuth } from "@/lib/AuthContext";
import { parseBR, sanitizeBRInput } from "@/lib/parseBR";

const formatBRL = (v) =>
  (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDateBR = (dateStr) => {
  if (!dateStr) return "—";
  const [y, m, d] = String(dateStr).split("-");
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
};

export default function ParceiroOrcamentoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [saleValue, setSaleValue] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const q = await localClient.entities.Quotes.get(id);
      if (!q) {
        toast({ title: "Orçamento não encontrado", variant: "destructive" });
        navigate("/parceiro/orcamentos", { replace: true });
        return;
      }
      if (q.partner_id !== user?.id) {
        toast({ title: "Você não tem acesso a este orçamento", variant: "destructive" });
        navigate("/parceiro/orcamentos", { replace: true });
        return;
      }
      setQuote(q);
      if (q.partner_sale_value != null) {
        setSaleValue(
          Number(q.partner_sale_value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        );
      }
      if (q.partner_client_data) {
        setClientName(q.partner_client_data.name || "");
        setClientPhone(q.partner_client_data.phone || "");
        setClientEmail(q.partner_client_data.email || "");
      }
      setLoading(false);
    };
    if (user?.id) load();
  }, [id, user?.id, navigate, toast]);

  const niponBase = useMemo(() => {
    if (!quote) return 0;
    return (
      Number(quote.pricing?.nipon_value) ||
      Number(quote.pricing?.total_nipon) ||
      Number(quote.total_value) ||
      0
    );
  }, [quote]);

  const saleValueNumber = parseBR(saleValue);
  const margem = saleValueNumber - niponBase;
  const margemValida = saleValueNumber > 0 && margem >= 0;

  const handleSave = async () => {
    if (saving) return;
    if (saleValueNumber <= 0) {
      toast({ title: "Informe um valor de venda válido", variant: "destructive" });
      return;
    }
    if (!clientName.trim()) {
      toast({ title: "Nome do cliente é obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const updates = {
        partner_sale_value: saleValueNumber,
        partner_client_data: {
          name: clientName.trim(),
          phone: clientPhone.trim(),
          email: clientEmail.trim(),
        },
        total_value: saleValueNumber,
        pricing: {
          ...(quote.pricing || {}),
          sale_value: saleValueNumber,
        },
      };
      const updated = await localClient.entities.Quotes.update(quote.id, updates);
      if (!updated) {
        toast({ title: "Erro ao salvar", variant: "destructive" });
        return;
      }
      setQuote(updated);
      toast({ title: "Orçamento atualizado!", description: "Valor e dados do cliente salvos." });
    } finally {
      setSaving(false);
    }
  };

  const handleViewPDF = () => {
    if (!quote) return;
    const finalSale = saleValueNumber > 0 ? saleValueNumber : (quote.partner_sale_value || niponBase);
    openQuoteInNewTab({
      quote_number: quote.quote_number || `PCD-${quote.id?.slice(0, 5).toUpperCase()}`,
      client: {
        name: clientName || quote.partner_client_data?.name || "Cliente",
        phone: clientPhone || quote.partner_client_data?.phone || "",
        email: clientEmail || quote.partner_client_data?.email || "",
      },
      product: quote.product,
      ticket_type: quote.ticket_type,
      itinerary: quote.itinerary,
      dates: quote.dates,
      passengers: quote.passengers,
      baggage: quote.baggage,
      pricing: { ...(quote.pricing || {}), sale_value: finalSale },
      additional: null,
      competitor: null,
      services: { insurance: { active: false, value: 0 }, transfer: { active: false, value: 0 } },
      total_value: finalSale,
      commission: { base: 0, extra: 0, total: 0 },
      seller_name: user?.name || "Parceiro",
      created_date: quote.created_date,
    });
  };

  if (loading) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!quote) return null;

  const isPriced = quote.partner_sale_value != null && Number(quote.partner_sale_value) > 0;
  const trechos = quote.itinerary?.trechos || [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Voltar */}
      <Button variant="ghost" onClick={() => navigate("/parceiro/orcamentos")} className="gap-2 -ml-3">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="font-mono text-xs text-muted-foreground">
            {quote.quote_number || `PCD-${quote.id?.slice(0, 5).toUpperCase()}`}
          </div>
          <h1 className="text-2xl font-bold tracking-tight mt-0.5">Orçamento — definir preço final</h1>
        </div>
        {isPriced ? (
          <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 gap-1">
            <CheckCircle2 className="h-3 w-3" /> Já precificado
          </Badge>
        ) : (
          <Badge className="bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-100">
            Aguardando seu preço
          </Badge>
        )}
      </div>

      {/* Itinerário */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Plane className="h-4 w-4" /> Itinerário
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {trechos.map((t, idx) => (
            <div key={idx} className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Badge variant="outline" className="capitalize">{t.tipo}</Badge>
                <span className="font-medium">
                  {t.companhia} {t.numero_voo && `· ${t.numero_voo}`}
                </span>
              </div>
              <div className="mt-2 font-semibold">
                {t.origem_cidade || t.origem_iata} ({t.origem_iata}) → {t.destino_cidade || t.destino_iata} ({t.destino_iata})
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Saída {t.horario_saida} · Chegada {t.horario_chegada} · {t.duracao}
                {t.escalas > 0 && ` · ${t.escalas} escala(s) via ${t.aeroporto_escala || "—"}`}
              </div>
            </div>
          ))}
          <Separator className="my-1" />
          <div className="text-sm flex items-center gap-3 text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDateBR(quote.dates?.departure)}
              {!quote.dates?.one_way && quote.dates?.return && ` → ${formatDateBR(quote.dates?.return)}`}
            </span>
            <span>· {quote.passengers} pax</span>
            {quote.ticket_type && <span>· Tipo: {quote.ticket_type}</span>}
          </div>
        </CardContent>
      </Card>

      {/* Custo recebido */}
      <Card className="border-border/50 bg-slate-50">
        <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Valor Nipon (custo base recebido da equipe)
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Esse é o valor mínimo. Defina seu preço de venda acima dele para gerar margem.
            </div>
          </div>
          <div className="text-2xl font-bold text-primary">{formatBRL(niponBase)}</div>
        </CardContent>
      </Card>

      {/* Definir preço */}
      <Card className="border-purple-200 bg-purple-50/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-purple-700" /> Valor de venda ao seu cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="sale">Valor de venda (R$) *</Label>
            <Input
              id="sale"
              type="text"
              inputMode="decimal"
              placeholder="Ex: 2.500,00"
              value={saleValue}
              onChange={(e) => setSaleValue(sanitizeBRInput(e.target.value))}
              className="text-lg font-semibold"
            />
          </div>

          {saleValueNumber > 0 && (
            <div className={cn(
              "rounded-lg border p-3 text-sm flex items-start gap-2",
              margemValida
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-amber-50 border-amber-200 text-amber-800"
            )}>
              <TrendingUp className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">
                  Sua margem: {formatBRL(margem)}
                </div>
                <div className="text-xs mt-0.5">
                  {margemValida
                    ? `Preço (${formatBRL(saleValueNumber)}) − Nipon (${formatBRL(niponBase)})`
                    : `Atenção: o preço está abaixo do Nipon — você teria prejuízo de ${formatBRL(Math.abs(margem))}.`}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dados do cliente */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="h-4 w-4" /> Dados do cliente final
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cli-name">Nome do cliente *</Label>
            <Input
              id="cli-name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Ex: João da Silva"
            />
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cli-phone" className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> Telefone
              </Label>
              <Input
                id="cli-phone"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="(61) 99999-9999"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cli-email" className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" /> Email
              </Label>
              <Input
                id="cli-email"
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="cliente@email.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {!margemValida && saleValueNumber > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>Confirme se realmente quer vender abaixo do Nipon — não há margem positiva.</span>
        </div>
      )}

      {/* Ações */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
        <Button
          onClick={handleSave}
          disabled={saving || saleValueNumber <= 0 || !clientName.trim()}
          className="bg-purple-600 hover:bg-purple-700 text-white gap-2 h-12"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Salvando..." : "Salvar e gerar orçamento final"}
        </Button>
        <Button
          variant="outline"
          onClick={handleViewPDF}
          disabled={saleValueNumber <= 0 && !isPriced}
          className="gap-2 h-12"
        >
          <FileText className="h-4 w-4" /> Visualizar PDF
        </Button>
      </div>
    </div>
  );
}
