import { useState, useRef, useEffect, useMemo, Fragment } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FileText, Plane, Palmtree, User, UserPlus, Search, Lock,
  ImagePlus, X, Check, Loader2, AlertTriangle, Info,
  ArrowLeft, ArrowRight, Copy, Sparkles, ClipboardPaste,
  DollarSign, Wallet, Plus, Trash2, MessageCircle, Handshake,
  PlaneTakeoff, PlaneLanding,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { localClient } from "@/api/localClient";
import { supabase } from "@/lib/supabase";
import { openQuoteInNewTab } from "@/lib/generateQuoteHTML";
import { computePricingTotals, computeCommission, buildCommissionSnapshot } from "@/lib/pricingCalculator";
import { useAuth } from "@/lib/AuthContext";
import { useClientOrigins } from "@/lib/useClientOrigins";
import { getCostForMiles, getSaleForMiles, getTierForMiles } from "@/lib/milesHelper";
import { parseBR, sanitizeBRInput } from "@/lib/parseBR";
import { normalizeItinerary } from "@/lib/normalizeItinerary";
import { isNextDayArrival, calculateSegmentDuration } from "@/lib/timeParser";
import { useEurBrlRate } from "@/hooks/useExchangeRate";
import { convertEurToBrl, convertBrlToEur, formatEUR } from "@/lib/exchangeRate";
import ExchangeRateBadge from "@/components/ExchangeRateBadge";
import { formatBRL, formatDateBR as formatDateBRBase } from "@/shared/lib/format";

// ─── Helpers ────────────────────────────────────────────────────────
const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// Call sites deste arquivo esperam "" (não "—") para datas vazias.
const formatDateBR = (dateStr) => formatDateBRBase(dateStr, "");

// Custo e Nipon (1 emissão) de um bloco extra de tipo de emissão. Espelha
// emissionCostNipon do pricingCalculator, mas lê strings BR do formData.
const blockIsAzul = (b) =>
  b?.is_azul === true || String(b?.program_name || "").toLowerCase().includes("azul");

function emissionBlockCN(b) {
  if (!b) return { cost: 0, nipon: 0 };
  const tax = parseBR(b.tax);
  if (b.type === "milhas_dinheiro") {
    const cost =
      (parseBR(b.miles_qty) / 1000) * (Number(b.cost_per_thousand) || 0) +
      parseBR(b.cash_part) +
      tax;
    return { cost, nipon: cost * 1.1 };
  }
  if (b.type === "milhas") {
    const cpt = Number(b.cost_per_thousand) || Number(b.miles_value_per_thousand) || 0;
    const cost = (parseBR(b.miles_qty) / 1000) * cpt + tax;
    return { cost, nipon: blockIsAzul(b) ? cost : cost * 1.1 };
  }
  const cost = parseBR(b.cost_brl) + tax;
  return { cost, nipon: blockIsAzul(b) ? cost : cost * 1.1 };
}

const EMPTY_EMISSION_BLOCK = {
  type: "milhas",
  program_id: "",
  program_name: "",
  miles_qty: "",
  cost_per_thousand: 0,
  sale_per_thousand: 0,
  cash_part: "",
  cost_brl: "",
  tax: "",
  is_azul: false,
  cost_is_total: false,
};

// Gera um quote_number único — tenta até 5 vezes contra o banco antes do fallback
// baseado em timestamp. Combinado com a UNIQUE constraint em pcd_quotes.quote_number,
// elimina a chance de colisão entre vendedores que abram o gerador simultaneamente.
async function gerarNumeroPCDUnico() {
  for (let i = 0; i < 5; i++) {
    const candidato = `PCD-${Math.floor(10000 + Math.random() * 90000)}`;
    const { data } = await supabase
      .from('pcd_quotes')
      .select('id')
      .eq('quote_number', candidato)
      .maybeSingle();
    if (!data) return candidato;
  }
  return `PCD-${Date.now().toString().slice(-7)}`;
}

const calculateDuration = (departure, arrival) => {
  if (!departure || !arrival) return "";
  const depMatch = departure.match(/^(\d{1,2}):(\d{2})$/);
  const arrMatch = arrival.match(/^(\d{1,2}):(\d{2})$/);
  if (!depMatch || !arrMatch) return "";
  const depMinutes = parseInt(depMatch[1], 10) * 60 + parseInt(depMatch[2], 10);
  let arrMinutes = parseInt(arrMatch[1], 10) * 60 + parseInt(arrMatch[2], 10);
  // Se chegada é antes ou igual à saída, assume dia seguinte
  if (arrMinutes <= depMinutes) arrMinutes += 24 * 60;
  const diff = arrMinutes - depMinutes;
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}min`;
};

// ─── Segmentos: helpers ────────────────────────────────────────────
// Constrói um "segmento" a partir dos campos legacy do trecho (quotes antigos).
function createLegacySegment(trecho) {
  if (!trecho) return null;
  return {
    numero_voo: trecho.numero_voo || "",
    companhia: trecho.companhia || "",
    origem_iata: trecho.origem_iata || "",
    origem_cidade: trecho.origem_cidade || "",
    destino_iata: trecho.destino_iata || "",
    destino_cidade: trecho.destino_cidade || "",
    horario_saida: trecho.horario_saida || "",
    horario_chegada: trecho.horario_chegada || "",
    data_saida: trecho.data_saida || null,
    data_chegada: trecho.data_chegada || null,
    duracao: trecho.duracao || "",
  };
}

function getSegmentos(trecho) {
  if (!trecho) return [];
  if (Array.isArray(trecho.segmentos) && trecho.segmentos.length > 0) {
    return trecho.segmentos;
  }
  const legacy = createLegacySegment(trecho);
  return legacy ? [legacy] : [];
}

// Mantém os campos top-level do trecho espelhando segmentos[0] e segmentos[last],
// para retrocompatibilidade com código que ainda lê trecho.origem_iata etc.
function syncTrechoFromSegmentos(trecho) {
  const segmentos = getSegmentos(trecho);
  if (segmentos.length === 0) return trecho;
  const first = segmentos[0];
  const last = segmentos[segmentos.length - 1];
  return {
    ...trecho,
    segmentos,
    escalas: Math.max(0, segmentos.length - 1),
    origem_iata: first.origem_iata || trecho.origem_iata || "",
    origem_cidade: first.origem_cidade || trecho.origem_cidade || "",
    destino_iata: last.destino_iata || trecho.destino_iata || "",
    destino_cidade: last.destino_cidade || trecho.destino_cidade || "",
    horario_saida: first.horario_saida || trecho.horario_saida || "",
    horario_chegada: last.horario_chegada || trecho.horario_chegada || "",
    companhia: first.companhia || trecho.companhia || "",
    numero_voo: first.numero_voo || trecho.numero_voo || "",
    duracao: trecho.tempo_total || trecho.duracao || "",
    aeroporto_escala:
      segmentos
        .slice(0, -1)
        .map((s) => s.destino_iata)
        .filter(Boolean)
        .join(" / ") || trecho.aeroporto_escala || "",
  };
}

const TICKET_TYPES = [
  { value: "Normal", help: "Bilhete padrão ponto a ponto" },
  { value: "Hidden City", help: "Passageiro desembarca antes do destino final do bilhete" },
  { value: "Quebra de Trecho", help: "Bilhetes separados por voo — funciona em ida-volta ou só-ida com conexão (mínimo 2 voos)" },
  { value: "Imigração", help: "Pacote com voo + assessoria para imigração" },
];

const initialFormData = {
  recipient_type: "cliente",
  partner_id: null,
  partner_name: null,
  client: null,
  product: null,
  ticket_type: "Normal",
  flight_images: [],
  itinerary: { trechos: [] },
  itinerary_reviewed: false,
  departure_date: "",
  return_date: "",
  one_way: false,
  passengers: 1,
  baggage: { personal: 1, carry_on: 1, checked: 0 },
  pricing: {
    type: "milhas",
    program_id: "",
    program_name: "",
    miles_value_per_thousand: 0,
    miles_qty: "",
    tax: "",
    cost_brl: "",
    is_azul: false,
    nipon_value: 0,
    sale_value: "",
    sale_per: "pessoa", // 'pessoa' (multiplica pelo nº de pax) | 'total' (já é o valor total)
  },
  additional: { active: false, value: "", description: "" },
  competitor: { active: false, name: "", value: "", fare_type: "Econômica" },
  services: {
    insurance: { active: false, value: "" },
    transfer: { active: false, value: "" },
  },
  // Cotação derivada (mesmo cliente)
  parent_quote_id: null,
  quote_sequence: 1,
};

// ─── Stepper ────────────────────────────────────────────────────────
function Stepper({ currentStep, completedSteps }) {
  const steps = [
    { n: 1, label: "Cliente" },
    { n: 2, label: "Produto" },
    { n: 3, label: "Itinerário" },
    { n: 4, label: "Precificação" },
    { n: 5, label: "Gerar" },
  ];
  return (
    <div className="flex items-center justify-between gap-2 px-1 py-2">
      {steps.map((s, idx) => {
        const isActive = currentStep === s.n;
        const isDone = completedSteps.includes(s.n);
        return (
          <div key={s.n} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div
                className={cn(
                  "h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all border-2",
                  isDone && "bg-success border-success/30 text-white",
                  isActive && !isDone && "bg-warning border-warning/30 text-white shadow-md",
                  !isActive && !isDone && "bg-muted border-border text-muted-foreground"
                )}
              >
                {isDone ? <Check className="h-4 w-4" /> : s.n}
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {s.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={cn(
                  "h-0.5 flex-1 mx-2 mt-[-18px] transition-colors",
                  completedSteps.includes(s.n) ? "bg-success" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Bloco 1 — Cliente ou Parceiro ──────────────────────────────────
function BlocoCliente({ formData, setFormData }) {
  const [mode, setMode] = useState(formData.client?.id ? "select" : "select");
  const [search, setSearch] = useState("");
  const [clients, setClients] = useState([]);
  const [partners, setPartners] = useState([]);
  const [newClient, setNewClient] = useState({ name: "", phone: "", lead_origin: "" });
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const clientOrigins = useClientOrigins();

  useEffect(() => {
    (async () => {
      const list = (await localClient.entities.Clients.list()) || [];
      // Vendedor enxerga apenas os próprios clientes; admin vê todos.
      const visible = isAdmin ? list : list.filter((c) => c.created_by === user?.id);
      setClients(visible);
    })();
  }, [user?.id, isAdmin]);

  useEffect(() => {
    (async () => {
      const list = (await localClient.entities.Partners.list()) || [];
      setPartners(list);
    })();
  }, []);

  const filtered = useMemo(
    () => clients.filter((c) => c.name?.toLowerCase().includes(search.toLowerCase())),
    [clients, search]
  );

  const selectClient = (c) => {
    setFormData((p) => ({ ...p, client: c }));
  };

  const saveNewClient = async () => {
    if (!newClient.name.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    const created = await localClient.entities.Clients.create({
      name: newClient.name.trim(),
      phone: newClient.phone,
      lead_origin: newClient.lead_origin || "Outro",
      created_by: user?.id || null,
      created_by_name: user?.name || null,
    });
    if (!created) {
      toast({ title: "Erro ao salvar cliente", variant: "destructive" });
      return;
    }
    setClients((arr) => [...arr, created]);
    setFormData((p) => ({ ...p, client: created }));
    setNewClient({ name: "", phone: "", lead_origin: "" });
    setMode("select");
    toast({ title: "Cliente cadastrado", description: created.name });
  };

  const recipientType = formData.recipient_type || "cliente";

  return (
    <div className="space-y-4">
      {/* Toggle: Cliente Final vs Parceiro */}
      <div>
        <Label className="text-sm font-semibold mb-2 block">Para quem é este orçamento?</Label>
        <Tabs
          value={recipientType}
          onValueChange={(v) =>
            setFormData((p) => ({
              ...p,
              recipient_type: v,
              client: v === "cliente" ? p.client : null,
              partner_id: v === "parceiro" ? p.partner_id : null,
              partner_name: v === "parceiro" ? p.partner_name : null,
            }))
          }
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cliente" className="gap-2">
              <User className="w-4 h-4" /> Cliente Final
            </TabsTrigger>
            <TabsTrigger value="parceiro" className="gap-2">
              <Handshake className="w-4 h-4" /> Parceiro
            </TabsTrigger>
          </TabsList>

          <TabsContent value="parceiro" className="mt-4 space-y-3">
            <Label>Selecionar parceiro</Label>
            <Select
              value={formData.partner_id || ""}
              onValueChange={(v) => {
                const partner = partners.find((p) => p.id === v);
                setFormData((prev) => ({
                  ...prev,
                  partner_id: v,
                  partner_name: partner?.name || null,
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={partners.length === 0 ? "Sem parceiros cadastrados" : "Escolha um parceiro"} />
              </SelectTrigger>
              <SelectContent>
                {partners.filter((p) => p.status === "Ativo").map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}{p.company ? ` · ${p.company}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {formData.partner_id && (
              <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg text-sm text-warning">
                <strong>ℹ️ Modo Parceiro:</strong> você define livremente o valor a cobrar da parceira. O Nipon aparece apenas como sugestão.
              </div>
            )}
          </TabsContent>

          <TabsContent value="cliente" className="mt-4">

      <Tabs value={mode} onValueChange={setMode}>
        <TabsList>
          <TabsTrigger value="select" className="gap-2">
            <User className="h-3.5 w-3.5" /> Selecionar existente
          </TabsTrigger>
          <TabsTrigger value="new" className="gap-2">
            <UserPlus className="h-3.5 w-3.5" /> Cadastrar novo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="select" className="space-y-3 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {filtered.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {clients.length === 0
                  ? "Nenhum cliente cadastrado ainda. Vá em \"Cadastrar novo\"."
                  : "Nenhum cliente encontrado."}
              </div>
            )}
            {filtered.map((c) => {
              const isSelected = formData.client?.id === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectClient(c)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-all",
                    isSelected
                      ? "border-warning/30 bg-warning/10 dark:bg-warning/10 ring-1 ring-warning/40"
                      : "border-border hover:border-primary/40 hover:bg-muted/40"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{c.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {c.phone || "Sem telefone"} · {c.lead_origin || "—"}
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-warning" />}
                  </div>
                </button>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="new" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="cli-name">Nome completo *</Label>
            <Input
              id="cli-name"
              value={newClient.name}
              onChange={(e) => setNewClient((p) => ({ ...p, name: e.target.value }))}
              placeholder="Ex: João da Silva"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cli-phone">Telefone</Label>
            <Input
              id="cli-phone"
              value={newClient.phone}
              onChange={(e) => setNewClient((p) => ({ ...p, phone: e.target.value }))}
              placeholder="(61) 99999-9999"
            />
          </div>
          <div className="space-y-2">
            <Label>Origem do Lead</Label>
            <Select
              value={newClient.lead_origin}
              onValueChange={(v) => setNewClient((p) => ({ ...p, lead_origin: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {clientOrigins.map((o) => (
                  <SelectItem key={o.id} value={o.label}>
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: o.color || "#94A3B8" }}
                      />
                      {o.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={saveNewClient} className="w-full">
            <UserPlus className="h-4 w-4 mr-2" /> Salvar cliente
          </Button>
        </TabsContent>
      </Tabs>

      {formData.client && (
        <div className="p-3 rounded-lg bg-success/10 border border-success/30 flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-success" />
          <span><strong>{formData.client.name}</strong> selecionado</span>
        </div>
      )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ─── Bloco 2 — Produto ──────────────────────────────────────────────
function BlocoProduto({ formData, setFormData }) {
  const select = (p) => setFormData((prev) => ({ ...prev, product: p }));
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <button
        type="button"
        onClick={() => select("aereo")}
        className={cn(
          "p-6 rounded-xl border-2 text-left transition-all",
          formData.product === "aereo"
            ? "border-warning/30 bg-warning/10 dark:bg-warning/10 shadow-md"
            : "border-border hover:border-primary/40 hover:bg-muted/30"
        )}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-lg bg-primary/10">
            <Plane className="h-6 w-6 text-primary" />
          </div>
          <div className="font-semibold">Aéreo</div>
          {formData.product === "aereo" && (
            <Check className="h-5 w-5 text-warning ml-auto" />
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Passagens aéreas nacionais e internacionais
        </p>
      </button>

      <div className="p-6 rounded-xl border-2 border-dashed border-border bg-muted/20 cursor-not-allowed opacity-70">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-lg bg-muted">
            <Palmtree className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="font-semibold text-muted-foreground">Turismo</div>
          <Badge variant="secondary" className="ml-auto gap-1">
            <Lock className="h-3 w-3" /> Em breve
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Pacotes de turismo e cruzeiros
        </p>
      </div>
    </div>
  );
}

// ─── Card de segmento (voo individual) ─────────────────────────────
function SegmentoCard({
  segmento,
  segmentoIdx,
  trechoIdx,
  totalSegmentos,
  onUpdate,
  onRemove,
  isHiddenStop = false,
  isAfterHidden = false,
  hiddenDestinoIata = "",
}) {
  const showNextDayBadge = isNextDayArrival(segmento);

  return (
    <div
      className={cn(
        "rounded-lg p-4 space-y-3 border",
        isHiddenStop && "border-accent/30 ring-2 ring-accent/40 bg-accent/10",
        isAfterHidden && "border-border bg-bg-elevated opacity-60",
        !isHiddenStop && !isAfterHidden && "bg-bg-elevated border-border"
      )}
    >
      {isAfterHidden && (
        <div className="bg-danger/10 border border-danger/30 rounded p-2 text-xs text-danger flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>
            <strong>Pax NÃO embarca neste segmento</strong> — destino real é {hiddenDestinoIata || "—"} (Hidden City)
          </span>
        </div>
      )}
      {/* Linha 1: Voo N + Companhia + Numero voo + Duração */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {totalSegmentos > 1 && (
            <span className="bg-bg-elevated text-text-primary px-2 py-0.5 rounded text-xs font-bold flex-shrink-0">
              VOO {segmentoIdx + 1}
            </span>
          )}
          <Input
            value={segmento.companhia || ""}
            onChange={(e) => onUpdate(trechoIdx, segmentoIdx, "companhia", e.target.value)}
            placeholder="Companhia"
            className="h-8 max-w-[200px]"
          />
          <Input
            value={segmento.numero_voo || ""}
            onChange={(e) => onUpdate(trechoIdx, segmentoIdx, "numero_voo", e.target.value)}
            className="h-8 w-28 text-xs font-mono"
            placeholder="LA3210"
          />
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={segmento.duracao || ""}
            onChange={(e) => onUpdate(trechoIdx, segmentoIdx, "duracao", e.target.value)}
            placeholder="1h 55min"
            className={cn(
              "h-7 w-24 text-xs font-mono text-center",
              !segmento._duracao_manual && segmento.duracao && "bg-muted/40"
            )}
          />
          {totalSegmentos > 1 && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-danger hover:text-danger"
              onClick={onRemove}
              title="Remover segmento"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Linha 2: Origem → Destino visual */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
        {/* ORIGEM */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Input
              value={segmento.origem_iata || ""}
              onChange={(e) => onUpdate(trechoIdx, segmentoIdx, "origem_iata", e.target.value.toUpperCase())}
              maxLength={3}
              className="h-9 w-16 text-base font-semibold text-center font-mono"
              placeholder="ORG"
            />
            <Input
              type="time"
              value={segmento.horario_saida || ""}
              onChange={(e) => onUpdate(trechoIdx, segmentoIdx, "horario_saida", e.target.value)}
              className="h-9 flex-1 font-mono"
            />
          </div>
          <Input
            value={segmento.origem_cidade || ""}
            onChange={(e) => onUpdate(trechoIdx, segmentoIdx, "origem_cidade", e.target.value)}
            placeholder="Cidade origem"
            className="h-7 text-xs"
          />
          <Input
            type="date"
            value={segmento.data_saida || ""}
            onChange={(e) => onUpdate(trechoIdx, segmentoIdx, "data_saida", e.target.value || null)}
            className="h-7 text-xs"
          />
        </div>

        {/* SETA central */}
        <div className="flex flex-col items-center px-2 pt-2">
          <Plane className="w-5 h-5 text-text-muted rotate-90" />
          {showNextDayBadge && (
            <span
              className="text-[10px] text-warning font-bold bg-warning/10 px-2 py-0.5 rounded-full mt-1 whitespace-nowrap"
              title="Este voo chega no dia seguinte ao da saída"
            >
              ⚠️ +1 dia
            </span>
          )}
        </div>

        {/* DESTINO */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Input
              type="time"
              value={segmento.horario_chegada || ""}
              onChange={(e) => onUpdate(trechoIdx, segmentoIdx, "horario_chegada", e.target.value)}
              className="h-9 flex-1 font-mono"
            />
            <Input
              value={segmento.destino_iata || ""}
              onChange={(e) => onUpdate(trechoIdx, segmentoIdx, "destino_iata", e.target.value.toUpperCase())}
              maxLength={3}
              className="h-9 w-16 text-base font-semibold text-center font-mono"
              placeholder="DST"
            />
          </div>
          <Input
            value={segmento.destino_cidade || ""}
            onChange={(e) => onUpdate(trechoIdx, segmentoIdx, "destino_cidade", e.target.value)}
            placeholder="Cidade destino"
            className="h-7 text-xs"
          />
          <Input
            type="date"
            value={segmento.data_chegada || ""}
            onChange={(e) => onUpdate(trechoIdx, segmentoIdx, "data_chegada", e.target.value || null)}
            className="h-7 text-xs"
          />
        </div>
      </div>

      {/* Checkbox Hidden City — só se houver escala (totalSegmentos > 1) e este
          NÃO é o último segmento, e não está sob outro hidden stop. */}
      {totalSegmentos > 1 && !isAfterHidden && segmentoIdx < totalSegmentos - 1 && (
        <div className="pt-2 border-t border-border">
          <label className="flex items-start gap-2 cursor-pointer">
            <Checkbox
              checked={isHiddenStop}
              onCheckedChange={(checked) =>
                onUpdate(trechoIdx, segmentoIdx, "is_hidden_city_stop", !!checked)
              }
              className="mt-0.5"
            />
            <div>
              <p className="text-xs font-semibold text-accent">
                ✈️ Hidden City — pax desce em {segmento.destino_iata || "—"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Marque se este é o destino real. Os segmentos seguintes deste trecho serão descartados.
              </p>
            </div>
          </label>
        </div>
      )}
    </div>
  );
}

// ─── Helpers Hidden City ───────────────────────────────────────────
// Retorna apenas os segmentos efetivos do trecho (até o segmento marcado
// como is_hidden_city_stop, inclusive). Se não houver hidden stop, retorna
// todos os segmentos.
function getEffectiveSegments(trecho) {
  const segmentos = (trecho && Array.isArray(trecho.segmentos)) ? trecho.segmentos : [];
  const hiddenIdx = segmentos.findIndex((s) => s && s.is_hidden_city_stop);
  if (hiddenIdx === -1) return segmentos;
  return segmentos.slice(0, hiddenIdx + 1);
}

function HiddenCitySummary({ trechos }) {
  const trechoIda = trechos?.find((t) => t.tipo === "ida") || trechos?.[0];
  if (!trechoIda) return null;
  const segs = getSegmentos(trechoIda);
  if (segs.length === 0) return null;
  const effectiveIda = getEffectiveSegments(trechoIda);
  const origemReal = effectiveIda[0] || segs[0];
  const destinoReal = effectiveIda[effectiveIda.length - 1] || segs[segs.length - 1];
  const isHiddenCity = (trechos || []).some((t) =>
    (t.segmentos || []).some((s) => s.is_hidden_city_stop)
  );
  if (!origemReal?.origem_iata && !destinoReal?.destino_iata) return null;

  return (
    <Card className="bg-bg-elevated text-text-primary border-border-strong">
      <CardContent className="p-4">
        <p className="text-[10px] uppercase tracking-wider text-warning font-bold mb-2">
          Destino real do passageiro
        </p>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-2xl font-semibold leading-none">{origemReal?.origem_iata || "—"}</p>
            <p className="text-xs text-text-muted mt-1 truncate">{origemReal?.origem_cidade || ""}</p>
          </div>
          <div className="text-2xl text-text-muted">→</div>
          <div className="text-right min-w-0">
            <p className="text-2xl font-semibold leading-none">{destinoReal?.destino_iata || "—"}</p>
            <p className="text-xs text-text-muted mt-1 truncate">{destinoReal?.destino_cidade || ""}</p>
          </div>
        </div>
        {isHiddenCity && (
          <div className="mt-3 pt-3 border-t border-white/15 text-xs text-warning flex items-start gap-2">
            <span>🎯</span>
            <span>
              Esta é uma cotação <strong>Hidden City</strong> — o pax usa o bilhete somente até a escala marcada e os trechos seguintes são descartados.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Bloco 3 — Itinerário ───────────────────────────────────────────
function BlocoItinerario({ formData, setFormData }) {
  const fileInputRef = useRef(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [justPasted, setJustPasted] = useState(false);
  const { toast } = useToast();

  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

  const handleFiles = (files) => {
    const accepted = ["image/png", "image/jpeg", "image/webp"];
    const list = Array.from(files || []).filter((f) => accepted.includes(f.type));
    setFormData((p) => ({
      ...p,
      flight_images: [...p.flight_images, ...list].slice(0, 4),
    }));
  };

  const removeImage = (idx) => {
    setFormData((p) => ({
      ...p,
      flight_images: p.flight_images.filter((_, i) => i !== idx),
    }));
  };

  const onDrop = (e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer?.files);
  };

  // Suporte a colar imagens (Ctrl+V / Cmd+V)
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles = [];
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }

      if (imageFiles.length === 0) return;

      e.preventDefault();
      setFormData((prev) => {
        const current = prev.flight_images || [];
        const next = [...current, ...imageFiles].slice(0, 4);
        return { ...prev, flight_images: next };
      });

      setJustPasted(true);
      setTimeout(() => setJustPasted(false), 2000);
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [setFormData]);

  const PROMPT_EXTRACAO = `Analise as imagens de voos fornecidas e extraia TODAS as informações visíveis de TODOS os trechos (ida e volta se houver).

Para CADA TRECHO (ida e volta separados), liste TODOS os segmentos individualmente. Um voo com 1 escala = 2 segmentos. Com 2 escalas = 3 segmentos. Cada segmento é um voo entre dois aeroportos.

Retorne APENAS um JSON válido, sem markdown, sem backticks, neste formato exato:
{
  "trechos": [
    {
      "tipo": "ida" ou "volta",
      "classe": "Econômica" | "Premium Economy" | "Executiva" | "Primeira",
      "escalas": <numero_de_paradas>,
      "segmentos": [
        {
          "numero_voo": "LA3210",
          "companhia": "LATAM",
          "origem_iata": "BSB",
          "origem_cidade": "Brasília",
          "destino_iata": "GRU",
          "destino_cidade": "São Paulo",
          "horario_saida": "14:30",
          "horario_chegada": "16:25",
          "data_saida": "2026-05-15",
          "data_chegada": "2026-05-15",
          "duracao": "1h 55min"
        }
      ],
      "tempo_total": "17h 00min",
      "tempo_escalas": [
        { "aeroporto": "GRU", "duracao": "3h 20min" }
      ]
    }
  ]
}

REGRAS CRÍTICAS:

1. COMPANHIA POR SEGMENTO:
   - Se a ida tem 2 segmentos com operadores diferentes (BA + LATAM), liste cada um com sua companhia.
   - Nunca generalize um operador para todos os segmentos.

2. AEROPORTOS DE ESCALA:
   - O destino_iata de um segmento = origem_iata do próximo segmento.
   - NUNCA concatene aeroportos como "LHR / GRU" no campo aeroporto_escala — use o array segmentos.
   - Cada aeroporto de escala vira destino de um segmento e origem do próximo.

3. DIA SEGUINTE (campos data_saida / data_chegada) — REGRAS OBRIGATÓRIAS:

   3.1. INDICADORES VISUAIS EXPLÍCITOS (prioridade máxima):
        - "+1", "+1d", "(+1)", "+2d" próximos ao horário de chegada
        - "Próximo dia", "Dia seguinte", "Next day"
        - Datas diferentes visíveis (ex: saída "15/05", chegada "16/05")
        - Setinhas ou ícones de calendário ao lado do horário

   3.2. INDICADORES IMPLÍCITOS (quando não há nada visual):
        - Voo internacional: duração >= 6h E chegada < saída → dia seguinte
        - Voo doméstico longo: duração >= 4h E chegada < saída → dia seguinte
        - Voo noturno (saída 20h-23h59) chegando entre 00h-12h → dia seguinte

   3.3. PREENCHIMENTO:
        - data_saida: data em que o voo decola (formato YYYY-MM-DD)
        - data_chegada: data em que o voo pousa (pode ser +1, +2 dependendo da duração)
        - Se NÃO for possível determinar a data exata mas há indicador de dia seguinte,
          retorne null nos campos data_* MAS adicione "+1d" no final de horario_chegada
          (ex: "08:30+1d"). O sistema interpreta esse sufixo.

   3.4. CONFLITOS:
        - Se há indicador visual de "+1" mas a duração calculada não bate, CONFIE no indicador visual.
        - Datas explícitas no print são SEMPRE a fonte mais confiável.

   3.5. SEGMENTOS COM ESCALA:
        - Cada segmento tem suas próprias data_saida / data_chegada.
        - O primeiro segmento começa na data inicial da viagem.
        - Cada segmento subsequente começa na data_chegada do anterior
          (ou +1 se a escala atravessa meia-noite).

4. TEMPOS:
   - "duracao" do segmento = só o tempo desse voo.
   - "tempo_total" do trecho = soma de todos os voos + esperas (ida ou volta completa).
   - "tempo_escalas" = uma entrada por escala (aeroporto onde ocorre + duração da espera). length = segmentos.length - 1.

5. MÚLTIPLAS OPÇÕES NA MESMA IMAGEM:
   - Se houver várias opções de voo, retorne apenas a opção selecionada/destacada ou a primeira visível.

Retorne APENAS o JSON, sem markdown nem comentários.`;

  const processarItinerario = async () => {
    if (!apiKey) {
      setError("Configure VITE_ANTHROPIC_API_KEY no .env");
      return;
    }
    if (formData.flight_images.length === 0) return;
    setProcessing(true);
    setError("");
    try {
      const content = [];
      for (const file of formData.flight_images) {
        const data = await toBase64(file);
        content.push({
          type: "image",
          source: { type: "base64", media_type: file.type, data },
        });
      }
      content.push({ type: "text", text: PROMPT_EXTRACAO });

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1500,
          messages: [{ role: "user", content }],
        }),
      });
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`${response.status}: ${body}`);
      }
      const data = await response.json();
      const raw = data.content[0].text.trim();
      const jsonText = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
      const parsed = JSON.parse(jsonText);
      // Normaliza horários "08:30+1d" → time + data_chegada ajustada, encadeia datas entre segmentos.
      const normalized = normalizeItinerary(parsed);
      setFormData((p) => {
        const baseBag = p.baggage || { personal: 1, carry_on: 1, checked: 0 };
        const trechos = (normalized.trechos || []).map((t) => {
          const segmentos =
            Array.isArray(t.segmentos) && t.segmentos.length > 0
              ? t.segmentos
              : [createLegacySegment(t)];
          const baseTrecho = {
            tipo: t.tipo || "ida",
            classe: t.classe || "Econômica",
            baggage: t.baggage || {
              personal: baseBag.personal ?? 1,
              carry_on: baseBag.carry_on ?? 0,
              checked: baseBag.checked ?? 0,
            },
            segmentos,
            tempo_total: t.tempo_total || t.duracao || "",
            tempo_escalas: Array.isArray(t.tempo_escalas) ? t.tempo_escalas : [],
            aeroporto_escala: t.aeroporto_escala || "",
            tempo_escala: t.tempo_escala || "",
          };
          return syncTrechoFromSegmentos(baseTrecho);
        });
        return { ...p, itinerary: { trechos }, itinerary_reviewed: false };
      });
      toast({ title: "Itinerário extraído", description: `${normalized.trechos?.length || 0} trecho(s) detectado(s)` });
    } catch (e) {
      console.error(e);
      setError(`Erro ao processar imagens: ${e.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // Atualiza atributo top-level do trecho (classe, tipo, etc).
  const updateTrecho = (idx, field, value) => {
    setFormData((p) => {
      const trechos = [...p.itinerary.trechos];
      const patch = { [field]: value };
      trechos[idx] = syncTrechoFromSegmentos({ ...trechos[idx], ...patch });
      return { ...p, itinerary: { trechos }, itinerary_reviewed: false };
    });
  };

  // Atualiza campo dentro de um segmento específico.
  const updateSegmento = (trechoIdx, segIdx, field, value) => {
    setFormData((p) => {
      const trechos = [...p.itinerary.trechos];
      const trecho = { ...trechos[trechoIdx] };
      const segmentos = [...getSegmentos(trecho)];
      const segPatch = { [field]: value };
      if (field === "duracao") segPatch._duracao_manual = true;
      // Hidden City exclusivo: ao marcar um segmento como destino real,
      // desmarca qualquer outro segmento do mesmo trecho que estivesse marcado.
      if (field === "is_hidden_city_stop" && value === true) {
        for (let i = 0; i < segmentos.length; i++) {
          if (i !== segIdx && segmentos[i].is_hidden_city_stop) {
            segmentos[i] = { ...segmentos[i], is_hidden_city_stop: false };
          }
        }
      }
      segmentos[segIdx] = { ...segmentos[segIdx], ...segPatch };
      trecho.segmentos = segmentos;
      trechos[trechoIdx] = syncTrechoFromSegmentos(trecho);
      return { ...p, itinerary: { trechos }, itinerary_reviewed: false };
    });
  };

  const addSegmento = (trechoIdx) => {
    setFormData((p) => {
      const trechos = [...p.itinerary.trechos];
      const trecho = { ...trechos[trechoIdx] };
      const segmentos = [...getSegmentos(trecho)];
      const last = segmentos[segmentos.length - 1];
      segmentos.push({
        numero_voo: "",
        companhia: last?.companhia || "",
        origem_iata: last?.destino_iata || "",
        origem_cidade: last?.destino_cidade || "",
        destino_iata: "",
        destino_cidade: "",
        horario_saida: "",
        horario_chegada: "",
        data_saida: last?.data_chegada || null,
        data_chegada: null,
        duracao: "",
      });
      trecho.segmentos = segmentos;
      // Atualiza array de escalas para preservar tamanho consistente.
      const tempoEscalas = Array.isArray(trecho.tempo_escalas)
        ? [...trecho.tempo_escalas]
        : [];
      tempoEscalas[segmentos.length - 2] = tempoEscalas[segmentos.length - 2] || {
        aeroporto: last?.destino_iata || "",
        duracao: "",
      };
      trecho.tempo_escalas = tempoEscalas;
      trechos[trechoIdx] = syncTrechoFromSegmentos(trecho);
      return { ...p, itinerary: { trechos }, itinerary_reviewed: false };
    });
  };

  const removeSegmento = (trechoIdx, segIdx) => {
    setFormData((p) => {
      const trechos = [...p.itinerary.trechos];
      const trecho = { ...trechos[trechoIdx] };
      const segmentos = getSegmentos(trecho).filter((_, i) => i !== segIdx);
      if (segmentos.length === 0) {
        // Mantém pelo menos um segmento vazio
        segmentos.push(createLegacySegment({}));
      }
      trecho.segmentos = segmentos;
      // Remove o tempo de escala correspondente (se removeu segmento, escala adjacente some)
      if (Array.isArray(trecho.tempo_escalas)) {
        const tempoEscalas = [...trecho.tempo_escalas];
        // remove na posição segIdx-1 se segIdx>0, senão na posição 0
        const idxToRemove = segIdx > 0 ? segIdx - 1 : 0;
        tempoEscalas.splice(idxToRemove, 1);
        trecho.tempo_escalas = tempoEscalas;
      }
      trechos[trechoIdx] = syncTrechoFromSegmentos(trecho);
      return { ...p, itinerary: { trechos }, itinerary_reviewed: false };
    });
  };

  const updateTempoEscala = (trechoIdx, escalaIdx, value) => {
    setFormData((p) => {
      const trechos = [...p.itinerary.trechos];
      const trecho = { ...trechos[trechoIdx] };
      const segmentos = getSegmentos(trecho);
      const tempoEscalas = Array.isArray(trecho.tempo_escalas)
        ? [...trecho.tempo_escalas]
        : [];
      const aeroporto =
        tempoEscalas[escalaIdx]?.aeroporto ||
        segmentos[escalaIdx]?.destino_iata ||
        "";
      tempoEscalas[escalaIdx] = { aeroporto, duracao: value };
      trecho.tempo_escalas = tempoEscalas;
      trechos[trechoIdx] = syncTrechoFromSegmentos(trecho);
      return { ...p, itinerary: { trechos }, itinerary_reviewed: false };
    });
  };

  // Recalcula duração de cada segmento automaticamente quando saída/chegada/datas mudam
  // (a menos que o vendedor já tenha editado a duração manualmente)
  const segmentosTimeKey = (formData.itinerary?.trechos || [])
    .flatMap((t, ti) =>
      getSegmentos(t).map(
        (s, si) =>
          `${ti}.${si}:${s.horario_saida || ""}~${s.horario_chegada || ""}~${s.data_saida || ""}~${s.data_chegada || ""}~${s._duracao_manual ? "m" : "a"}`
      )
    )
    .join("|");
  useEffect(() => {
    setFormData((p) => {
      const trechos = p.itinerary?.trechos || [];
      let changed = false;
      const next = trechos.map((t) => {
        const segmentos = getSegmentos(t);
        const updatedSegs = segmentos.map((s) => {
          if (s._duracao_manual) return s;
          if (!s.horario_saida || !s.horario_chegada) return s;
          // Usa cálculo consciente de datas — voos noturnos com data_chegada
          // explícita resultam em duração correta (não soma 24h indevidamente).
          const dur = calculateSegmentDuration(s);
          if (dur && dur !== s.duracao) {
            changed = true;
            return { ...s, duracao: dur };
          }
          return s;
        });
        if (updatedSegs === segmentos) return t;
        return syncTrechoFromSegmentos({ ...t, segmentos: updatedSegs });
      });
      if (!changed) return p;
      return { ...p, itinerary: { ...p.itinerary, trechos: next } };
    });
  }, [segmentosTimeKey]);

  const addTrechoManual = () => {
    setFormData((p) => {
      const baseBag = p.baggage || { personal: 1, carry_on: 1, checked: 0 };
      const novo = syncTrechoFromSegmentos({
        tipo: p.itinerary.trechos.length === 0 ? "ida" : "volta",
        classe: "Econômica",
        baggage: {
          personal: baseBag.personal ?? 1,
          carry_on: baseBag.carry_on ?? 0,
          checked: baseBag.checked ?? 0,
        },
        segmentos: [
          {
            companhia: "", numero_voo: "",
            origem_iata: "", origem_cidade: "",
            destino_iata: "", destino_cidade: "",
            horario_saida: "", horario_chegada: "",
            data_saida: null, data_chegada: null,
            duracao: "",
          },
        ],
        tempo_total: "",
        tempo_escalas: [],
      });
      return {
        ...p,
        itinerary: {
          trechos: [...p.itinerary.trechos, novo],
        },
      };
    });
  };

  const removeTrecho = (idx) => {
    setFormData((p) => ({
      ...p,
      itinerary: { trechos: p.itinerary.trechos.filter((_, i) => i !== idx) },
    }));
  };

  const updateTrechoBaggage = (idx, field, value) => {
    setFormData((p) => {
      const trechos = [...p.itinerary.trechos];
      const cur = trechos[idx] || {};
      const baseBag = p.baggage || { personal: 1, carry_on: 1, checked: 0 };
      trechos[idx] = {
        ...cur,
        baggage: {
          personal: cur.baggage?.personal ?? baseBag.personal ?? 1,
          carry_on: cur.baggage?.carry_on ?? baseBag.carry_on ?? 0,
          checked: cur.baggage?.checked ?? baseBag.checked ?? 0,
          [field]: value,
        },
      };
      return { ...p, itinerary: { ...p.itinerary, trechos }, itinerary_reviewed: false };
    });
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* 3A - Tipo de Bilhete */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Tipo de Bilhete</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={formData.ticket_type}
              onValueChange={(v) => setFormData((p) => ({ ...p, ticket_type: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TICKET_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <div className="flex items-center gap-2">
                      <span>{t.value}</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>{t.help}</TooltipContent>
                      </Tooltip>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              {TICKET_TYPES.find((t) => t.value === formData.ticket_type)?.help}
            </p>
          </CardContent>
        </Card>

        {/* 3B - Upload */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Imagens do Itinerário (até 4)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Envie prints dos voos encontrados. Se ida e volta estiverem em imagens separadas, envie ambas.
              Se estiverem na mesma imagem, envie apenas uma.
            </p>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              className={cn(
                "flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all",
                justPasted
                  ? "border-success/30 bg-success/10 dark:bg-success/10"
                  : "border-border hover:border-primary/40 hover:bg-muted/30"
              )}
            >
              {justPasted ? (
                <>
                  <Check className="h-7 w-7 text-success" />
                  <p className="text-sm font-semibold text-success dark:text-success">
                    ✓ Imagem colada com sucesso!
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <ClipboardPaste className="h-7 w-7 text-muted-foreground/60" />
                    <ImagePlus className="h-7 w-7 text-muted-foreground/60" />
                  </div>
                  <p className="text-sm font-medium">
                    Cole (Ctrl+V), arraste ou clique para adicionar
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPEG ou WebP · Até 4 imagens
                  </p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            {formData.flight_images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {formData.flight_images.map((file, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`upload-${idx}`}
                      className="w-full h-24 object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 h-6 w-6 rounded-full bg-danger text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Button
              onClick={processarItinerario}
              disabled={processing || formData.flight_images.length === 0}
              className="w-full bg-warning hover:bg-warning text-white gap-2"
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {processing ? "Analisando imagens do voo..." : "Processar Itinerário"}
            </Button>
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-danger/10 border border-danger/30 text-sm">
                <AlertTriangle className="h-4 w-4 text-danger shrink-0 mt-0.5" />
                <span className="text-danger">{error}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3C - Datas */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Datas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dep">Data de Ida *</Label>
                <Input
                  id="dep"
                  type="date"
                  value={formData.departure_date}
                  onChange={(e) => setFormData((p) => ({ ...p, departure_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ret" className={cn(formData.one_way && "text-muted-foreground/50")}>
                  Data de Volta
                </Label>
                <Input
                  id="ret"
                  type="date"
                  value={formData.return_date}
                  disabled={formData.one_way}
                  onChange={(e) => setFormData((p) => ({ ...p, return_date: e.target.value }))}
                />
                <div className="flex items-center gap-2 pt-1">
                  <Checkbox
                    id="oneway"
                    checked={formData.one_way}
                    onCheckedChange={(c) =>
                      setFormData((p) => ({ ...p, one_way: !!c, return_date: c ? "" : p.return_date }))
                    }
                  />
                  <Label htmlFor="oneway" className="text-xs cursor-pointer text-muted-foreground">
                    Somente ida
                  </Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3D - Passageiros e Bagagem */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Passageiros e Bagagem</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 max-w-xs">
              <Label htmlFor="pax">Quantidade de passageiros</Label>
              <Input
                id="pax"
                type="number"
                min={1}
                value={formData.passengers}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, passengers: Math.max(1, parseInt(e.target.value) || 1) }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Bagagem incluída</Label>
              <div className="space-y-2">
                {[
                  { key: "personal", label: "🎒 Artigo pessoal (mochila/bolsa)", max: 1 },
                  { key: "carry_on", label: "🎒 Bagagem de mão (10kg)", max: 5 },
                  { key: "checked", label: "🧳 Bagagem despachada (23kg)", max: 5 },
                ].map((b) => {
                  const value = Number(formData.baggage[b.key]) || 0;
                  return (
                    <div
                      key={b.key}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border bg-muted/20"
                    >
                      <span className="text-sm">{b.label}</span>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() =>
                            setFormData((p) => ({
                              ...p,
                              baggage: { ...p.baggage, [b.key]: Math.max(0, value - 1) },
                            }))
                          }
                          disabled={value <= 0}
                        >
                          −
                        </Button>
                        <span className="w-8 text-center font-bold tabular-nums">
                          {String(value).padStart(2, "0")}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() =>
                            setFormData((p) => ({
                              ...p,
                              baggage: { ...p.baggage, [b.key]: Math.min(b.max, value + 1) },
                            }))
                          }
                          disabled={value >= b.max}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3E - Revisão dos Trechos */}
        <Card className="border-border/50">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              Revisão do Itinerário
              {formData.itinerary_reviewed && (
                <Badge className="bg-success hover:bg-success gap-1">
                  <Check className="h-3 w-3" /> Revisado
                </Badge>
              )}
            </CardTitle>
            <Button size="sm" variant="outline" onClick={addTrechoManual} className="gap-1">
              <Plus className="h-3.5 w-3.5" /> Adicionar trecho
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.itinerary.trechos.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhum trecho ainda. Processe as imagens ou adicione manualmente.
              </p>
            )}

            {/* Destino real declarado — exibe sempre que houver trecho de IDA */}
            <HiddenCitySummary trechos={formData.itinerary.trechos} />

            {formData.itinerary.trechos.map((t, idx) => {
              const isIda = t.tipo === "ida";
              const segmentos = getSegmentos(t);
              const Icon = isIda ? PlaneTakeoff : PlaneLanding;
              return (
                <Card
                  key={idx}
                  className={cn(
                    "shadow-sm overflow-hidden border-l-4",
                    isIda ? "border-l-red-500" : "border-l-blue-500"
                  )}
                >
                  {/* Header do trecho */}
                  <div
                    className={cn(
                      "px-5 py-3 flex items-center justify-between gap-2 flex-wrap",
                      isIda ? "bg-danger/10" : "bg-accent/10"
                    )}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <Icon className={cn("w-5 h-5", isIda ? "text-danger" : "text-accent")} />
                      <h3
                        className={cn(
                          "font-bold text-base uppercase tracking-wider",
                          isIda ? "text-danger" : "text-accent"
                        )}
                      >
                        {isIda ? "IDA" : "VOLTA"}
                      </h3>
                      {(t.escalas || 0) === 0 ? (
                        <Badge variant="outline" className="text-success border-success/30 bg-success/10">
                          Voo direto
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-warning border-warning/30">
                          {t.escalas} {t.escalas === 1 ? "escala" : "escalas"}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Input
                        value={t.tempo_total || ""}
                        onChange={(e) => updateTrecho(idx, "tempo_total", e.target.value)}
                        placeholder="Tempo total"
                        className="h-7 w-32 text-xs"
                      />
                      <Button size="icon" variant="ghost" onClick={() => removeTrecho(idx)} title="Remover trecho">
                        <Trash2 className="h-4 w-4 text-danger" />
                      </Button>
                    </div>
                  </div>

                  <CardContent className="p-5 space-y-3">
                    {(() => {
                      // Pré-computa: tem hidden city neste trecho? Qual segmento marca o destino real?
                      const hiddenIdx = segmentos.findIndex((s) => s.is_hidden_city_stop);
                      const hiddenDestinoIata =
                        hiddenIdx !== -1 ? segmentos[hiddenIdx].destino_iata : "";
                      return segmentos.map((seg, segIdx) => {
                      const proximo = segmentos[segIdx + 1];
                      const escalaPernoita = !!(
                        proximo &&
                        seg.data_chegada &&
                        proximo.data_saida &&
                        seg.data_chegada !== proximo.data_saida
                      );
                      const isHiddenStop = !!seg.is_hidden_city_stop;
                      const isAfterHidden = hiddenIdx !== -1 && segIdx > hiddenIdx;
                      return (
                        <Fragment key={segIdx}>
                          <SegmentoCard
                            segmento={seg}
                            segmentoIdx={segIdx}
                            trechoIdx={idx}
                            totalSegmentos={segmentos.length}
                            onUpdate={updateSegmento}
                            onRemove={() => removeSegmento(idx, segIdx)}
                            isHiddenStop={isHiddenStop}
                            isAfterHidden={isAfterHidden}
                            hiddenDestinoIata={hiddenDestinoIata}
                          />
                          {segIdx < segmentos.length - 1 && (
                            <div className="my-1 flex items-center gap-3 pl-2">
                              <div
                                className={cn(
                                  "flex-1 border-t-2 border-dashed",
                                  escalaPernoita ? "border-danger/30" : "border-warning/30",
                                )}
                              />
                              <div
                                className={cn(
                                  "px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 border",
                                  escalaPernoita
                                    ? "bg-danger/10 text-danger border-danger/30"
                                    : "bg-warning/10 text-warning border-warning/30",
                                )}
                                title={
                                  escalaPernoita
                                    ? "A escala atravessa a meia-noite — o passageiro pernoita no aeroporto/cidade."
                                    : "Escala curta no mesmo dia."
                                }
                              >
                                <span>{escalaPernoita ? "🌙" : "⏳"}</span>
                                <span>
                                  {escalaPernoita ? "Pernoite" : "Escala"} em {seg.destino_iata || "—"}
                                </span>
                                <Input
                                  value={t.tempo_escalas?.[segIdx]?.duracao || ""}
                                  onChange={(e) => updateTempoEscala(idx, segIdx, e.target.value)}
                                  placeholder="5h 05min"
                                  className={cn(
                                    "h-6 w-24 text-xs px-2 py-0 bg-bg-surface",
                                    escalaPernoita ? "border-danger/30" : "border-warning/30",
                                  )}
                                />
                              </div>
                              <div
                                className={cn(
                                  "flex-1 border-t-2 border-dashed",
                                  escalaPernoita ? "border-danger/30" : "border-warning/30",
                                )}
                              />
                            </div>
                          )}
                        </Fragment>
                      );
                    });
                    })()}

                    <div className="flex justify-center pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addSegmento(idx)}
                        className="gap-1 text-xs"
                      >
                        <Plus className="h-3.5 w-3.5" /> Adicionar segmento (escala)
                      </Button>
                    </div>

                    {formData.ticket_type === "Quebra de Trecho" && (
                      <div className="mt-4 pt-4 border-t border-border space-y-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                            Classe
                          </Label>
                          <Select
                            value={t.classe || "Econômica"}
                            onValueChange={(v) => updateTrecho(idx, "classe", v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Econômica">Econômica</SelectItem>
                              <SelectItem value="Premium Economy">Premium Economy</SelectItem>
                              <SelectItem value="Executiva">Executiva</SelectItem>
                              <SelectItem value="Primeira">Primeira</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                            Franquia de bagagem deste trecho
                          </Label>
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { key: "personal", label: "🎒 Artigo pessoal", max: 1 },
                              { key: "carry_on", label: "🎒 Mão (10kg)", max: 5 },
                              { key: "checked", label: "🧳 Despachada (23kg)", max: 5 },
                            ].map((b) => {
                              const val = Number(t.baggage?.[b.key]) || 0;
                              return (
                                <div
                                  key={b.key}
                                  className="rounded-lg border border-border bg-muted/30 p-3"
                                >
                                  <div className="text-[11px] text-muted-foreground mb-2">{b.label}</div>
                                  <div className="flex items-center justify-between">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => updateTrechoBaggage(idx, b.key, Math.max(0, val - 1))}
                                      disabled={val <= 0}
                                    >
                                      −
                                    </Button>
                                    <span className="font-bold tabular-nums">
                                      {String(val).padStart(2, "0")}
                                    </span>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => updateTrechoBaggage(idx, b.key, Math.min(b.max, val + 1))}
                                      disabled={val >= b.max}
                                    >
                                      +
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {formData.itinerary.trechos.length > 0 && !formData.itinerary_reviewed && (
              <Button
                variant="outline"
                onClick={() => setFormData((p) => ({ ...p, itinerary_reviewed: true }))}
                className="w-full gap-2 border-success/30 text-success hover:bg-success/10"
              >
                <Check className="h-4 w-4" /> Confirmar revisão do itinerário
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

// ─── Bloco 4 — Precificação ─────────────────────────────────────────
function BlocoPrecificacao({ formData, setFormData }) {
  const [milesTable, setMilesTable] = useState([]);
  // Moeda da operação: BRL (padrão) ou EUR (compra/venda em euro).
  // Quando EUR, os inputs aceitam euro e o sistema converte para BRL
  // via cotação ao vivo da AwesomeAPI — BRL é a moeda canônica do banco.
  const [currency, setCurrency] = useState(formData.pricing?.currency || "BRL");
  const { rate: eurBrlRate } = useEurBrlRate();
  const eurRate = eurBrlRate?.rate || 0;
  const isEur = currency === "EUR";

  useEffect(() => {
    (async () => {
      const list = await localClient.entities.MilesTable.list();
      setMilesTable(list || []);
    })();
  }, []);

  // Persiste a moeda escolhida e a cotação no pricing — usado por persistQuote,
  // PDF e relatórios. Atualiza apenas se mudou (evita loop).
  useEffect(() => {
    setFormData((prev) => {
      const p = prev.pricing || {};
      const sameCurrency = (p.currency || "BRL") === currency;
      const sameRate = isEur && Math.abs((Number(p.exchange_rate_eur_brl) || 0) - eurRate) < 0.0001;
      if (sameCurrency && (!isEur || sameRate)) return prev;
      return {
        ...prev,
        pricing: {
          ...p,
          currency,
          ...(isEur && eurRate > 0 ? {
            exchange_rate_eur_brl: eurRate,
            exchange_rate_snapshot_at: new Date().toISOString(),
          } : {}),
        },
      };
    });
  }, [currency, eurRate, isEur, setFormData]);

  // Helpers para inputs em EUR — converte do EUR digitado para BRL armazenado.
  // Mantém também o snapshot em EUR (cost_eur, tax_eur, sale_value_eur) para
  // exibição no PDF e auditoria do valor original cotado pelo vendedor.
  const setEurField = (eurField, brlField, eurValue) => {
    const eur = parseFloat(String(eurValue).replace(",", ".")) || 0;
    const brl = eurRate > 0 ? eur * eurRate : 0;
    setFormData((prev) => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        [eurField]: eur,
        [brlField]: brl ? brl.toFixed(2).replace(".", ",") : "",
      },
    }));
  };

  const isSplit = formData.ticket_type === "Quebra de Trecho";
  const isParceiroMode = formData.recipient_type === "parceiro";
  const isMultiProgram = formData.pricing?.multi_program === true;
  const trechosCount = (formData.itinerary?.trechos || []).length;
  // Multi-programa só faz sentido em IDA+VOLTA fora de Quebra de Trecho
  const canMultiProgram = !isSplit && trechosCount >= 2;

  // Achata trechos × segmentos em "unidades de emissão" para Quebra de Trecho.
  // Cada segmento (voo individual) vira um card de precificação separado, o
  // que generaliza o caso só-ida-com-conexão (1 trecho × 2 segs = 2 cards) e
  // mantém ida+volta single-segment (2 trechos × 1 seg cada = 2 cards).
  const splitUnits = useMemo(() => {
    const itinTrechos = formData.itinerary?.trechos || [];
    const units = [];
    for (const trecho of itinTrechos) {
      const segs = Array.isArray(trecho.segmentos) && trecho.segmentos.length > 0
        ? trecho.segmentos
        : [trecho];
      segs.forEach((seg, segIdx) => {
        const tipoLabel = trecho.tipo === "ida" ? "Ida" : "Volta";
        const segSuffix = segs.length > 1 ? ` ${segIdx + 1}` : "";
        const origem = seg.origem_iata || trecho.origem_iata || "?";
        const destino = seg.destino_iata || trecho.destino_iata || "?";
        units.push({
          key: `${trecho.tipo || "ida"}-${segIdx}`,
          tipo: trecho.tipo || "ida",
          segIdx,
          label: `${tipoLabel}${segSuffix} — ${origem} → ${destino}`,
        });
      });
    }
    return units;
  }, [formData.itinerary]);

  // Quebra de Trecho: requer ≥2 voos totais (segmentos) — inclui só-ida-com-conexão.
  const totalVoos = splitUnits.length;
  const elegivelQuebraTrecho = totalVoos >= 2;

  // Inicialização automática do modo split conforme ticket_type / itinerário.
  useEffect(() => {
    if (isSplit) {
      setFormData((prev) => {
        const existing = prev.pricing?.trechos || [];
        const newTrechos = splitUnits.map((u, idx) => {
          // Preserva entradas anteriores quando a posição/key coincide.
          const prior = existing.find((x) => x.key === u.key) || existing[idx];
          return prior
            ? { ...prior, label: u.label, key: u.key, tipo: u.tipo, segIdx: u.segIdx }
            : {
                key: u.key,
                label: u.label,
                tipo: u.tipo,
                segIdx: u.segIdx,
                type: "milhas",
                program_id: "",
                program_name: "",
                miles_qty: "",
                tax: "",
                cost_brl: "",
                is_azul: false,
                nipon_value: 0,
                cost_total: 0,
              };
        });
        return {
          ...prev,
          pricing: { ...prev.pricing, is_split: true, trechos: newTrechos },
        };
      });
    } else {
      setFormData((prev) => {
        if (!prev.pricing?.is_split && !prev.pricing?.trechos) return prev;
        const next = { ...prev.pricing, is_split: false };
        delete next.trechos;
        delete next.total_nipon;
        delete next.total_cost;
        return { ...prev, pricing: next };
      });
    }
     
  }, [isSplit, totalVoos, splitUnits.map((u) => u.key).join("|")]);

  // Multi-programa só faz sentido enquanto !isSplit. Se mudar pra split, limpa.
  useEffect(() => {
    if (!canMultiProgram && isMultiProgram) {
      setFormData((prev) => {
        const next = { ...prev.pricing, multi_program: false };
        delete next.trechos_pricing;
        return { ...prev, pricing: next };
      });
    }
     
  }, [canMultiProgram]);

  // Sincroniza trechos_pricing com os trechos do itinerário (mantém ordem,
  // preserva entradas já preenchidas, cria placeholders para novos).
  useEffect(() => {
    if (!isMultiProgram) return;
    const trechosItin = formData.itinerary?.trechos || [];
    setFormData((prev) => {
      const existing = prev.pricing?.trechos_pricing || [];
      const novos = trechosItin.map((t, idx) => {
        const prior = existing.find((x) => x.tipo === t.tipo) || existing[idx];
        return prior
          ? { ...prior, tipo: t.tipo }
          : {
              tipo: t.tipo || "ida",
              program_id: "",
              program_name: "",
              miles_qty: "",
              tax: "",
              cost_per_thousand: 0,
              sale_per_thousand: 0,
              is_azul: false,
            };
      });
      const same =
        existing.length === novos.length &&
        existing.every((e, i) => e.tipo === novos[i].tipo);
      if (same) return prev;
      return { ...prev, pricing: { ...prev.pricing, trechos_pricing: novos } };
    });
     
  }, [isMultiProgram, formData.itinerary?.trechos?.length, formData.itinerary?.trechos?.map((t) => t.tipo).join("|")]);

  const updateMultiTrechoPricing = (idx, patch) => {
    setFormData((prev) => {
      const arr = [...(prev.pricing?.trechos_pricing || [])];
      arr[idx] = { ...arr[idx], ...patch };
      return { ...prev, pricing: { ...prev.pricing, trechos_pricing: arr } };
    });
  };

  const updateTrechoPricing = (idx, updatedTrecho) => {
    setFormData((prev) => {
      const cur = prev.pricing?.trechos || [];
      const newTrechos = [...cur];
      newTrechos[idx] = updatedTrecho;
      const total_nipon = newTrechos.reduce((s, t) => s + (Number(t.nipon_value) || 0), 0);
      const total_cost = newTrechos.reduce((s, t) => s + (Number(t.cost_total) || 0), 0);
      return {
        ...prev,
        pricing: {
          ...prev.pricing,
          is_split: true,
          trechos: newTrechos,
          total_nipon,
          total_cost,
        },
      };
    });
  };

  const setPricing = (patch) =>
    setFormData((p) => ({ ...p, pricing: { ...p.pricing, ...patch } }));

  // Blocos extras de tipo de emissão (vários tipos de tarifa somados).
  const addExtraBlock = () =>
    setFormData((p) => ({
      ...p,
      pricing: {
        ...p.pricing,
        extra_blocks: [...(p.pricing.extra_blocks || []), { ...EMPTY_EMISSION_BLOCK }],
      },
    }));
  const updateExtraBlock = (idx, patch) =>
    setFormData((p) => {
      const arr = [...(p.pricing.extra_blocks || [])];
      arr[idx] = { ...arr[idx], ...patch };
      return { ...p, pricing: { ...p.pricing, extra_blocks: arr } };
    });
  const removeExtraBlock = (idx) =>
    setFormData((p) => {
      const arr = [...(p.pricing.extra_blocks || [])];
      arr.splice(idx, 1);
      return { ...p, pricing: { ...p.pricing, extra_blocks: arr } };
    });

  const selectedProgram = useMemo(
    () => milesTable.find((m) => m.id === formData.pricing.program_id) || null,
    [milesTable, formData.pricing.program_id]
  );

  const appliedTier = useMemo(
    () => (selectedProgram ? getTierForMiles(selectedProgram, parseBR(formData.pricing.miles_qty)) : null),
    [selectedProgram, formData.pricing.miles_qty]
  );

  const milesQtyParsed = useMemo(
    () => parseBR(formData.pricing.miles_qty),
    [formData.pricing.miles_qty]
  );

  const appliedCostPerThousand = useMemo(() => {
    if (!selectedProgram) return Number(formData.pricing.miles_value_per_thousand) || 0;
    return getCostForMiles(selectedProgram, milesQtyParsed);
  }, [selectedProgram, milesQtyParsed, formData.pricing.miles_value_per_thousand]);

  const appliedSalePerThousand = useMemo(() => {
    if (!selectedProgram) return Number(formData.pricing.miles_value_per_thousand) || 0;
    return getSaleForMiles(selectedProgram, milesQtyParsed);
  }, [selectedProgram, milesQtyParsed, formData.pricing.miles_value_per_thousand]);

  // Cálculos — campos preenchidos pelo vendedor representam 1 emissão (1 pax).
  // Nipon e custo "por pessoa" são multiplicados por formData.passengers nos totais.
  const calc = useMemo(() => {
    const pr = formData.pricing;
    let cost_brl = 0;       // custo real interno por pessoa (sem taxa)
    let venda_base = 0;     // valor de venda das milhas por pessoa (sale_per_thousand)
    let niponPorPessoa = 0;
    let acrescimo = 0;
    let custoPorPessoa = 0;

    if (pr.multi_program) {
      // Multi-programa — cada trecho com programa próprio. Custo e Nipon são
      // somas dos trechos (POR PESSOA). venda_base = soma da "venda das milhas"
      // de cada trecho usando sale_per_thousand do programa.
      const arr = Array.isArray(pr.trechos_pricing) ? pr.trechos_pricing : [];
      for (const tp of arr) {
        const milhas = parseBR(tp.miles_qty);
        const tax = parseBR(tp.tax);
        const cpt = Number(tp.cost_per_thousand) || 0;
        const spt = Number(tp.sale_per_thousand) || 0;
        const milhasCost = (milhas / 1000) * cpt;
        const milhasSale = (milhas / 1000) * spt;
        const segCost = milhasCost + tax;
        const segNipon = tp.is_azul ? segCost : milhasSale + tax;
        cost_brl += milhasCost;
        venda_base += milhasSale;
        custoPorPessoa += segCost;
        niponPorPessoa += segNipon;
      }
    } else if (pr.is_split) {
      // Em modo split, total_nipon/total_cost já são a soma POR PESSOA dos trechos.
      niponPorPessoa = Number(pr.total_nipon) || 0;
      custoPorPessoa = Number(pr.total_cost) || 0;
      cost_brl = custoPorPessoa;
    } else {
      const tax = parseBR(pr.tax);
      if (pr.type === "milhas") {
        const milhas = parseBR(pr.miles_qty);
        cost_brl = (milhas / 1000) * appliedCostPerThousand;
        venda_base = (milhas / 1000) * appliedSalePerThousand;
        niponPorPessoa = venda_base + tax;
      } else if (pr.type === "milhas_dinheiro") {
        // Tarifa híbrida Azul — custo = milhas + parte em dinheiro; Nipon +10%
        // sempre (mesmo Azul). cost_per_thousand vem fixo do programa selecionado.
        const milhas = parseBR(pr.miles_qty);
        const dinheiro = parseBR(pr.cash_part);
        const cpt = Number(pr.cost_per_thousand) || appliedCostPerThousand;
        cost_brl = (milhas / 1000) * cpt + dinheiro;
        niponPorPessoa = (cost_brl + tax) * 1.10;
      } else {
        const cost = parseBR(pr.cost_brl);
        const base = cost + tax;
        acrescimo = pr.is_azul ? 0 : base * 0.10;
        niponPorPessoa = base + acrescimo;
        cost_brl = cost;
      }
      custoPorPessoa = cost_brl + tax;
    }

    const passengers = Math.max(1, Number(formData.passengers) || 1);
    // cost_is_total: o valor digitado no bloco já é o total de todos os
    // passageiros (ex.: Smiles cobra a tarifa cheia) → não multiplica por pax.
    const mainMult = pr.cost_is_total === true ? 1 : passengers;
    let niponTotal = niponPorPessoa * mainMult;
    let custoTotal = custoPorPessoa * mainMult;
    // Blocos extras de tipo de emissão — somados ao principal.
    for (const b of (Array.isArray(pr.extra_blocks) ? pr.extra_blocks : [])) {
      const cn = emissionBlockCN(b);
      const m = b.cost_is_total === true ? 1 : passengers;
      custoTotal += cn.cost * m;
      niponTotal += cn.nipon * m;
    }

    const saleInput = parseBR(pr.sale_value);
    const isPerPerson = pr.sale_per !== "total";
    const saleTotal = isPerPerson ? saleInput * passengers : saleInput;

    // Comissão sempre sobre os totais. Taxa base depende da origem do lead:
    // Carteira própria → 30%; demais → 25%. Extra fixo em 45% do excedente.
    const leadOrigin = formData.client?.lead_origin || "";
    const isCarteiraPropria = String(leadOrigin)
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .trim()
      .startsWith("carteira propria");
    const baseRate = isCarteiraPropria ? 0.3 : 0.25;
    const lucroNipon = Math.max(0, niponTotal - custoTotal);
    const comissaoBase = lucroNipon * baseRate;
    const excedente = Math.max(0, saleTotal - niponTotal);
    const comissaoExtra = excedente * 0.45;
    const comissaoTotal = comissaoBase + comissaoExtra;
    const lucroBruto = saleTotal - custoTotal;

    const total =
      saleTotal +
      (formData.additional.active ? parseBR(formData.additional.value) : 0) +
      (formData.services.insurance.active ? parseBR(formData.services.insurance.value) : 0) +
      (formData.services.transfer.active ? parseBR(formData.services.transfer.value) : 0);

    return {
      cost_brl, venda_base, acrescimo,
      // Mantemos nomes antigos apontando aos totais para compatibilidade da UI:
      nipon: niponTotal,
      niponPorPessoa,
      custoTotal,
      custoPorPessoa,
      saleInput, saleTotal, isPerPerson, passengers,
      lucroNipon, lucroBruto,
      comissaoBase, excedente, comissaoExtra, comissaoTotal,
      baseRate, isCarteiraPropria,
      total,
    };
  }, [formData, appliedCostPerThousand, appliedSalePerThousand]);

  // Mantém nipon_value (POR PESSOA) e cost_brl_calc sincronizados (single + multi).
  // Modo split não sincroniza (já tem total_nipon/total_cost próprios).
  useEffect(() => {
    if (formData.pricing.is_split) return;
    setFormData((p) => ({
      ...p,
      pricing: { ...p.pricing, nipon_value: calc.niponPorPessoa, cost_brl_calc: calc.cost_brl },
    }));
     
  }, [calc.niponPorPessoa, calc.cost_brl, formData.pricing.is_split]);

  // Preço sugerido pela tabela (venda das milhas + taxas) × pax. Usado para
  // detectar override do vendedor (cobrar diferente do que a tabela sugere).
  const precoSugerido = useMemo(() => {
    const pr = formData.pricing;
    const pax = Math.max(1, Number(formData.passengers) || 1);
    if (pr.multi_program) {
      let perPax = 0;
      for (const tp of pr.trechos_pricing || []) {
        const milhas = parseBR(tp.miles_qty);
        const tax = parseBR(tp.tax);
        const spt = Number(tp.sale_per_thousand) || 0;
        perPax += (milhas / 1000) * spt + tax;
      }
      return perPax * pax;
    }
    if (pr.is_split || pr.type !== "milhas") return 0;
    // Single programa milhas: usa sale_per_thousand do programa selecionado
    const milhas = parseBR(pr.miles_qty);
    const tax = parseBR(pr.tax);
    return ((milhas / 1000) * appliedSalePerThousand + tax) * pax;
  }, [formData.pricing, formData.passengers, appliedSalePerThousand]);

  const saleAtual = useMemo(() => {
    const pr = formData.pricing;
    const pax = Math.max(1, Number(formData.passengers) || 1);
    const v = parseBR(pr.sale_value);
    return pr.sale_per === "pessoa" ? v * pax : v;
  }, [formData.pricing, formData.passengers]);

  const isPriceOverridden =
    precoSugerido > 0 && saleAtual > 0 && Math.abs(saleAtual - precoSugerido) > 5;

  // Persiste flag de override no pricing (lido por persistQuote pra criar notificação)
  useEffect(() => {
    setFormData((p) => {
      const same =
        p.pricing?.price_overridden === isPriceOverridden &&
        Math.abs((Number(p.pricing?.suggested_price) || 0) - precoSugerido) < 0.01;
      if (same) return p;
      return {
        ...p,
        pricing: {
          ...p.pricing,
          price_overridden: isPriceOverridden,
          suggested_price: precoSugerido,
        },
      };
    });
     
  }, [isPriceOverridden, precoSugerido]);

  const aboveNipon = calc.saleTotal >= calc.nipon && calc.saleTotal > 0;
  const passengers = calc.passengers;

  // Nipon TOTAL — usado pelo card de valor livre do parceiro e como
  // referência informativa nos snapshots de partner_rav/partner_desconto.
  const niponTotal = calc.nipon;

  // Snapshot informativo persistido: RAV/desconto derivados automaticamente
  // do sale_value vs Nipon. Sem modo: tudo deriva direto do input.
  useEffect(() => {
    if (!isParceiroMode) return;
    const venda = parseBR(formData.pricing.sale_value) || 0;
    const diff = venda - niponTotal;
    const rav = diff > 0 ? diff : 0;
    const desc = diff < 0 ? Math.abs(diff) : 0;
    setFormData((prev) => {
      const p = prev.pricing || {};
      const same =
        Math.abs((Number(p.partner_rav) || 0) - rav) < 0.01 &&
        Math.abs((Number(p.partner_desconto) || 0) - desc) < 0.01;
      if (same) return prev;
      return {
        ...prev,
        pricing: { ...p, partner_rav: rav, partner_desconto: desc },
      };
    });
  }, [isParceiroMode, formData.pricing.sale_value, niponTotal, setFormData]);

  return (
    <div className="space-y-6">
      {/* 4-Moeda — toggle BRL/EUR + badge de cotação ao vivo */}
      <Card className={cn("border-border/50", isEur && "border-accent/30 bg-accent/10")}>
        <CardContent className="p-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium">Moeda da operação</Label>
            <div className="flex gap-1 bg-bg-elevated rounded-md p-0.5">
              <button
                type="button"
                onClick={() => setCurrency("BRL")}
                className={cn(
                  "px-3 py-1.5 rounded text-xs font-medium transition",
                  currency === "BRL"
                    ? "bg-bg-surface shadow text-text-primary"
                    : "text-text-secondary hover:bg-bg-surface"
                )}
              >
                🇧🇷 Real (BRL)
              </button>
              <button
                type="button"
                onClick={() => setCurrency("EUR")}
                className={cn(
                  "px-3 py-1.5 rounded text-xs font-medium transition",
                  currency === "EUR"
                    ? "bg-bg-surface shadow text-text-primary"
                    : "text-text-secondary hover:bg-bg-surface"
                )}
              >
                🇪🇺 Euro (EUR)
              </button>
            </div>
          </div>
          {isEur && <ExchangeRateBadge compact />}
        </CardContent>
        {isEur && !eurRate && (
          <CardContent className="pt-0 pb-3">
            <div className="text-xs text-warning bg-warning/10 border border-warning/30 rounded p-2">
              ⚠️ Cotação indisponível no momento. Aguarde alguns segundos ou volte para BRL.
            </div>
          </CardContent>
        )}
      </Card>

      {/* 4A - Tipo de emissão */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wallet className="h-4 w-4" /> Tipo de Emissão
            {isSplit && (
              <Badge variant="secondary" className="text-[10px]">Múltiplas emissões</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
        {/* Toggle multi-programa — só fora de Quebra de Trecho e com 2+ trechos */}
        {canMultiProgram && (
          <div className="flex items-start justify-between gap-3 p-3 bg-warning/10 border border-warning/30 rounded-lg mb-4">
            <div className="min-w-0">
              <p className="font-semibold text-sm text-warning">
                Programas diferentes por trecho?
              </p>
              <p className="text-xs text-warning mt-0.5">
                Ative quando IDA e VOLTA usam companhias/programas diferentes (ex: ida GOL, volta LATAM).
              </p>
            </div>
            <Switch
              checked={isMultiProgram}
              onCheckedChange={(checked) => {
                setFormData((prev) => {
                  const next = { ...prev.pricing, multi_program: !!checked };
                  if (!checked) {
                    delete next.trechos_pricing;
                  }
                  return { ...prev, pricing: next };
                });
              }}
            />
          </div>
        )}

        {isSplit ? (
          <SplitPricing
            trechos={formData.pricing?.trechos || []}
            milesTable={milesTable}
            onChange={updateTrechoPricing}
            passengers={passengers}
          />
        ) : isMultiProgram ? (
          <MultiProgramPricing
            trechosPricing={formData.pricing?.trechos_pricing || []}
            milesTable={milesTable}
            onChange={updateMultiTrechoPricing}
            passengers={passengers}
            custoPorPessoa={calc.custoPorPessoa}
            niponPorPessoa={calc.niponPorPessoa}
            custoTotal={calc.custoTotal}
            niponTotal={calc.nipon}
          />
        ) : (
          <>
          <Tabs
            value={formData.pricing.type}
            onValueChange={(v) => setPricing({ type: v })}
          >
            <TabsList className="grid grid-cols-3 w-full max-w-md">
              <TabsTrigger value="milhas">Milhas</TabsTrigger>
              <TabsTrigger value="milhas_dinheiro">Milhas + Dinheiro</TabsTrigger>
              <TabsTrigger value="dinheiro">Dinheiro</TabsTrigger>
            </TabsList>

            <TabsContent value="milhas" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Programa de Milhas</Label>
                  <Select
                    value={formData.pricing.program_id}
                    onValueChange={(v) => {
                      const program = milesTable.find((m) => m.id === v);
                      setPricing({
                        program_id: v,
                        program_name: program?.program || "",
                        miles_value_per_thousand: program?.cost_per_thousand || 0,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={milesTable.length === 0 ? "Sem programas cadastrados" : "Selecione..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {milesTable.map((m) => (
                        <SelectItem
                          key={m.id}
                          value={m.id}
                          disabled={m.stock_status === "unavailable"}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "w-2 h-2 rounded-full",
                                m.stock_status === "own" && "bg-success",
                                m.stock_status === "unavailable" && "bg-danger",
                                (!m.stock_status || m.stock_status === "supplier") && "bg-warning"
                              )}
                            />
                            {m.program} — {formatBRL(m.cost_per_thousand)}/mil
                            {m.stock_status === "unavailable" && (
                              <span className="text-danger text-xs">(em falta)</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Custo em milhas</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex: 80.000 ou 80000"
                    value={formData.pricing.miles_qty}
                    onChange={(e) => setPricing({ miles_qty: sanitizeBRInput(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isEur ? "Taxa de embarque (EUR)" : "Taxa de embarque (R$)"}</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder={isEur ? "Ex: 50,00" : "Ex: 320,50"}
                    value={isEur ? (formData.pricing.tax_eur ?? "") : formData.pricing.tax}
                    onChange={(e) => {
                      if (isEur) {
                        setEurField("tax_eur", "tax", sanitizeBRInput(e.target.value));
                      } else {
                        setPricing({ tax: sanitizeBRInput(e.target.value) });
                      }
                    }}
                  />
                  {isEur && eurRate > 0 && Number(formData.pricing.tax_eur) > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      ≈ {formatBRL(convertEurToBrl(formData.pricing.tax_eur, eurRate))}
                    </p>
                  )}
                </div>
              </div>
              <Card className="bg-muted/40 border-border/50">
                <CardContent className="p-4 space-y-1.5 text-sm">
                  {appliedTier && (
                    <div className="flex items-center justify-between p-2 mb-1 rounded-lg bg-accent/10 border border-accent/30">
                      <span className="text-xs font-semibold text-accent dark:text-accent flex items-center gap-1.5">
                        Faixa aplicada: {appliedTier.label}
                      </span>
                      <span className="text-xs text-accent dark:text-accent">
                        base venda: {formatBRL(selectedProgram?.sale_per_thousand)}/mil
                      </span>
                    </div>
                  )}
                  <Row label="Venda do milheiro" value={formatBRL(appliedSalePerThousand)} />
                  <Row label="Custo real (interno)" value={formatBRL(appliedCostPerThousand)} muted />
                  <Row label={`Valor das milhas (venda${passengers >= 2 ? " · por pessoa" : ""})`} value={formatBRL(calc.venda_base)} />
                  <Row label={`Taxa de embarque${passengers >= 2 ? " · por pessoa" : ""}`} value={formatBRL(parseBR(formData.pricing.tax))} />
                  <Separator className="my-2" />
                  <Row label={`VALOR NIPON${passengers >= 2 ? " (por pessoa)" : " (venda mínima)"}`} value={formatBRL(calc.niponPorPessoa)} bold accent />
                  <Row
                    label={`Custo real total${passengers >= 2 ? " · por pessoa" : ""}`}
                    value={formatBRL(calc.custoPorPessoa)}
                    muted
                  />
                  <Row
                    label={`Margem bruta${passengers >= 2 ? " · por pessoa" : ""}`}
                    value={formatBRL(calc.niponPorPessoa - calc.custoPorPessoa)}
                    bold
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="milhas_dinheiro" className="space-y-4 mt-4">
              {/* Aviso explicativo */}
              <div className="bg-warning-subtle border border-warning/30 rounded-lg p-3">
                <p className="font-semibold text-sm text-warning">Tarifa híbrida</p>
                <p className="text-xs text-text-muted mt-0.5">
                  Disponível apenas para programas Azul (Azul Pelo Mundo, Voe Azul) — a passagem
                  cobra simultaneamente milhas e um valor em reais.
                </p>
              </div>

              {/* Programa de milhas — APENAS Azul */}
              <div className="space-y-2">
                <Label>Programa de milhas (Azul)</Label>
                <Select
                  value={formData.pricing.program_id}
                  onValueChange={(v) => {
                    const program = milesTable.find((m) => m.id === v);
                    setPricing({
                      program_id: v,
                      program_name: program?.program || "",
                      cost_per_thousand: Number(program?.cost_per_thousand) || 0,
                      sale_per_thousand: Number(program?.sale_per_thousand) || 0,
                      is_azul: true,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione programa Azul..." />
                  </SelectTrigger>
                  <SelectContent>
                    {milesTable
                      .filter((m) => m.program?.toLowerCase().includes("azul"))
                      .map((m) => (
                        <SelectItem
                          key={m.id}
                          value={m.id}
                          disabled={m.stock_status === "unavailable"}
                        >
                          {m.program} — {formatBRL(m.cost_per_thousand)}/mil
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {milesTable.filter((m) => m.program?.toLowerCase().includes("azul")).length === 0 && (
                  <p className="text-xs text-danger mt-1">
                    Nenhum programa Azul cadastrado. Adicione em /gerente/milhas.
                  </p>
                )}
              </div>

              {/* Inputs lado a lado: milhas + dinheiro */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Milhas necessárias (por pax)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex: 20.000 ou 20000"
                    value={formData.pricing.miles_qty}
                    onChange={(e) => setPricing({ miles_qty: sanitizeBRInput(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor em dinheiro (R$, por pax)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex: 2.500,00"
                    value={formData.pricing.cash_part ?? ""}
                    onChange={(e) => setPricing({ cash_part: sanitizeBRInput(e.target.value) })}
                  />
                </div>
              </div>

              {/* Taxa de embarque */}
              <div className="space-y-2">
                <Label>Taxa de embarque (R$, por pax)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 64,60"
                  value={formData.pricing.tax}
                  onChange={(e) => setPricing({ tax: sanitizeBRInput(e.target.value) })}
                />
              </div>

              {/* Resumo do cálculo */}
              {milesQtyParsed > 0 && (
                <Card className="bg-muted/40 border-border/50">
                  <CardContent className="p-4 space-y-1.5 text-sm">
                    {(() => {
                      const milhas = parseBR(formData.pricing.miles_qty);
                      const dinheiro = parseBR(formData.pricing.cash_part);
                      const taxa = parseBR(formData.pricing.tax);
                      const cpt = Number(formData.pricing.cost_per_thousand) || 0;
                      const custoMilhas = (milhas / 1000) * cpt;
                      const custoTotal = custoMilhas + dinheiro + taxa;
                      const niponPerPax = custoTotal * 1.1;
                      const niponTotal = niponPerPax * passengers;
                      const custoConsolidado = custoTotal * passengers;
                      return (
                        <>
                          <Row
                            label="Custo das milhas"
                            value={`${milhas.toLocaleString("pt-BR")} × ${formatBRL(cpt)}/mil = ${formatBRL(custoMilhas)}`}
                          />
                          <Row label="Parte em dinheiro" value={formatBRL(dinheiro)} />
                          <Row label={`Taxa de embarque${passengers >= 2 ? " · por pessoa" : ""}`} value={formatBRL(taxa)} />
                          <Separator className="my-2" />
                          <Row
                            label={`Custo total${passengers >= 2 ? " · por pessoa" : ""}`}
                            value={formatBRL(custoTotal)}
                            muted
                          />
                          <Row
                            label={`VALOR NIPON (custo × 1.10)${passengers >= 2 ? " · por pessoa" : " · venda mínima"}`}
                            value={formatBRL(niponPerPax)}
                            bold
                            accent
                          />
                          {passengers >= 2 && (
                            <>
                              <Separator className="my-2" />
                              <p className="text-[11px] uppercase tracking-wider text-text-muted font-medium">
                                Totais ({passengers} passageiros)
                              </p>
                              <Row label="Custo total" value={formatBRL(custoConsolidado)} muted />
                              <Row label="Nipon total sugerido" value={formatBRL(niponTotal)} bold accent />
                            </>
                          )}
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="dinheiro" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{isEur ? "Preço de custo (EUR)" : "Preço de custo (R$)"}</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder={isEur ? "Ex: 200,00" : "Ex: 1.234,56"}
                    value={isEur ? (formData.pricing.cost_eur ?? "") : formData.pricing.cost_brl}
                    onChange={(e) => {
                      if (isEur) {
                        setEurField("cost_eur", "cost_brl", sanitizeBRInput(e.target.value));
                      } else {
                        setPricing({ cost_brl: sanitizeBRInput(e.target.value) });
                      }
                    }}
                  />
                  {isEur && eurRate > 0 && Number(formData.pricing.cost_eur) > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      ≈ {formatBRL(convertEurToBrl(formData.pricing.cost_eur, eurRate))} (cotação R$ {eurRate.toFixed(4)})
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{isEur ? "Taxa de embarque (EUR)" : "Taxa de embarque (R$)"}</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder={isEur ? "Ex: 50,00" : "Ex: 320,50"}
                    value={isEur ? (formData.pricing.tax_eur ?? "") : formData.pricing.tax}
                    onChange={(e) => {
                      if (isEur) {
                        setEurField("tax_eur", "tax", sanitizeBRInput(e.target.value));
                      } else {
                        setPricing({ tax: sanitizeBRInput(e.target.value) });
                      }
                    }}
                  />
                  {isEur && eurRate > 0 && Number(formData.pricing.tax_eur) > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      ≈ {formatBRL(convertEurToBrl(formData.pricing.tax_eur, eurRate))}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="azul"
                  checked={formData.pricing.is_azul}
                  onCheckedChange={(c) => setPricing({ is_azul: !!c })}
                />
                <Label htmlFor="azul" className="text-sm cursor-pointer">
                  Azul — não aplicar 10%
                </Label>
              </div>
              <Card className="bg-muted/40 border-border/50">
                <CardContent className="p-4 space-y-1.5 text-sm">
                  <Row label={`Custo base${passengers >= 2 ? " · por pessoa" : ""}`} value={formatBRL(parseBR(formData.pricing.cost_brl))} />
                  <Row label={`Taxa de embarque${passengers >= 2 ? " · por pessoa" : ""}`} value={formatBRL(parseBR(formData.pricing.tax))} />
                  <Row
                    label="Acréscimo 10%"
                    value={formData.pricing.is_azul ? "Isento — Azul" : formatBRL(calc.acrescimo)}
                  />
                  <Separator className="my-2" />
                  <Row label={`VALOR NIPON${passengers >= 2 ? " (por pessoa)" : " (venda mínima)"}`} value={formatBRL(calc.niponPorPessoa)} bold accent />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Custo já é o total de todos os passageiros? (ex.: Smiles) */}
          {passengers >= 2 && (
            <div className="flex items-start gap-2 mt-4">
              <Checkbox
                id="cost_is_total"
                checked={formData.pricing.cost_is_total === true}
                onCheckedChange={(c) => setPricing({ cost_is_total: !!c })}
                className="mt-0.5"
              />
              <Label htmlFor="cost_is_total" className="text-sm cursor-pointer leading-snug font-medium">
                O custo informado já é o total de todos os passageiros
                <span className="block text-xs text-text-muted font-normal mt-0.5">
                  Marque quando a companhia (ex.: Smiles) cobra a tarifa cheia para todos juntos —
                  o sistema não multiplica por {passengers} passageiros.
                </span>
              </Label>
            </div>
          )}

          {/* Blocos extras — quando o voo é quebrado em mais de um tipo de tarifa */}
          {(formData.pricing.extra_blocks || []).map((b, idx) => (
            <EmissionBlockEditor
              key={idx}
              block={b}
              index={idx}
              milesTable={milesTable}
              passengers={passengers}
              onChange={(patch) => updateExtraBlock(idx, patch)}
              onRemove={() => removeExtraBlock(idx)}
            />
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4 gap-1.5"
            onClick={addExtraBlock}
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar tipo de emissão
          </Button>

          {/* Resumo consolidado — soma do principal + extras */}
          {((formData.pricing.extra_blocks || []).length > 0 ||
            formData.pricing.cost_is_total === true) && (
            <Card className="bg-bg-elevated border-border mt-4">
              <CardContent className="p-4 space-y-1.5 text-sm">
                <p className="text-[11px] uppercase tracking-wider text-text-muted font-medium mb-1">
                  Resumo consolidado
                  {(formData.pricing.extra_blocks || []).length > 0
                    ? ` · ${(formData.pricing.extra_blocks || []).length + 1} tipos de tarifa`
                    : ""}
                </p>
                <Row label="Custo total" value={formatBRL(calc.custoTotal)} muted />
                <Row label="Nipon total (venda mínima)" value={formatBRL(calc.nipon)} bold accent />
                <Row label="Margem bruta (vs venda atual)" value={formatBRL(calc.lucroBruto)} bold />
              </CardContent>
            </Card>
          )}
          </>
        )}
        </CardContent>
      </Card>

      {/* 4B - Valor de venda à parceira (input livre + feedback contextual) */}
      {isParceiroMode && (
        <Card className="border-warning/30 bg-warning/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-warning" />
              Valor da passagem para a parceira
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Você define livremente. Nipon é apenas referência sugerida.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Sugestão informativa: custo + Nipon como referência */}
            <div className="bg-bg-surface border border-border rounded-lg p-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Custo total da PCD:</span>
                <strong className="text-text-secondary">{formatBRL(calc.custoTotal)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nipon (sugestão de venda):</span>
                <strong className="text-warning">{formatBRL(niponTotal)}</strong>
              </div>
            </div>

            {/* Input de valor livre */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                {isEur
                  ? "Valor que vou cobrar da parceira (EUR, total)"
                  : "Valor que vou cobrar da parceira (total)"}
              </Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder={
                  isEur
                    ? (eurRate > 0
                        ? `Sugerido: ${formatEUR(convertBrlToEur(niponTotal, eurRate))}`
                        : "0,00")
                    : `Sugerido: ${formatBRL(niponTotal)}`
                }
                value={isEur ? (formData.pricing.sale_value_eur ?? "") : formData.pricing.sale_value}
                onChange={(e) => {
                  if (isEur) {
                    const eur = parseFloat(String(sanitizeBRInput(e.target.value)).replace(",", ".")) || 0;
                    const brl = eurRate > 0 ? eur * eurRate : 0;
                    setFormData((prev) => ({
                      ...prev,
                      pricing: {
                        ...prev.pricing,
                        sale_value_eur: eur,
                        sale_value: brl,
                        sale_per: "total",
                      },
                    }));
                  } else {
                    setPricing({
                      sale_value: sanitizeBRInput(e.target.value),
                      sale_per: "total",
                    });
                  }
                }}
                className="text-lg font-semibold h-12"
              />
              {isEur && eurRate > 0 && Number(formData.pricing.sale_value_eur) > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  ≈ {formatBRL(parseBR(formData.pricing.sale_value))} (cotação R$ {eurRate.toFixed(4)})
                </p>
              )}
              <button
                type="button"
                onClick={() => {
                  if (isEur && eurRate > 0) {
                    const eur = convertBrlToEur(niponTotal, eurRate);
                    setFormData((prev) => ({
                      ...prev,
                      pricing: {
                        ...prev.pricing,
                        sale_value_eur: eur,
                        sale_value: niponTotal,
                        sale_per: "total",
                      },
                    }));
                  } else {
                    setPricing({ sale_value: String(niponTotal), sale_per: "total" });
                  }
                }}
                className="text-xs text-warning hover:text-warning underline"
              >
                Usar valor sugerido (Nipon)
              </button>
            </div>

            {/* Feedback contextual: prejuízo / margem comprimida / lucro saudável */}
            {(() => {
              const venda = parseBR(formData.pricing.sale_value) || 0;
              if (venda === 0) return null;

              const lucroBruto = venda - calc.custoTotal;
              const acimaNipon = venda - niponTotal;

              // CASO 1: prejuízo — venda abaixo do custo
              if (venda < calc.custoTotal) {
                const prejuizo = calc.custoTotal - venda;
                return (
                  <div className="bg-danger/10 border-2 border-danger/30 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-bold text-danger text-sm">⚠️ Venda abaixo do custo</p>
                        <p className="text-xs text-danger mt-1">
                          Você está vendendo {formatBRL(prejuizo)} <strong>abaixo do que a PCD pagou</strong>.
                          Isso significa <strong>prejuízo direto</strong> de {formatBRL(prejuizo)}.
                        </p>
                        <p className="text-[10px] text-danger mt-1.5">
                          Custo PCD: {formatBRL(calc.custoTotal)} · Sua venda: {formatBRL(venda)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }

              // CASO 2: entre custo e Nipon — margem comprimida
              if (venda < niponTotal) {
                const descontoNipon = niponTotal - venda;
                return (
                  <div className="bg-warning/10 border border-warning/30 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-warning text-sm">
                          Lucro de {formatBRL(lucroBruto)}
                        </p>
                        <p className="text-xs text-warning mt-1">
                          Você está vendendo {formatBRL(descontoNipon)} <strong>abaixo do Nipon sugerido</strong> — margem comprimida.
                        </p>
                        <p className="text-[10px] text-warning mt-1.5">
                          Custo: {formatBRL(calc.custoTotal)} → Venda: {formatBRL(venda)} ({((lucroBruto / venda) * 100).toFixed(1)}% margem)
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }

              // CASO 3: acima do Nipon — operação saudável
              return (
                <div className="bg-success/10 border-2 border-success/30 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-5 h-5 text-success shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-bold text-success text-sm">
                        Lucro de {formatBRL(lucroBruto)} ({((lucroBruto / venda) * 100).toFixed(1)}% margem)
                      </p>
                      <p className="text-xs text-success mt-1">
                        {acimaNipon > 0 && (
                          <>+{formatBRL(acimaNipon)} <strong>acima do Nipon sugerido</strong> — </>
                        )}
                        Operação saudável. PCD lucra {formatBRL(lucroBruto)} nessa venda.
                      </p>
                      <p className="text-[10px] text-success mt-1.5">
                        Custo: {formatBRL(calc.custoTotal)} → Venda: {formatBRL(venda)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* 4B - Valor de venda */}
      {!isParceiroMode && (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Valor de Venda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {passengers >= 2 && (
            <Card className="bg-accent/5 border-accent/30">
              <CardContent className="p-3 space-y-1.5 text-sm">
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  Resumo por passageiro × {passengers} pax
                </div>
                <Row label="Custo por pessoa" value={formatBRL(calc.custoPorPessoa)} muted />
                <Row label="Nipon por pessoa" value={formatBRL(calc.niponPorPessoa)} />
                <Separator className="my-2" />
                <Row label="Custo total" value={formatBRL(calc.custoTotal)} muted />
                <Row label="VALOR NIPON TOTAL" value={formatBRL(calc.nipon)} bold accent />
              </CardContent>
            </Card>
          )}

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px] items-end">
            <div className="space-y-2">
              <Label>
                {isEur
                  ? "Valor de venda ao cliente (EUR) *"
                  : "Valor de venda ao cliente (R$) *"}
              </Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder={isEur ? "Ex: 250,00" : "Ex: 1.234,56"}
                value={isEur ? (formData.pricing.sale_value_eur ?? "") : formData.pricing.sale_value}
                onChange={(e) => {
                  if (isEur) {
                    const eur = parseFloat(String(sanitizeBRInput(e.target.value)).replace(",", ".")) || 0;
                    const brl = eurRate > 0 ? eur * eurRate : 0;
                    setFormData((prev) => ({
                      ...prev,
                      pricing: {
                        ...prev.pricing,
                        sale_value_eur: eur,
                        sale_value: brl,
                      },
                    }));
                  } else {
                    setPricing({ sale_value: sanitizeBRInput(e.target.value) });
                  }
                }}
              />
              {isEur && eurRate > 0 && Number(formData.pricing.sale_value_eur) > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  ≈ {formatBRL(parseBR(formData.pricing.sale_value))} (cotação R$ {eurRate.toFixed(4)})
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Cobrado por</Label>
              <Select
                value={formData.pricing.sale_per || "pessoa"}
                onValueChange={(v) => setPricing({ sale_per: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pessoa">Por pessoa</SelectItem>
                  <SelectItem value="total">Total da viagem</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {passengers >= 2 && calc.saleInput > 0 && (
            <div className="text-xs text-muted-foreground">
              {calc.isPerPerson
                ? <>Total da venda: <strong>{formatBRL(calc.saleTotal)}</strong> ({formatBRL(calc.saleInput)} × {passengers} pax)</>
                : <>Por pessoa: <strong>{formatBRL(calc.saleTotal / passengers)}</strong> ({formatBRL(calc.saleTotal)} ÷ {passengers})</>}
            </div>
          )}

          {/* Override de preço — preço cobrado difere do sugerido pela tabela */}
          {isPriceOverridden && (
            <div className="bg-accent/10 border border-accent/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <div className="flex-1 text-sm">
                  <p className="font-semibold text-accent">
                    Preço customizado pelo vendedor
                  </p>
                  <p className="text-xs text-accent mt-0.5">
                    Sugerido pela tabela: <strong>{formatBRL(precoSugerido)}</strong> · Você está cobrando:{" "}
                    <strong>{formatBRL(saleAtual)}</strong>
                    {saleAtual > precoSugerido && (
                      <span className="text-success"> (acima do sugerido — bom!)</span>
                    )}
                    {saleAtual < precoSugerido && (
                      <span className="text-warning"> (abaixo do sugerido)</span>
                    )}
                  </p>
                  <p className="text-[10px] text-accent mt-1">
                    ⓘ O gerente será notificado sobre essa alteração ao salvar.
                  </p>
                </div>
              </div>
            </div>
          )}

          {calc.saleTotal > 0 && !aboveNipon && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-sm">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <span className="text-warning dark:text-warning">
                Valor de venda total ({formatBRL(calc.saleTotal)}) está abaixo do Nipon total ({formatBRL(calc.nipon)}).
                Sem comissão extra — comissão base calculada sobre o lucro mínimo do Nipon.
              </span>
            </div>
          )}
          {calc.saleTotal > 0 && (
            <Card className={cn(
              aboveNipon
                ? "bg-success/5 border-success/30"
                : "bg-muted/40 border-border/60"
            )}>
              <CardContent className="p-4 space-y-1.5 text-sm">
                <Row label="Lucro Nipon (nipon − custo)" value={formatBRL(calc.lucroNipon)} />
                <Row
                  label={`Comissão base (${(calc.baseRate * 100).toFixed(0)}% do lucro Nipon)${calc.isCarteiraPropria ? " · Carteira própria" : ""}`}
                  value={formatBRL(calc.comissaoBase)}
                />
                <Row label="Excedente sobre Nipon" value={formatBRL(calc.excedente)} />
                <Row label="Comissão extra (45% do excedente)" value={formatBRL(calc.comissaoExtra)} />
                <Separator className="my-2" />
                <Row
                  label="COMISSÃO TOTAL DO VENDEDOR"
                  value={formatBRL(calc.comissaoTotal)}
                  bold
                  className={aboveNipon ? "text-success" : "text-foreground"}
                />
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
      )}

      {/* 4C - Valor adicional */}
      {!isParceiroMode && (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="add-active"
              checked={formData.additional.active}
              onCheckedChange={(c) =>
                setFormData((p) => ({ ...p, additional: { ...p.additional, active: !!c } }))
              }
            />
            <Label htmlFor="add-active" className="text-sm cursor-pointer">
              Adicionar valor extra ao orçamento
            </Label>
          </div>
        </CardHeader>
        {formData.additional.active && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 1.234,56"
                  value={formData.additional.value}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, additional: { ...p.additional, value: sanitizeBRInput(e.target.value) } }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  placeholder="Ex: Serviço VIP"
                  value={formData.additional.description}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, additional: { ...p.additional, description: e.target.value } }))
                  }
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>
      )}

      {/* 4D - Concorrência */}
      <Card className="border-border/50 border-dashed">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="comp-active"
              checked={formData.competitor.active}
              onCheckedChange={(c) =>
                setFormData((p) => ({ ...p, competitor: { ...p.competitor, active: !!c } }))
              }
            />
            <Label htmlFor="comp-active" className="text-sm cursor-pointer">
              Registrar preço concorrente
            </Label>
          </div>
        </CardHeader>
        {formData.competitor.active && (
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Empresa concorrente</Label>
                <Input
                  value={formData.competitor.name}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, competitor: { ...p.competitor, name: e.target.value } }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 1.234,56"
                  value={formData.competitor.value}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, competitor: { ...p.competitor, value: sanitizeBRInput(e.target.value) } }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de tarifa</Label>
                <Select
                  value={formData.competitor.fare_type}
                  onValueChange={(v) =>
                    setFormData((p) => ({ ...p, competitor: { ...p.competitor, fare_type: v } }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Econômica", "Executiva", "Premium Economy", "Primeira"].map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {parseBR(formData.competitor.value) > 0 && calc.saleTotal > 0 && (
              <div className="p-3 rounded-lg bg-muted/40 border text-sm">
                Nosso preço: <strong>{formatBRL(calc.saleTotal)}</strong> vs Concorrência:{" "}
                <strong>{formatBRL(parseBR(formData.competitor.value))}</strong> →{" "}
                <span className="text-success">
                  Economia de {formatBRL(parseBR(formData.competitor.value) - calc.saleTotal)} (
                  {(((parseBR(formData.competitor.value) - calc.saleTotal) / parseBR(formData.competitor.value)) * 100).toFixed(1)}%)
                </span>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* 4E - Serviços adicionais */}
      {!isParceiroMode && (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Serviços Adicionais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: "insurance", label: "Seguro Viagem" },
            { key: "transfer", label: "Transfer" },
          ].map((s) => (
            <div key={s.key} className="grid grid-cols-[auto_1fr_auto] gap-3 items-center">
              <Checkbox
                id={`svc-${s.key}`}
                checked={formData.services[s.key].active}
                onCheckedChange={(c) =>
                  setFormData((p) => ({
                    ...p,
                    services: { ...p.services, [s.key]: { ...p.services[s.key], active: !!c } },
                  }))
                }
              />
              <Label htmlFor={`svc-${s.key}`} className="text-sm cursor-pointer">{s.label}</Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="R$"
                disabled={!formData.services[s.key].active}
                value={formData.services[s.key].value}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    services: { ...p.services, [s.key]: { ...p.services[s.key], value: sanitizeBRInput(e.target.value) } },
                  }))
                }
                className="w-32"
              />
            </div>
          ))}
        </CardContent>
      </Card>
      )}

      {/* Total */}
      {!isParceiroMode && (
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <div className="text-xs opacity-80">VALOR TOTAL DA PROPOSTA</div>
            <div className="text-2xl font-bold mt-1">{formatBRL(calc.total)}</div>
          </div>
          <DollarSign className="h-10 w-10 opacity-30" />
        </CardContent>
      </Card>
      )}
    </div>
  );
}

function Row({ label, value, bold, accent, muted, className }) {
  return (
    <div className={cn("flex items-center justify-between", muted && "text-xs", className)}>
      <span className={cn(
        "text-muted-foreground",
        bold && "text-foreground font-medium",
        muted && "text-muted-foreground/70"
      )}>
        {label}
      </span>
      <span className={cn(
        bold && "font-bold",
        accent && "text-primary",
        muted && "text-muted-foreground/80"
      )}>{value}</span>
    </div>
  );
}

// ─── Bloco extra de tipo de emissão (vários tipos de tarifa somados) ──
function EmissionBlockEditor({ block, index, milesTable, passengers, onChange, onRemove }) {
  const cn2 = emissionBlockCN(block);
  const isTotal = block.cost_is_total === true;
  const mult = isTotal ? 1 : passengers;
  const custoTotal = cn2.cost * mult;
  const niponTotal = cn2.nipon * mult;

  const selectAzul = (m) => (m.program || "").toLowerCase().includes("azul");

  const pickProgram = (v) => {
    const prog = milesTable.find((m) => m.id === v);
    onChange({
      program_id: v,
      program_name: prog?.program || "",
      cost_per_thousand: Number(prog?.cost_per_thousand) || 0,
      sale_per_thousand: Number(prog?.sale_per_thousand) || 0,
      is_azul: selectAzul(prog || {}),
    });
  };

  return (
    <Card className="border-border bg-muted/30 mt-4">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Tipo de tarifa adicional {index + 2}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-text-muted hover:text-danger"
            onClick={onRemove}
            title="Remover bloco"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        <Tabs value={block.type} onValueChange={(v) => onChange({ type: v })}>
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="milhas">Milhas</TabsTrigger>
            <TabsTrigger value="milhas_dinheiro">Milhas + Dinheiro</TabsTrigger>
            <TabsTrigger value="dinheiro">Dinheiro</TabsTrigger>
          </TabsList>

          <TabsContent value="milhas" className="space-y-3 mt-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Programa</Label>
                <Select value={block.program_id} onValueChange={pickProgram}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {milesTable.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.program} — {formatBRL(m.cost_per_thousand)}/mil
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Custo em milhas</Label>
                <Input type="text" inputMode="decimal" placeholder="Ex: 80.000"
                  value={block.miles_qty}
                  onChange={(e) => onChange({ miles_qty: sanitizeBRInput(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Taxa de embarque (R$)</Label>
                <Input type="text" inputMode="decimal" placeholder="Ex: 320,50"
                  value={block.tax}
                  onChange={(e) => onChange({ tax: sanitizeBRInput(e.target.value) })} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="milhas_dinheiro" className="space-y-3 mt-3">
            <div className="space-y-1.5">
              <Label>Programa de milhas (Azul)</Label>
              <Select value={block.program_id} onValueChange={pickProgram}>
                <SelectTrigger><SelectValue placeholder="Selecione programa Azul..." /></SelectTrigger>
                <SelectContent>
                  {milesTable.filter(selectAzul).map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.program} — {formatBRL(m.cost_per_thousand)}/mil
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Milhas (por pax)</Label>
                <Input type="text" inputMode="decimal" placeholder="Ex: 20.000"
                  value={block.miles_qty}
                  onChange={(e) => onChange({ miles_qty: sanitizeBRInput(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Dinheiro (R$)</Label>
                <Input type="text" inputMode="decimal" placeholder="Ex: 2.500,00"
                  value={block.cash_part}
                  onChange={(e) => onChange({ cash_part: sanitizeBRInput(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Taxa de embarque (R$)</Label>
                <Input type="text" inputMode="decimal" placeholder="Ex: 64,60"
                  value={block.tax}
                  onChange={(e) => onChange({ tax: sanitizeBRInput(e.target.value) })} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="dinheiro" className="space-y-3 mt-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Preço de custo (R$)</Label>
                <Input type="text" inputMode="decimal" placeholder="Ex: 1.234,56"
                  value={block.cost_brl}
                  onChange={(e) => onChange({ cost_brl: sanitizeBRInput(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Taxa de embarque (R$)</Label>
                <Input type="text" inputMode="decimal" placeholder="Ex: 320,50"
                  value={block.tax}
                  onChange={(e) => onChange({ tax: sanitizeBRInput(e.target.value) })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id={`azul-extra-${index}`} checked={block.is_azul === true}
                onCheckedChange={(c) => onChange({ is_azul: !!c })} />
              <Label htmlFor={`azul-extra-${index}`} className="text-sm cursor-pointer">
                Azul — não aplicar 10%
              </Label>
            </div>
          </TabsContent>
        </Tabs>

        {passengers >= 2 && (
          <div className="flex items-start gap-2">
            <Checkbox id={`total-extra-${index}`} checked={isTotal} className="mt-0.5"
              onCheckedChange={(c) => onChange({ cost_is_total: !!c })} />
            <Label htmlFor={`total-extra-${index}`} className="text-xs cursor-pointer text-text-muted leading-snug">
              O valor deste bloco já é o total de todos os passageiros (não multiplicar)
            </Label>
          </div>
        )}

        <div className="flex items-center justify-between text-sm border-t border-border pt-2">
          <span className="text-text-muted">Custo {mult > 1 ? `× ${passengers}` : "(total)"}</span>
          <span className="tabular-nums">
            {formatBRL(custoTotal)} · Nipon <strong className="text-primary">{formatBRL(niponTotal)}</strong>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Quebra de Trecho — múltiplas emissões ─────────────────────────
function SplitPricing({ trechos, milesTable, onChange, passengers = 1 }) {
  const niponPorPessoa = trechos.reduce((s, t) => s + (Number(t.nipon_value) || 0), 0);
  const custoPorPessoa = trechos.reduce((s, t) => s + (Number(t.cost_total) || 0), 0);
  const totalNipon = niponPorPessoa * passengers;
  const totalCost = custoPorPessoa * passengers;
  const totalMargin = totalNipon - totalCost;

  if (trechos.length === 0) {
    return (
      <div className="p-4 rounded-lg bg-muted/40 border border-dashed text-sm text-muted-foreground text-center">
        Adicione trechos no Bloco 3 para configurar a precificação por trecho.
      </div>
    );
  }

  if (trechos.length === 1) {
    return (
      <div className="p-4 rounded-lg bg-warning/10 border border-warning/30 text-sm text-warning">
        <strong>Quebra de Trecho precisa de 2+ voos.</strong> Adicione um segmento (escala) ou
        volte ao tipo de bilhete <em>Normal</em> no Bloco 3.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-sm">
        <Info className="h-4 w-4 text-warning shrink-0 mt-0.5" />
        <div className="text-warning dark:text-warning">
          <strong>Quebra de Trecho:</strong> cada voo pode ser emitido com método
          diferente (ex: BSB→GRU em milhas Latam, GRU→MIA em milhas Smiles, ou um voo em milhas e outro em dinheiro).
        </div>
      </div>

      {trechos.map((trecho, idx) => (
        <TrechoPricingCard
          key={trecho.key || idx}
          trecho={trecho}
          index={idx}
          milesTable={milesTable}
          onChange={(updated) => onChange(idx, updated)}
        />
      ))}

      {/* Totais consolidados */}
      <Card className="bg-bg-elevated text-text-primary border-border-strong">
        <CardContent className="p-5 space-y-2">
          <div className="text-[10px] uppercase tracking-widest text-text-muted">
            Totais consolidados {passengers >= 2 ? `· soma trechos × ${passengers} pax` : ""}
          </div>
          {passengers >= 2 && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Custo por pessoa:</span>
                <span className="font-semibold">{formatBRL(custoPorPessoa)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Nipon por pessoa:</span>
                <span className="font-semibold text-warning">{formatBRL(niponPorPessoa)}</span>
              </div>
              <Separator className="my-2 bg-bg-overlay" />
            </>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Custo total:</span>
            <span className="font-semibold">{formatBRL(totalCost)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Valor Nipon total:</span>
            <span className="font-semibold text-warning">{formatBRL(totalNipon)}</span>
          </div>
          <Separator className="my-2 bg-bg-overlay" />
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Margem bruta:</span>
            <span className={cn("font-semibold", totalMargin >= 0 ? "text-success" : "text-danger")}>
              {formatBRL(totalMargin)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TrechoPricingCard({ trecho, index, milesTable, onChange }) {
  const isIda = (trecho.label || "").startsWith("Ida");
  const accentClass = isIda ? "border-l-blue-500" : "border-l-red-500";

  const selectedProgram = useMemo(
    () => milesTable.find((m) => m.id === trecho.program_id) || null,
    [milesTable, trecho.program_id]
  );

  // Recalcula nipon_value e cost_total deste trecho conforme entradas mudam.
  useEffect(() => {
    let cost_total = 0;
    let nipon_value = 0;
    const tax = parseBR(trecho.tax);

    if (trecho.type === "milhas") {
      const milhas = parseBR(trecho.miles_qty);
      if (selectedProgram && milhas > 0) {
        const costPerThousand = getCostForMiles(selectedProgram, milhas);
        const salePerThousand = getSaleForMiles(selectedProgram, milhas);
        cost_total = (milhas / 1000) * costPerThousand + tax;
        nipon_value = (milhas / 1000) * salePerThousand + tax;
      }
    } else {
      const cost = parseBR(trecho.cost_brl);
      if (cost > 0 || tax > 0) {
        const base = cost + tax;
        const acrescimo = trecho.is_azul ? 0 : base * 0.10;
        cost_total = base;
        nipon_value = base + acrescimo;
      }
    }

    if (
      Math.abs(cost_total - (Number(trecho.cost_total) || 0)) > 0.001 ||
      Math.abs(nipon_value - (Number(trecho.nipon_value) || 0)) > 0.001
    ) {
      onChange({ ...trecho, cost_total, nipon_value });
    }
     
  }, [trecho.type, trecho.program_id, trecho.miles_qty, trecho.tax, trecho.cost_brl, trecho.is_azul, selectedProgram]);

  return (
    <Card className={cn("border-l-4", accentClass)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm flex items-center gap-2">
            <span className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
              {index + 1}
            </span>
            {trecho.label}
          </CardTitle>
          {Number(trecho.nipon_value) > 0 && (
            <span className="text-xs text-warning dark:text-warning font-semibold">
              Nipon: {formatBRL(trecho.nipon_value)}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs
          value={trecho.type || "milhas"}
          onValueChange={(v) => onChange({ ...trecho, type: v })}
        >
          <TabsList className="grid grid-cols-2 w-full max-w-sm">
            <TabsTrigger value="milhas">Milhas</TabsTrigger>
            <TabsTrigger value="dinheiro">Dinheiro</TabsTrigger>
          </TabsList>

          <TabsContent value="milhas" className="space-y-3 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Programa de Milhas</Label>
                <Select
                  value={trecho.program_id || ""}
                  onValueChange={(v) => {
                    const program = milesTable.find((m) => m.id === v);
                    onChange({
                      ...trecho,
                      program_id: v,
                      program_name: program?.program || "",
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={milesTable.length === 0 ? "Sem programas" : "Selecione..."}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {milesTable.map((m) => (
                      <SelectItem
                        key={m.id}
                        value={m.id}
                        disabled={m.stock_status === "unavailable"}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "w-2 h-2 rounded-full",
                              m.stock_status === "own" && "bg-success",
                              m.stock_status === "unavailable" && "bg-danger",
                              (!m.stock_status || m.stock_status === "supplier") && "bg-warning"
                            )}
                          />
                          {m.program} — {formatBRL(m.cost_per_thousand)}/mil
                          {m.stock_status === "unavailable" && (
                            <span className="text-danger text-xs">(em falta)</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Custo em milhas</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 80.000 ou 80000"
                  value={trecho.miles_qty || ""}
                  onChange={(e) => onChange({ ...trecho, miles_qty: sanitizeBRInput(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Taxa de embarque (R$)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 320,50"
                  value={trecho.tax || ""}
                  onChange={(e) => onChange({ ...trecho, tax: sanitizeBRInput(e.target.value) })}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="dinheiro" className="space-y-3 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Preço de custo (R$)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 1.234,56"
                  value={trecho.cost_brl || ""}
                  onChange={(e) => onChange({ ...trecho, cost_brl: sanitizeBRInput(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Taxa de embarque (R$)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 320,50"
                  value={trecho.tax || ""}
                  onChange={(e) => onChange({ ...trecho, tax: sanitizeBRInput(e.target.value) })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id={`azul-${index}`}
                checked={!!trecho.is_azul}
                onCheckedChange={(c) => onChange({ ...trecho, is_azul: !!c })}
              />
              <Label htmlFor={`azul-${index}`} className="text-sm cursor-pointer">
                Azul — não aplicar 10%
              </Label>
            </div>
          </TabsContent>
        </Tabs>

        {Number(trecho.cost_total) > 0 && (
          <Card className="bg-muted/40 border-border/50 mt-4">
            <CardContent className="p-3 space-y-1.5 text-sm">
              <Row label="Custo deste trecho" value={formatBRL(trecho.cost_total)} muted />
              <Row
                label="Valor Nipon deste trecho"
                value={formatBRL(trecho.nipon_value)}
                bold
                accent
              />
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Multi-programa — IDA e VOLTA com programas diferentes ────────
function MultiProgramPricing({
  trechosPricing,
  milesTable,
  onChange,
  passengers = 1,
  custoPorPessoa = 0,
  niponPorPessoa = 0,
  custoTotal = 0,
  niponTotal = 0,
}) {
  if (trechosPricing.length === 0) {
    return (
      <div className="p-4 rounded-lg bg-muted/40 border border-dashed text-sm text-muted-foreground text-center">
        Preencha os trechos no Bloco 3 para configurar os programas por trecho.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-sm">
        <Info className="h-4 w-4 text-warning shrink-0 mt-0.5" />
        <div className="text-warning dark:text-warning">
          <strong>Multi-programa:</strong> cada trecho usa um programa de milhas próprio. Os totais (custo e Nipon) somam todos os trechos × passageiros.
        </div>
      </div>

      {trechosPricing.map((tp, idx) => (
        <MultiProgramTrechoCard
          key={idx}
          trechoPricing={tp}
          index={idx}
          milesTable={milesTable}
          onUpdate={(patch) => onChange(idx, patch)}
          passengers={passengers}
        />
      ))}

      {/* Consolidado */}
      <Card className="bg-bg-elevated text-text-primary border-border-strong">
        <CardContent className="p-5 space-y-2">
          <div className="text-[10px] uppercase tracking-widest text-text-muted">
            Total consolidado (IDA + VOLTA){passengers >= 2 ? ` · × ${passengers} pax` : ""}
          </div>
          {passengers >= 2 && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Custo por pessoa:</span>
                <span className="font-semibold">{formatBRL(custoPorPessoa)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Nipon por pessoa:</span>
                <span className="font-semibold text-warning">{formatBRL(niponPorPessoa)}</span>
              </div>
              <Separator className="my-2 bg-bg-overlay" />
            </>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Custo total:</span>
            <span className="font-semibold">{formatBRL(custoTotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Valor Nipon total:</span>
            <span className="font-semibold text-warning">{formatBRL(niponTotal)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MultiProgramTrechoCard({ trechoPricing, index, milesTable, onUpdate, passengers }) {
  const isIda = trechoPricing.tipo === "ida";
  const tp = trechoPricing;

  const selectedProgram = useMemo(
    () => milesTable.find((m) => m.id === tp.program_id) || null,
    [milesTable, tp.program_id]
  );

  const milesParsed = parseBR(tp.miles_qty);
  const cpt = useMemo(
    () => (selectedProgram ? getCostForMiles(selectedProgram, milesParsed) : Number(tp.cost_per_thousand) || 0),
    [selectedProgram, milesParsed, tp.cost_per_thousand]
  );
  const spt = useMemo(
    () => (selectedProgram ? getSaleForMiles(selectedProgram, milesParsed) : Number(tp.sale_per_thousand) || 0),
    [selectedProgram, milesParsed, tp.sale_per_thousand]
  );

  // Mantém snapshot dos preços do programa atualizado quando o vendedor
  // muda programa ou quantidade de milhas (faixas com preço variável).
  useEffect(() => {
    if (
      Math.abs(cpt - (Number(tp.cost_per_thousand) || 0)) < 0.001 &&
      Math.abs(spt - (Number(tp.sale_per_thousand) || 0)) < 0.001
    ) return;
    onUpdate({ cost_per_thousand: cpt, sale_per_thousand: spt });
     
  }, [cpt, spt]);

  const tax = parseBR(tp.tax);
  const segCost = (milesParsed / 1000) * cpt + tax;
  const segSaleSugerida = (milesParsed / 1000) * spt + tax;

  return (
    <Card className={cn("border-l-4", isIda ? "border-l-red-500" : "border-l-blue-500")}>
      <CardHeader className={cn("py-3", isIda ? "bg-danger/10" : "bg-accent/10")}>
        <CardTitle className={cn("text-sm flex items-center gap-2", isIda ? "text-danger" : "text-accent")}>
          {isIda ? <PlaneTakeoff className="w-4 h-4" /> : <PlaneLanding className="w-4 h-4" />}
          {isIda ? "IDA" : "VOLTA"} — Configuração de milhas
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <div className="space-y-2">
          <Label>Programa de milhas</Label>
          <Select
            value={tp.program_id || ""}
            onValueChange={(v) => {
              const program = milesTable.find((m) => m.id === v);
              onUpdate({
                program_id: v,
                program_name: program?.program || "",
                cost_per_thousand: program?.cost_per_thousand || 0,
                sale_per_thousand: program?.sale_per_thousand || 0,
                is_azul: !!program?.program?.toLowerCase().includes("azul"),
              });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={milesTable.length === 0 ? "Sem programas" : "Selecione..."} />
            </SelectTrigger>
            <SelectContent>
              {milesTable.map((m) => (
                <SelectItem
                  key={m.id}
                  value={m.id}
                  disabled={m.stock_status === "unavailable"}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full",
                        m.stock_status === "own" && "bg-success",
                        m.stock_status === "unavailable" && "bg-danger",
                        (!m.stock_status || m.stock_status === "supplier") && "bg-warning"
                      )}
                    />
                    {m.program} — {formatBRL(m.cost_per_thousand)}/mil
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Milhas por pessoa</Label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="Ex: 23.300"
              value={tp.miles_qty || ""}
              onChange={(e) => onUpdate({ miles_qty: sanitizeBRInput(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Taxa por pessoa (R$)</Label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="Ex: 32,87"
              value={tp.tax || ""}
              onChange={(e) => onUpdate({ tax: sanitizeBRInput(e.target.value) })}
            />
          </div>
        </div>

        {milesParsed > 0 && (
          <div className="bg-bg-elevated rounded p-2.5 text-xs space-y-1 border border-border">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Custo por pax neste trecho:</span>
              <strong>{formatBRL(segCost)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Venda sugerida por pax (tabela):</span>
              <strong className="text-warning">{formatBRL(segSaleSugerida)}</strong>
            </div>
            {passengers > 1 && (
              <div className="flex justify-between text-muted-foreground pt-1 border-t border-border mt-1">
                <span>Custo × {passengers} pax:</span>
                <strong>{formatBRL(segCost * passengers)}</strong>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Bloco 5 — Gerar ────────────────────────────────────────────────
function BlocoGerar({ formData, totalValue, commission, onSaved }) {
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [whatsappText, setWhatsappText] = useState("");
  const [copied, setCopied] = useState(false);
  const [savedQuote, setSavedQuote] = useState(null);
  const [quoteNumber, setQuoteNumber] = useState("");
  const [saving, setSaving] = useState(false);
  // Trava síncrona contra clique duplo: setSaving é assíncrono, então cliques
  // dentro do mesmo tick do React não veem saving=true; o ref fecha essa janela.
  const isSavingRef = useRef(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isParceiroMode = formData.recipient_type === "parceiro";

  const buildWhatsapp = () => {
    const t = formData;
    const trechos = t.itinerary.trechos || [];
    let texto = `✈️ PassagensComDesconto\n📌 CADASTUR: 62830477000151\n\n`;
    const greetName = isParceiroMode ? (t.partner_name || "parceiro") : (t.client?.name || "");
    texto += `Olá ${greetName}! Segue sua cotação personalizada com todo suporte da nossa agência.\n\n`;
    const isSplit = t.ticket_type === "Quebra de Trecho";
    texto += `🛫 ITINERÁRIO:\n`;
    trechos.forEach((tr) => {
      const segmentos = getSegmentos(tr);
      const stops = segmentos
        .slice(0, -1)
        .map((s) => s.destino_iata)
        .filter(Boolean);
      const escalaInfo =
        tr.escalas > 0
          ? `${tr.escalas} escala(s)${stops.length ? ` via ${stops.join(" / ")}` : ""}`
          : "Voo direto";
      texto += `${tr.tipo === "volta" ? "↩️ VOLTA: " : ""}${tr.origem_cidade} (${tr.origem_iata}) ➝ ${tr.destino_cidade} (${tr.destino_iata})\n`;
      texto += `✈️ ${escalaInfo}\n`;

      if (segmentos.length > 1) {
        segmentos.forEach((s, si) => {
          texto += `  • Voo ${si + 1}: ${s.companhia || ""}${s.numero_voo ? ` ${s.numero_voo}` : ""} — ${s.origem_iata}→${s.destino_iata} · ${s.horario_saida || ""}→${s.horario_chegada || ""}${s.duracao ? ` · ${s.duracao}` : ""}\n`;
          if (si < segmentos.length - 1) {
            const espera = tr.tempo_escalas?.[si]?.duracao;
            if (espera) texto += `    ⏳ Escala em ${s.destino_iata}: ${espera}\n`;
          }
        });
      } else {
        texto += `🕒 Saída: ${tr.horario_saida}\n🕒 Chegada: ${tr.horario_chegada}\n`;
      }
      texto += `⏱️ Duração total: ${tr.tempo_total || tr.duracao || "—"}\n`;
      if (isSplit) {
        const cls = tr.classe || "Econômica";
        const bg = tr.baggage || {};
        const bagPieces = [];
        if (Number(bg.personal) > 0) bagPieces.push("🎒 artigo pessoal");
        if (Number(bg.carry_on) > 0) bagPieces.push(`🎒 ${bg.carry_on}× mão`);
        if (Number(bg.checked) > 0) bagPieces.push(`🧳 ${bg.checked}× despachada`);
        texto += `🎫 Classe: ${cls}${bagPieces.length ? ` · ${bagPieces.join(" · ")}` : ""}\n`;
      }
      texto += `\n`;
    });

    texto += `📅 DATAS:\n`;
    texto += `IDA: ${formatDateBR(t.departure_date)}\n`;
    texto += `VOLTA: ${t.one_way ? "Apenas ida" : formatDateBR(t.return_date)}\n\n`;

    texto += `💰 VALOR TOTAL: ${formatBRL(totalValue)}\n`;
    texto += `➡️ Consulte opções de parcelamento no cartão 💳\n\n`;

    texto += `👤 PASSAGEIROS:\n${t.passengers} ${t.passengers > 1 ? "Adultos" : "Adulto"}\n\n`;

    if (!isSplit) {
      const bagList = [];
      const pad2 = (n) => String(n).padStart(2, "0");
      const personalQty = Number(t.baggage.personal) || 0;
      const carryQty = Number(t.baggage.carry_on) || 0;
      const checkedQty = Number(t.baggage.checked) || 0;
      if (personalQty > 0)
        bagList.push(`🎒 ${pad2(personalQty)} ${personalQty > 1 ? "artigos pessoais" : "artigo pessoal"} (mochila/bolsa)`);
      if (carryQty > 0)
        bagList.push(`🎒 ${pad2(carryQty)} ${carryQty > 1 ? "bagagens de mão" : "bagagem de mão"} (10kg)`);
      if (checkedQty > 0)
        bagList.push(`🧳 ${pad2(checkedQty)} ${checkedQty > 1 ? "bagagens despachadas" : "bagagem despachada"} (23kg)`);
      if (bagList.length === 0) bagList.push("🎒 Bagagem não inclusa");
      texto += `${bagList.join("\n")}\n\n`;
    }

    if (t.services.insurance.active) texto += `🛡️ Seguro Viagem incluso (${formatBRL(parseBR(t.services.insurance.value))})\n`;
    if (t.services.transfer.active) texto += `🚗 Transfer incluso (${formatBRL(parseBR(t.services.transfer.value))})\n`;
    if (t.additional.active && t.additional.description) {
      texto += `➕ ${t.additional.description}: ${formatBRL(parseBR(t.additional.value))}\n`;
    }
    if (t.services.insurance.active || t.services.transfer.active || t.additional.active) texto += `\n`;

    texto += `✅ Taxas inclusas\n✅ Assessoria e suporte durante todo o trajeto\n✅ Check-in antecipado\n\n`;
    texto += `⚠️ Observações importantes:\nValores sujeitos a alteração até o fechamento 🚨\nTaxa de cancelamento conforme regras da cia aérea 🚨\nPagamento no crédito pode ter taxas adicionais 🚨\n\n`;
    texto += `📌 CNPJ: 62.830.477/0001-51\n📅 Data da cotação: ${new Date().toLocaleDateString("pt-BR")}`;

    return texto;
  };

  // Normaliza strings com vírgula/ponto BR para números (usado em persistência e geração de PDF).
  const buildNormalizedPayload = () => {
    const normalizedPricing = {
      ...formData.pricing,
      program: formData.pricing.program_name,
      miles_qty: parseBR(formData.pricing.miles_qty),
      tax: parseBR(formData.pricing.tax),
      cost_brl: Number(formData.pricing.cost_brl_calc) || parseBR(formData.pricing.cost_brl),
      cash_part: parseBR(formData.pricing.cash_part),
      cost_per_thousand: Number(formData.pricing.cost_per_thousand) || 0,
      sale_value: parseBR(formData.pricing.sale_value),
    };
    if (Array.isArray(normalizedPricing.trechos)) {
      normalizedPricing.trechos = normalizedPricing.trechos.map((t) => ({
        ...t,
        miles_qty: parseBR(t.miles_qty),
        tax: parseBR(t.tax),
        cost_brl: parseBR(t.cost_brl),
      }));
    }
    // Multi-programa: normaliza milhas/taxa de cada trecho para Number
    if (Array.isArray(normalizedPricing.trechos_pricing)) {
      normalizedPricing.trechos_pricing = normalizedPricing.trechos_pricing.map((tp) => ({
        ...tp,
        miles_qty: parseBR(tp.miles_qty),
        tax: parseBR(tp.tax),
        cost_per_thousand: Number(tp.cost_per_thousand) || 0,
        sale_per_thousand: Number(tp.sale_per_thousand) || 0,
      }));
    }
    // Blocos extras de tipo de emissão: normaliza strings BR para Number.
    if (Array.isArray(normalizedPricing.extra_blocks)) {
      normalizedPricing.extra_blocks = normalizedPricing.extra_blocks.map((b) => ({
        ...b,
        miles_qty: parseBR(b.miles_qty),
        tax: parseBR(b.tax),
        cash_part: parseBR(b.cash_part),
        cost_brl: parseBR(b.cost_brl),
        cost_per_thousand: Number(b.cost_per_thousand) || 0,
        sale_per_thousand: Number(b.sale_per_thousand) || 0,
        cost_is_total: b.cost_is_total === true,
      }));
    }
    return {
      pricing: normalizedPricing,
      additional: formData.additional.active
        ? { ...formData.additional, value: parseBR(formData.additional.value) }
        : null,
      competitor: formData.competitor.active
        ? { ...formData.competitor, value: parseBR(formData.competitor.value) }
        : null,
      services: {
        insurance: {
          ...formData.services.insurance,
          value: parseBR(formData.services.insurance.value),
        },
        transfer: {
          ...formData.services.transfer,
          value: parseBR(formData.services.transfer.value),
        },
      },
    };
  };

  const persistQuote = async (text) => {
    if (savedQuote) return savedQuote;
    if (isSavingRef.current) {
      console.warn("[BlocoGerar] persistQuote já em andamento — ignorando clique duplicado.");
      return null;
    }
    isSavingRef.current = true;
    setSaving(true);
    try {
      // Gera o número apenas quando vai persistir de fato; única chamada por ciclo.
      let number = quoteNumber;
      if (!number) {
        number = await gerarNumeroPCDUnico();
        setQuoteNumber(number);
      }

      const { pricing: normalizedPricing, additional: normalizedAdditional, competitor: normalizedCompetitor, services: normalizedServices } = buildNormalizedPayload();

      const isParceiroMode = formData.recipient_type === "parceiro";

      // Nipon SEMPRE derivado pelo helper — gravamos só como snapshot informativo
      // pra que pricing.nipon_value armazenado coincida com o cálculo dinâmico
      // e relatórios externos (Supabase Studio) leiam o valor correto.
      const derivedTotals = computePricingTotals({
        ...formData,
        pricing: normalizedPricing,
      });
      const niponTotalDerived = derivedTotals.niponTotal;
      const pricingWithSyncedNipon = {
        ...normalizedPricing,
        nipon_value: derivedTotals.niponPerPax,
      };

      // Para parceiro, o vendedor já definiu sale_value via RAV/Desconto/Valor
      // no Bloco 4. Usamos esse valor diretamente — não sobrescrevemos com o
      // Nipon (modelo antigo). O `partner_base_sale_value` top-level guarda o
      // valor que a PCD cobra da parceira (floor de margem no portal dela).
      let finalSaleValueForPartner = 0;
      let finalPricing = pricingWithSyncedNipon;
      let finalTotalValue = totalValue;

      if (isParceiroMode) {
        const partnerSale = Number(normalizedPricing.sale_value) || 0;
        // Se o vendedor não definiu (vazio), assume Nipon como piso seguro.
        finalSaleValueForPartner = partnerSale > 0 ? partnerSale : niponTotalDerived;
        const diff = finalSaleValueForPartner - niponTotalDerived;
        finalPricing = {
          ...pricingWithSyncedNipon,
          sale_value: finalSaleValueForPartner,
          sale_per: "total",
          partner_rav: diff > 0 ? diff : 0,
          partner_desconto: diff < 0 ? Math.abs(diff) : 0,
        };
        finalTotalValue = finalSaleValueForPartner;
      }

      // Parceiro não gera comissão para o vendedor PCD — gravamos um snapshot
      // zerado com nota informativa. Cliente direto segue o cálculo padrão.
      const commissionSnapshot = isParceiroMode
        ? {
            base: 0,
            extra: 0,
            total: 0,
            base_rate: 0,
            _note: "Sem comissão — venda a parceiro",
          }
        : buildCommissionSnapshot({
            ...formData,
            pricing: finalPricing,
            total_value: finalTotalValue,
          });

      const quote = await localClient.entities.Quotes.create({
        quote_number: number,
        recipient_type: formData.recipient_type || "cliente",
        partner_id: formData.partner_id || null,
        partner_name: formData.partner_name || null,
        client: isParceiroMode ? null : formData.client,
        client_id: isParceiroMode ? null : (formData.client?.id || null),
        product: formData.product,
        ticket_type: formData.ticket_type,
        itinerary: formData.itinerary,
        dates: {
          departure: formData.departure_date,
          return: formData.return_date,
          one_way: formData.one_way,
        },
        passengers: formData.passengers,
        baggage: formData.baggage,
        pricing: finalPricing,
        additional: isParceiroMode ? null : normalizedAdditional,
        competitor: normalizedCompetitor,
        services: isParceiroMode
          ? { insurance: { active: false, value: 0 }, transfer: { active: false, value: 0 } }
          : normalizedServices,
        total_value: finalTotalValue,
        // Valor que a PCD cobra da parceira — floor que a parceira vê no
        // portal dela ao definir o preço final ao cliente final.
        ...(isParceiroMode && { partner_base_sale_value: finalSaleValueForPartner }),
        commission: commissionSnapshot,
        seller_name: user?.name || "Equipe PCD",
        seller_id: user?.id || null,
        status: "Enviado",
        whatsapp_text: text,
        parent_quote_id: isParceiroMode ? null : (formData.parent_quote_id || null),
        quote_sequence: formData.quote_sequence || 1,
      });
      if (!quote) {
        toast({ title: "Erro ao salvar orçamento no servidor", variant: "destructive" });
        return null;
      }

      // Cria notificação para o gerente quando o vendedor cobrou preço
      // diferente do sugerido pela tabela (preserva o valor sugerido como
      // metadado). Não bloqueia o save se a notificação falhar.
      if (!isParceiroMode && finalPricing?.price_overridden === true) {
        try {
          const suggested = Number(finalPricing.suggested_price) || 0;
          const passengersCount = Math.max(1, Number(formData.passengers) || 1);
          const saleTotalReal =
            finalPricing.sale_per === "pessoa"
              ? Number(finalPricing.sale_value) * passengersCount
              : Number(finalPricing.sale_value);
          const diff = saleTotalReal - suggested;
          const direction = diff > 0 ? "acima" : "abaixo";
          const fmt = (v) =>
            Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
          await supabase.from("pcd_notifications").insert({
            type: "price_override",
            quote_id: quote.id,
            quote_number: number,
            seller_id: user?.id || null,
            seller_name: user?.name || null,
            title: `Preço customizado em ${number}`,
            message: `${user?.name || "Vendedor"} cotou ${fmt(saleTotalReal)} ${direction} do sugerido (${fmt(suggested)}) — diferença de ${fmt(Math.abs(diff))}.`,
            metadata: {
              suggested: suggested,
              actual: saleTotalReal,
              difference: diff,
              client_name: formData.client?.name || formData.partner_name || null,
              passengers: passengersCount,
            },
            target_role: "gerente",
          });
        } catch (err) {
          console.warn("[BlocoGerar] Falha ao criar notificação de override:", err);
        }
      }

      setSavedQuote(quote);
      onSaved?.(quote);
      toast({ title: "Orçamento salvo com sucesso!" });
      return quote;
    } finally {
      isSavingRef.current = false;
      setSaving(false);
    }
  };

  const handleWhatsapp = async () => {
    const txt = buildWhatsapp();
    setWhatsappText(txt);
    const persisted = await persistQuote(txt);
    // Só abre o modal se conseguiu persistir (ou se já estava salvo)
    if (persisted || savedQuote) setWhatsappOpen(true);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(whatsappText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleGerarPDF = async () => {
    const txt = buildWhatsapp();
    const persisted = await persistQuote(txt);
    // Usa o número que efetivamente foi persistido (importante quando a corrida
    // de UNIQUE devolveu o registro existente em vez de criar um novo).
    const numberForPDF =
      persisted?.quote_number || savedQuote?.quote_number || quoteNumber;
    const normalized = buildNormalizedPayload();
    const niponBaseTotal =
      Number(normalized.pricing?.total_nipon) ||
      (Number(normalized.pricing?.nipon_value) || 0) *
        Math.max(1, Number(formData.passengers) || 1);
    // Para parceiro o PDF mostra o que ela paga: sale_value definido (RAV/desc/valor)
    // ou Nipon como fallback se vazio. Não mais sobrescrevemos com Nipon cego.
    const partnerSaleForPDF = isParceiroMode
      ? (Number(normalized.pricing?.sale_value) || niponBaseTotal)
      : 0;
    const finalTotal = isParceiroMode ? partnerSaleForPDF : totalValue;
    const finalPricing = isParceiroMode
      ? { ...normalized.pricing, sale_value: partnerSaleForPDF, sale_per: "total" }
      : normalized.pricing;
    openQuoteInNewTab({
      quote_number: numberForPDF,
      recipient_type: formData.recipient_type || "cliente",
      partner_id: formData.partner_id || null,
      partner_name: formData.partner_name || null,
      client: isParceiroMode
        ? { name: formData.partner_name || "Parceiro" }
        : formData.client,
      product: formData.product,
      ticket_type: formData.ticket_type,
      itinerary: formData.itinerary,
      dates: {
        departure: formData.departure_date,
        return: formData.return_date,
        one_way: formData.one_way,
      },
      passengers: formData.passengers,
      baggage: formData.baggage,
      pricing: finalPricing,
      additional: isParceiroMode ? null : normalized.additional,
      competitor: normalized.competitor,
      services: isParceiroMode
        ? { insurance: { active: false, value: 0 }, transfer: { active: false, value: 0 } }
        : normalized.services,
      total_value: finalTotal,
      commission: isParceiroMode ? { base: 0, extra: 0, total: 0 } : commission,
      seller_name: user?.name || "Equipe PCD",
      created_date: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-4 relative">
      {/* Overlay durante salvamento — bloqueia cliques fora do botão e tranquiliza o usuário */}
      {saving && (
        <div className="absolute inset-0 bg-bg-surface backdrop-blur-[1px] z-50 flex items-center justify-center rounded-lg">
          <div className="bg-bg-surface rounded-xl shadow-lg p-5 flex items-center gap-3 border border-border">
            <Loader2 className="w-6 h-6 text-warning animate-spin" />
            <div>
              <p className="font-semibold text-sm">Salvando orçamento…</p>
              <p className="text-xs text-muted-foreground">Não feche a página.</p>
            </div>
          </div>
        </div>
      )}

      {/* Resumo destinatário */}
      {isParceiroMode ? (
        <Card className="border-border/50 border-accent/30 bg-accent/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Handshake className="h-4 w-4 text-accent" /> Parceiro
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <div><strong>{formData.partner_name}</strong></div>
            <div className="text-muted-foreground">
              Você definiu o valor que a PCD vai cobrar — o parceiro acrescentará a margem dele no portal.
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Cliente</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div><strong>{formData.client?.name}</strong></div>
            <div className="text-muted-foreground">{formData.client?.phone || "—"} · {formData.client?.lead_origin || "—"}</div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/50">
        <CardHeader className="pb-3"><CardTitle className="text-sm">Itinerário</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          {formData.itinerary.trechos.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">{t.tipo}</Badge>
              <span>
                {t.origem_iata} ({t.horario_saida}) → {t.destino_iata} ({t.horario_chegada}) ·{" "}
                <span className="text-muted-foreground">{t.companhia} {t.numero_voo}</span>
              </span>
            </div>
          ))}
          <div className="text-muted-foreground pt-1">
            {formatDateBR(formData.departure_date)}
            {!formData.one_way && formData.return_date && ` → ${formatDateBR(formData.return_date)}`}
            {" · "}{formData.passengers} pax
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-3"><CardTitle className="text-sm">Precificação</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          <Row label="Custo total (Nipon)" value={formatBRL(formData.pricing.nipon_value || formData.pricing.total_nipon || 0)} />
          {!isParceiroMode && (
            <>
              <Row label="Valor de venda" value={formatBRL(formData.pricing.sale_value)} />
              <Row label="Comissão do vendedor" value={formatBRL(commission.total)} bold />
            </>
          )}
          {isParceiroMode && (
            <Row
              label="Valor cobrado da parceira"
              value={formatBRL(parseBR(formData.pricing.sale_value))}
              bold
            />
          )}
        </CardContent>
      </Card>

      <Card className="bg-primary text-primary-foreground">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <div className="text-xs opacity-80">
              {isParceiroMode ? "VALOR COBRADO DA PARCEIRA" : "VALOR TOTAL DA PROPOSTA"}
            </div>
            <div className="text-2xl font-bold mt-1">
              {formatBRL(isParceiroMode
                ? (parseBR(formData.pricing.sale_value) || formData.pricing.nipon_value || 0)
                : totalValue)}
            </div>
          </div>
          <Sparkles className="h-10 w-10 opacity-30" />
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
        <Button
          onClick={handleWhatsapp}
          disabled={saving}
          className="bg-success hover:bg-success text-white gap-2 h-12 disabled:opacity-70"
        >
          {saving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <MessageCircle className="h-5 w-5" />
          )}
          {saving ? "Salvando..." : "📱 Gerar texto WhatsApp"}
        </Button>
        <Button
          onClick={handleGerarPDF}
          disabled={saving}
          className="bg-[#0D2B6E] hover:bg-[#0A2259] text-white gap-2 h-12 disabled:opacity-70"
        >
          {saving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <FileText className="h-5 w-5" />
          )}
          {saving ? "Salvando..." : "📄 Gerar PDF profissional"}
        </Button>
      </div>

      {savedQuote && (
        <div className="p-3 rounded-lg bg-success/10 border border-success/30 flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4 text-success" /> Orçamento salvo
          </span>
          <Button variant="link" size="sm" onClick={() => navigate("/vendedor/orcamentos")}>
            Ver no painel de orçamentos
          </Button>
        </div>
      )}

      {/* Modal WhatsApp */}
      <Dialog open={whatsappOpen} onOpenChange={setWhatsappOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Texto do WhatsApp</DialogTitle>
            <DialogDescription>
              Copie e cole no WhatsApp do cliente.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            readOnly
            value={whatsappText}
            className="min-h-[400px] font-mono text-xs"
          />
          <DialogFooter>
            <Button onClick={copy} className="gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copiado!" : "Copiar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// ─── Componente Principal ───────────────────────────────────────────
export default function VendedorOrcamento() {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [formData, setFormData] = useState(initialFormData);
  const [searchParams, setSearchParams] = useSearchParams();
  const fromQuoteId = searchParams.get("from");
  const { toast: orcamentoToast } = useToast();

  const apiKeyMissing = !import.meta.env.VITE_ANTHROPIC_API_KEY;

  // Pré-preenche o gerador a partir de uma cotação existente (mesmo cliente, novos voos)
  useEffect(() => {
    if (!fromQuoteId) return;
    let cancelled = false;
    (async () => {
      const parent = await localClient.entities.Quotes.get(fromQuoteId);
      if (!parent || cancelled) return;
      // Apenas para destinatário "cliente"
      if (parent.recipient_type === "parceiro") {
        orcamentoToast({
          title: "Cotação derivada não disponível",
          description: "Cotações de parceiro não suportam derivação.",
          variant: "destructive",
        });
        return;
      }
      const all = (await localClient.entities.Quotes.list()) || [];
      // Conta head + filhos da mesma família para gerar a sequence
      const headId = parent.parent_quote_id || parent.id;
      const siblings = all.filter(
        (q) => q.id === headId || q.parent_quote_id === headId
      );
      const nextSequence = siblings.length + 1;

      setFormData((prev) => ({
        ...prev,
        recipient_type: "cliente",
        partner_id: null,
        partner_name: null,
        client: parent.client || null,
        passengers: parent.passengers || 1,
        baggage: parent.baggage || prev.baggage,
        product: parent.product || prev.product,
        ticket_type: parent.ticket_type || prev.ticket_type,
        parent_quote_id: headId,
        quote_sequence: nextSequence,
        // Limpa os dados que devem ser preenchidos novamente
        flight_images: [],
        itinerary: { trechos: [] },
        itinerary_reviewed: false,
        departure_date: "",
        return_date: "",
        one_way: false,
        pricing: { ...initialFormData.pricing },
        additional: { ...initialFormData.additional },
        competitor: { ...initialFormData.competitor },
        services: { ...initialFormData.services },
      }));
      // Pula o Bloco 1 (Cliente) já preenchido
      setCompletedSteps((p) => Array.from(new Set([...p, 1])));
      setCurrentStep(2);
      orcamentoToast({
        title: "Nova cotação para o mesmo cliente",
        description: `Cotação #${nextSequence} para ${parent.client?.name || "este cliente"}. Preencha os novos voos e valores.`,
      });
    })();
    return () => { cancelled = true; };
     
  }, [fromQuoteId]);

  const unlinkParent = () => {
    setFormData((p) => ({ ...p, parent_quote_id: null, quote_sequence: 1 }));
    const next = new URLSearchParams(searchParams);
    next.delete("from");
    setSearchParams(next, { replace: true });
    orcamentoToast({
      title: "Vínculo removido",
      description: "Esta cotação não estará mais vinculada ao cliente anterior.",
    });
  };

  // Cálculos derivados — considera nº de passageiros e modo "Cobrado por: pessoa | total".
  const totalValue = useMemo(() => {
    const pr = formData.pricing;
    const pax = Math.max(1, Number(formData.passengers) || 1);
    const saleInput = parseBR(pr.sale_value);
    const saleTotal = pr.sale_per === "total" ? saleInput : saleInput * pax;
    return (
      saleTotal +
      (formData.additional.active ? parseBR(formData.additional.value) : 0) +
      (formData.services.insurance.active ? parseBR(formData.services.insurance.value) : 0) +
      (formData.services.transfer.active ? parseBR(formData.services.transfer.value) : 0)
    );
  }, [formData]);

  // Comissão calculada via fonte única (pricingCalculator). Inclui detecção
  // de Carteira própria (30% no lucro Nipon) e multiplicação correta por pax.
  const commission = useMemo(() => {
    const result = computeCommission(formData);
    return {
      base: result.comissaoBase,
      extra: result.comissaoExtra,
      total: result.total,
    };
  }, [formData]);

  // Validação por bloco
  const isParceiroMode = formData.recipient_type === "parceiro";
  const canAdvance = useMemo(() => {
    switch (currentStep) {
      case 1:
        return isParceiroMode ? !!formData.partner_id : !!formData.client?.id;
      case 2: return formData.product === "aereo";
      case 3:
        return (
          formData.itinerary.trechos.length > 0 &&
          formData.itinerary_reviewed &&
          !!formData.departure_date &&
          (formData.one_way || !!formData.return_date)
        );
      case 4: {
        if (isParceiroMode) {
          // Parceiro: basta ter Nipon definido (custo preenchido).
          const nipon = Number(formData.pricing?.nipon_value) || Number(formData.pricing?.total_nipon) || 0;
          return nipon > 0;
        }
        const sale = parseBR(formData.pricing.sale_value);
        return sale > 0;
      }
      default: return true;
    }
  }, [currentStep, formData, isParceiroMode]);

  const next = () => {
    if (!canAdvance) return;
    setCompletedSteps((prev) => Array.from(new Set([...prev, currentStep])));
    setCurrentStep((s) => Math.min(5, s + 1));
  };
  const prev = () => setCurrentStep((s) => Math.max(1, s - 1));

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Gerador de Orçamento</h1>
        </div>
        <p className="text-muted-foreground text-sm ml-12">
          Preencha as informações para gerar sua cotação profissional
        </p>
      </div>

      {apiKeyMissing && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-sm">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <span className="text-warning dark:text-warning">
            Configure VITE_ANTHROPIC_API_KEY no .env para usar a extração automática de itinerário.
          </span>
        </div>
      )}

      {formData.parent_quote_id && (
        <div className="bg-warning/10 border-2 border-warning/30 rounded-xl p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-warning text-white flex items-center justify-center font-bold flex-shrink-0">
            #{formData.quote_sequence}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-warning">
              Nova cotação para {formData.client?.name || formData.partner_name || "este cliente"}
            </p>
            <p className="text-sm text-warning mt-1">
              Cotação #{formData.quote_sequence} para este cliente. Os dados de cliente, passageiros e bagagem foram mantidos. Preencha os novos voos e valores.
            </p>
          </div>
          <button
            type="button"
            onClick={unlinkParent}
            className="text-warning hover:text-warning text-sm underline shrink-0"
          >
            Desvincular
          </button>
        </div>
      )}

      {/* Stepper */}
      <Card className="border-border/50">
        <CardContent className="pt-5">
          <Stepper currentStep={currentStep} completedSteps={completedSteps} />
        </CardContent>
      </Card>

      {/* Conteúdo do bloco ativo */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">
            {currentStep === 1 && "1. Cliente"}
            {currentStep === 2 && "2. Produto"}
            {currentStep === 3 && "3. Itinerário"}
            {currentStep === 4 && "4. Precificação"}
            {currentStep === 5 && "5. Revisão e Geração"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentStep === 1 && <BlocoCliente formData={formData} setFormData={setFormData} />}
          {currentStep === 2 && <BlocoProduto formData={formData} setFormData={setFormData} />}
          {currentStep === 3 && <BlocoItinerario formData={formData} setFormData={setFormData} />}
          {currentStep === 4 && <BlocoPrecificacao formData={formData} setFormData={setFormData} />}
          {currentStep === 5 && (
            <BlocoGerar
              formData={formData}
              totalValue={totalValue}
              commission={commission}
              onSaved={() => setCompletedSteps((p) => Array.from(new Set([...p, 5])))}
            />
          )}
        </CardContent>
      </Card>

      {/* Footer Nav */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={prev}
          disabled={currentStep === 1}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        {currentStep < 5 && (
          <Button onClick={next} disabled={!canAdvance} className="gap-2">
            Próximo <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
