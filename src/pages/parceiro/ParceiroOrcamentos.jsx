import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileStack, Search, Plane, DollarSign, Clock, CheckCircle2,
  ArrowRight, Calendar, Building2, Settings, Plus, Phone, Mail, MapPin,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { localClient } from "@/api/localClient";
import { useAuth } from "@/lib/AuthContext";
import { sanitizeQuotesForPartner } from "@/lib/sanitizeQuoteForPartner";
import PartnerLogo from "@/components/PartnerLogo";

const formatBRL = (v) =>
  (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDateBR = (dateStr) => {
  if (!dateStr) return "—";
  const [y, m, d] = String(dateStr).split("-");
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
};

const isPriced = (q) =>
  q?.partner_sale_value != null &&
  Number(q.partner_sale_value) > 0;

export default function ParceiroOrcamentos() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);
  const [companyLoading, setCompanyLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      setLoading(true);
      const all = (await localClient.entities.Quotes.list()) || [];
      const mine = all.filter((q) => q.partner_id === user.id);
      setQuotes(sanitizeQuotesForPartner(mine));
      setLoading(false);
    };
    load();
  }, [user?.id]);

  useEffect(() => {
    const loadCompany = async () => {
      if (!user?.id) return;
      setCompanyLoading(true);
      const partner = await localClient.entities.Partners.get(user.id);
      let c = null;
      if (partner?.company_id) {
        c = await localClient.entities.PartnerCompanies.get(partner.company_id);
      }
      // Fallback: tenta achar pela coluna partner_id
      if (!c) {
        const list = (await localClient.entities.PartnerCompanies.list()) || [];
        c = list.find((x) => x.partner_id === user.id) || null;
      }
      setCompany(c);
      setCompanyLoading(false);
    };
    loadCompany();
  }, [user?.id]);

  const metrics = useMemo(() => {
    const total = quotes.length;
    const pendentes = quotes.filter((q) => !isPriced(q)).length;
    const finalizados = quotes.filter((q) => isPriced(q) && q.partner_client_data).length;
    const movimentado = quotes
      .filter(isPriced)
      .reduce((s, q) => s + (Number(q.partner_sale_value) || 0), 0);
    return { total, pendentes, finalizados, movimentado };
  }, [quotes]);

  const filtered = useMemo(() => {
    let list = [...quotes];
    if (statusFilter === "pendentes") list = list.filter((q) => !isPriced(q));
    if (statusFilter === "precificados") list = list.filter(isPriced);
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter((q) => {
        const num = (q.quote_number || "").toLowerCase();
        const trecho = q.itinerary?.trechos?.[0];
        const rota = `${trecho?.origem_iata || ""} ${trecho?.destino_iata || ""} ${trecho?.origem_cidade || ""} ${trecho?.destino_cidade || ""}`.toLowerCase();
        const cli = (q.partner_client_data?.name || "").toLowerCase();
        return num.includes(s) || rota.includes(s) || cli.includes(s);
      });
    }
    list.sort((a, b) => {
      // Pendentes primeiro, depois por data
      const ap = isPriced(a) ? 1 : 0;
      const bp = isPriced(b) ? 1 : 0;
      if (ap !== bp) return ap - bp;
      return new Date(b.created_date) - new Date(a.created_date);
    });
    return list;
  }, [quotes, search, statusFilter]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header da empresa do parceiro */}
      {company ? (
        <Card className="overflow-hidden border-0 shadow-lg">
          <div
            className="h-40 relative"
            style={{
              background: company.cover_image_url
                ? `linear-gradient(135deg, ${company.primary_color || "#0B1E3D"}cc, ${company.primary_color || "#0B1E3D"}aa), url('${company.cover_image_url}') center/cover`
                : `linear-gradient(135deg, ${company.primary_color || "#0B1E3D"}, ${company.secondary_color || "#F4A224"})`,
            }}
          >
            <div className="absolute inset-0 bg-black/30" />
            <div className="absolute inset-0 flex items-center justify-between p-6 gap-4 flex-wrap">
              <div className="flex items-center gap-4 min-w-0">
                <PartnerLogo
                  src={company.logo_url}
                  alt={company.name}
                  variant="banner"
                />
                <div className="text-white min-w-0">
                  <h2 className="text-2xl font-bold drop-shadow-md truncate">{company.name}</h2>
                  {company.cnpj && (
                    <p className="text-sm opacity-90 drop-shadow">CNPJ: {company.cnpj}</p>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                className="bg-bg-surface hover:bg-bg-surface shrink-0"
                onClick={() => navigate("/parceiro/empresa")}
              >
                <Settings className="w-4 h-4 mr-2" />
                Editar Empresa
              </Button>
            </div>
          </div>

          {(company.phone || company.email || company.city) && (
            <div className="bg-bg-surface px-6 py-3 flex items-center gap-6 text-sm flex-wrap">
              {company.phone && (
                <span className="flex items-center gap-1.5 text-text-secondary">
                  <Phone className="w-3.5 h-3.5" />
                  {company.phone}
                </span>
              )}
              {company.email && (
                <span className="flex items-center gap-1.5 text-text-secondary">
                  <Mail className="w-3.5 h-3.5" />
                  {company.email}
                </span>
              )}
              {company.city && (
                <span className="flex items-center gap-1.5 text-text-secondary">
                  <MapPin className="w-3.5 h-3.5" />
                  {company.city}{company.state && ` - ${company.state}`}
                </span>
              )}
            </div>
          )}
        </Card>
      ) : !companyLoading && (
        <Card className="border-2 border-dashed border-warning/30 bg-warning/10">
          <CardContent className="p-6 flex items-start gap-4 flex-wrap">
            <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-6 h-6 text-warning" />
            </div>
            <div className="flex-1 min-w-[220px]">
              <h3 className="font-bold text-warning">Configure sua empresa</h3>
              <p className="text-sm text-warning mt-1">
                Antes de começar a precificar orçamentos, configure os dados da sua empresa. Eles aparecerão nos PDFs que você enviar aos seus clientes.
              </p>
            </div>
            <Button
              onClick={() => navigate("/parceiro/empresa")}
              className="bg-warning hover:bg-warning text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Configurar empresa
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Título da lista */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-lg bg-accent/10 text-accent">
            <FileStack className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Meus Orçamentos</h1>
        </div>
        <p className="text-muted-foreground text-sm ml-12">
          Orçamentos enviados pela equipe — defina o valor de venda e os dados do cliente
        </p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard icon={<FileStack className="h-4 w-4" />} label="Recebidos" value={metrics.total} />
        <SummaryCard
          icon={<Clock className="h-4 w-4 text-warning" />}
          label="Aguardando preço"
          value={metrics.pendentes}
        />
        <SummaryCard
          icon={<CheckCircle2 className="h-4 w-4 text-success" />}
          label="Precificados"
          value={metrics.finalizados}
        />
        <SummaryCard
          icon={<DollarSign className="h-4 w-4 text-accent" />}
          label="Total movimentado"
          value={formatBRL(metrics.movimentado)}
          isCurrency
        />
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nº PCD, rota ou cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pendentes">Aguardando preço</SelectItem>
            <SelectItem value="precificados">Já precificados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {loading && (
          <Card className="border-border/50">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Carregando...
            </CardContent>
          </Card>
        )}

        {!loading && filtered.length === 0 && (
          <Card className="border-border/50">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Nenhum orçamento encontrado.
            </CardContent>
          </Card>
        )}

        {!loading && filtered.map((q) => {
          const trecho = q.itinerary?.trechos?.[0];
          const rotaTxt = trecho
            ? `${trecho.origem_cidade || trecho.origem_iata} → ${trecho.destino_cidade || trecho.destino_iata}`
            : "—";
          const priced = isPriced(q);
          const nipon = Number(q.pricing?.nipon_value)
            || Number(q.pricing?.total_nipon)
            || Number(q.total_value)
            || 0;
          return (
            <Card
              key={q.id}
              className={cn(
                "border-border/50 transition-shadow hover:shadow-md",
                !priced && "border-l-4 border-l-amber-400"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-[260px] space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground">
                        {q.quote_number || `PCD-${q.id?.slice(0, 5).toUpperCase()}`}
                      </span>
                      {priced ? (
                        <Badge className="bg-success/10 text-success border border-success/30 hover:bg-success/10">
                          Precificado
                        </Badge>
                      ) : (
                        <Badge className="bg-warning/10 text-warning border border-warning/30 hover:bg-warning/10">
                          Aguardando seu preço
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Plane className="h-4 w-4 text-muted-foreground" />
                      <span>{rotaTxt}</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDateBR(q.dates?.departure)}
                        {!q.dates?.one_way && q.dates?.return && ` → ${formatDateBR(q.dates?.return)}`}
                      </span>
                      <span>· {q.passengers} pax</span>
                      {q.partner_client_data?.name && (
                        <span>· Cliente: {q.partner_client_data.name}</span>
                      )}
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Valor Nipon (custo base)
                    </div>
                    <div className="text-lg font-bold text-primary">{formatBRL(nipon)}</div>
                    {priced && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Seu preço: </span>
                        <strong className="text-success">{formatBRL(q.partner_sale_value)}</strong>
                      </div>
                    )}
                  </div>

                  <div className="w-full flex justify-end">
                    <Button
                      onClick={() => navigate(`/parceiro/orcamentos/${q.id}`)}
                      className={cn(
                        "gap-2",
                        !priced
                          ? "bg-warning hover:bg-warning text-white"
                          : "bg-accent hover:bg-accent text-white"
                      )}
                    >
                      {priced ? "Ver detalhes" : "Definir preço e cliente"}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value, isCurrency }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          {icon}
          <span>{label}</span>
        </div>
        <div className={cn("font-bold", isCurrency ? "text-lg" : "text-2xl")}>{value}</div>
      </CardContent>
    </Card>
  );
}
