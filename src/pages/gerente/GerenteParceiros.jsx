import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Handshake, ShieldCheck, ShieldOff, Building2, Phone, Mail,
  Users, FileStack, DollarSign, CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { localClient } from "@/api/localClient";
import { formatBRL, formatDateBR } from "@/shared/lib/format";

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

export default function GerenteParceiros() {
  const navigate = useNavigate();
  const [partners, setPartners] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [quotes, setQuotes] = useState([]);

  const reload = async () => {
    const [partnersList, companiesList, quotesList] = await Promise.all([
      localClient.entities.Partners.list(),
      localClient.entities.PartnerCompanies.list(),
      localClient.entities.Quotes.list(),
    ]);
    setPartners(partnersList || []);
    setCompanies(companiesList || []);
    setQuotes(quotesList || []);
  };
  useEffect(() => { reload(); }, []);

  const enriched = useMemo(() => {
    return partners.map((p) => {
      const company =
        (p.company_id && companies.find((c) => c.id === p.company_id)) ||
        companies.find((c) => c.partner_id === p.id) ||
        null;
      const pQuotes = quotes.filter((q) => q.partner_id === p.id);
      const sold = pQuotes.filter(
        (q) => q.status === "Aprovado" || q.status === "Emitido" || q.status === "Aguardando Emissão"
      );
      const revenue = sold.reduce((s, q) => s + (Number(q.total_value) || 0), 0);
      return {
        ...p,
        company,
        quoteCount: pQuotes.length,
        soldCount: sold.length,
        revenue,
      };
    });
  }, [partners, companies, quotes]);

  const metrics = useMemo(() => {
    const total = partners.length;
    const ativos = partners.filter((p) => p.status === "Ativo").length;
    const comEmpresa = enriched.filter((p) => p.company).length;
    const totalReceita = enriched.reduce((s, p) => s + p.revenue, 0);
    return { total, ativos, comEmpresa, totalReceita };
  }, [partners, enriched]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-primary/10">
              <Handshake className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Parceiros</h1>
          </div>
          <p className="text-muted-foreground text-sm ml-12">
            Visão consolidada dos parceiros — empresa vinculada e performance
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/usuarios")} className="gap-2">
          <Users className="h-4 w-4" /> Gerenciar usuários
        </Button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard icon={<Handshake className="h-4 w-4" />} label="Total" value={metrics.total} />
        <SummaryCard
          icon={<ShieldCheck className="h-4 w-4 text-success" />}
          label="Ativos"
          value={metrics.ativos}
          color="text-success"
        />
        <SummaryCard
          icon={<Building2 className="h-4 w-4 text-accent" />}
          label="Com empresa configurada"
          value={metrics.comEmpresa}
          color="text-accent"
        />
        <SummaryCard
          icon={<DollarSign className="h-4 w-4 text-warning" />}
          label="Receita gerada (total)"
          value={formatBRL(metrics.totalReceita)}
          color="text-warning"
          isText
        />
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {enriched.length === 0 && (
          <Card className="border-border/50">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Nenhum parceiro cadastrado.{" "}
              <button
                type="button"
                className="text-primary font-semibold underline"
                onClick={() => navigate("/usuarios")}
              >
                Criar em /usuarios
              </button>
            </CardContent>
          </Card>
        )}
        {enriched.map((p) => (
          <Card key={p.id} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-4 flex-wrap">
              <div className="h-11 w-11 rounded-full bg-accent/10 text-accent flex items-center justify-center font-bold text-sm shrink-0">
                {initials(p.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{p.name}</span>
                  {p.company ? (
                    <Badge variant="secondary" className="gap-1">
                      {p.company.logo_url ? (
                        <img
                          src={p.company.logo_url}
                          alt={p.company.name}
                          className="h-3.5 w-3.5 rounded object-contain bg-bg-surface"
                        />
                      ) : (
                        <Building2 className="h-3 w-3" />
                      )}
                      {p.company.name}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-warning border-warning/30">
                      Empresa não configurada
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
                  <span>@{p.username}</span>
                  {p.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {p.phone}
                    </span>
                  )}
                  {p.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {p.email}
                    </span>
                  )}
                  <span>· criado em {formatDateBR(p.created_date)}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-xs">
                <Stat
                  icon={<FileStack className="h-3.5 w-3.5 text-accent" />}
                  label="Cotações"
                  value={p.quoteCount}
                />
                <Stat
                  icon={<CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                  label="Vendidas"
                  value={p.soldCount}
                />
                <Stat
                  icon={<DollarSign className="h-3.5 w-3.5 text-warning" />}
                  label="Receita"
                  value={formatBRL(p.revenue)}
                  isText
                />
              </div>

              <Badge
                className={cn(
                  "border",
                  p.status === "Ativo"
                    ? "bg-success/10 text-success border-success/30 hover:bg-success/10"
                    : "bg-danger/10 text-danger border-danger/30 hover:bg-danger/10"
                )}
              >
                {p.status === "Ativo" ? (
                  <ShieldCheck className="h-3 w-3 mr-1" />
                ) : (
                  <ShieldOff className="h-3 w-3 mr-1" />
                )}
                {p.status}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value, color = "text-foreground", isText }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          {icon}
          <span>{label}</span>
        </div>
        <div className={cn("font-bold", isText ? "text-lg" : "text-2xl", color)}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ icon, label, value, isText }) {
  return (
    <div className="text-center min-w-[64px]">
      <div className="flex items-center justify-center gap-1 text-muted-foreground text-[10px] uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <div className={cn("font-bold mt-0.5", isText ? "text-xs" : "text-sm")}>{value}</div>
    </div>
  );
}
