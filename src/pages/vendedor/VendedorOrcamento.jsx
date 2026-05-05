import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText, Plane, Palmtree, User, UserPlus, Search, Lock,
  ImagePlus, X, Check, Loader2, AlertTriangle, Info,
  ArrowLeft, ArrowRight, Copy, Sparkles, ChevronRight, ClipboardPaste,
  DollarSign, Wallet, Plus, Trash2, MessageCircle
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
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { localClient } from "@/api/localClient";
import { openQuoteInNewTab } from "@/lib/generateQuoteHTML";
import { useAuth } from "@/lib/AuthContext";
import { getCostForMiles, getSaleForMiles, getTierForMiles } from "@/lib/milesHelper";

// ─── Helpers ────────────────────────────────────────────────────────
const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const formatBRL = (n) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDateBR = (dateStr) => {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
};

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

const LEAD_ORIGINS = [
  "Marketing (Zenvia)",
  "Carteira própria",
  "Indicação",
  "Instagram",
  "Google",
  "Outro",
];

const TICKET_TYPES = [
  { value: "Normal", help: "Bilhete padrão ponto a ponto" },
  { value: "Hidden City", help: "Passageiro desembarca antes do destino final do bilhete" },
  { value: "Quebra de Trecho", help: "Bilhetes separados para trechos diferentes — mínimo 2h30m entre voos" },
  { value: "Imigração", help: "Pacote com voo + assessoria para imigração" },
];

const initialFormData = {
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
  },
  additional: { active: false, value: "", description: "" },
  competitor: { active: false, name: "", value: "", fare_type: "Econômica" },
  services: {
    insurance: { active: false, value: "" },
    transfer: { active: false, value: "" },
  },
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
                  isDone && "bg-emerald-500 border-emerald-500 text-white",
                  isActive && !isDone && "bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/30",
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
                  completedSteps.includes(s.n) ? "bg-emerald-500" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Bloco 1 — Cliente ──────────────────────────────────────────────
function BlocoCliente({ formData, setFormData }) {
  const [mode, setMode] = useState(formData.client?.id ? "select" : "select");
  const [search, setSearch] = useState("");
  const [clients, setClients] = useState([]);
  const [newClient, setNewClient] = useState({ name: "", phone: "", lead_origin: "" });
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      const list = await localClient.entities.Clients.list();
      setClients(list || []);
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

  return (
    <div className="space-y-4">
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
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-500/10 ring-1 ring-amber-500"
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
                    {isSelected && <Check className="h-4 w-4 text-amber-600" />}
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
                {LEAD_ORIGINS.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
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
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-emerald-600" />
          <span><strong>{formData.client.name}</strong> selecionado</span>
        </div>
      )}
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
            ? "border-amber-500 bg-amber-50 dark:bg-amber-500/10 shadow-md shadow-amber-500/10"
            : "border-border hover:border-primary/40 hover:bg-muted/30"
        )}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-lg bg-primary/10">
            <Plane className="h-6 w-6 text-primary" />
          </div>
          <div className="font-semibold">Aéreo</div>
          {formData.product === "aereo" && (
            <Check className="h-5 w-5 text-amber-600 ml-auto" />
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

Retorne APENAS um JSON válido, sem markdown, sem backticks, neste formato exato:
{
  "trechos": [
    {
      "tipo": "ida" ou "volta",
      "companhia": "nome da companhia aérea",
      "numero_voo": "código do voo se visível",
      "origem_iata": "XXX",
      "origem_cidade": "nome da cidade",
      "destino_iata": "XXX",
      "destino_cidade": "nome da cidade",
      "horario_saida": "HH:MM",
      "horario_chegada": "HH:MM",
      "duracao": "Xh XXmin",
      "escalas": 0,
      "aeroporto_escala": "XXX ou null",
      "tempo_escala": "Xh XXmin ou null",
      "classe": "Econômica/Executiva/Primeira se visível"
    }
  ]
}
Se houver dois trechos visíveis (ida e volta), retorne ambos no array. Se houver múltiplas opções de voo, retorne apenas o voo selecionado/destacado ou o primeiro visível.`;

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
      setFormData((p) => ({
        ...p,
        itinerary: { trechos: parsed.trechos || [] },
        itinerary_reviewed: false,
      }));
      toast({ title: "Itinerário extraído", description: `${parsed.trechos?.length || 0} trecho(s) detectado(s)` });
    } catch (e) {
      console.error(e);
      setError(`Erro ao processar imagens: ${e.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const updateTrecho = (idx, field, value) => {
    setFormData((p) => {
      const trechos = [...p.itinerary.trechos];
      const patch = { [field]: value };
      if (field === "duracao") patch._duracao_manual = true;
      trechos[idx] = { ...trechos[idx], ...patch };
      return { ...p, itinerary: { trechos }, itinerary_reviewed: false };
    });
  };

  // Recalcula duração automaticamente quando saída/chegada mudam
  // (a menos que o vendedor já tenha editado a duração manualmente)
  const trechosTimeKey = (formData.itinerary?.trechos || [])
    .map((t) => `${t.horario_saida || ""}~${t.horario_chegada || ""}~${t._duracao_manual ? "m" : "a"}`)
    .join("|");
  useEffect(() => {
    setFormData((p) => {
      const trechos = p.itinerary?.trechos || [];
      let changed = false;
      const next = trechos.map((t) => {
        if (t._duracao_manual) return t;
        if (!t.horario_saida || !t.horario_chegada) return t;
        const dur = calculateDuration(t.horario_saida, t.horario_chegada);
        if (dur && dur !== t.duracao) {
          changed = true;
          return { ...t, duracao: dur };
        }
        return t;
      });
      if (!changed) return p;
      return { ...p, itinerary: { ...p.itinerary, trechos: next } };
    });
  }, [trechosTimeKey]);

  const addTrechoManual = () => {
    setFormData((p) => ({
      ...p,
      itinerary: {
        trechos: [
          ...p.itinerary.trechos,
          {
            tipo: p.itinerary.trechos.length === 0 ? "ida" : "volta",
            companhia: "", numero_voo: "",
            origem_iata: "", origem_cidade: "",
            destino_iata: "", destino_cidade: "",
            horario_saida: "", horario_chegada: "",
            duracao: "", escalas: 0,
            aeroporto_escala: "", tempo_escala: "",
            classe: "Econômica",
          },
        ],
      },
    }));
  };

  const removeTrecho = (idx) => {
    setFormData((p) => ({
      ...p,
      itinerary: { trechos: p.itinerary.trechos.filter((_, i) => i !== idx) },
    }));
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
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10"
                  : "border-border hover:border-primary/40 hover:bg-muted/30"
              )}
            >
              {justPasted ? (
                <>
                  <Check className="h-7 w-7 text-emerald-600" />
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
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
                      className="absolute top-1 right-1 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
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
              className="w-full bg-amber-500 hover:bg-amber-600 text-white gap-2"
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {processing ? "Analisando imagens do voo..." : "Processar Itinerário"}
            </Button>
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <span className="text-red-600">{error}</span>
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
                <Badge className="bg-emerald-500 hover:bg-emerald-500 gap-1">
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
            {formData.itinerary.trechos.map((t, idx) => (
              <div key={idx} className="p-4 rounded-lg border border-border space-y-3 bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">{t.tipo}</Badge>
                    <span className="text-sm font-medium">
                      {t.companhia || "Companhia"} {t.numero_voo && `· ${t.numero_voo}`}
                    </span>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => removeTrecho(idx)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Companhia"
                    value={t.companhia || ""}
                    onChange={(e) => updateTrecho(idx, "companhia", e.target.value)}
                  />
                  <Input
                    placeholder="Número do voo"
                    value={t.numero_voo || ""}
                    onChange={(e) => updateTrecho(idx, "numero_voo", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">Origem</Label>
                    <Input
                      placeholder="IATA"
                      value={t.origem_iata || ""}
                      onChange={(e) => updateTrecho(idx, "origem_iata", e.target.value.toUpperCase())}
                    />
                    <Input
                      placeholder="Cidade"
                      value={t.origem_cidade || ""}
                      onChange={(e) => updateTrecho(idx, "origem_cidade", e.target.value)}
                    />
                    <Input
                      placeholder="Saída HH:MM"
                      value={t.horario_saida || ""}
                      onChange={(e) => updateTrecho(idx, "horario_saida", e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col items-center text-xs text-muted-foreground gap-1">
                    <ChevronRight className="h-5 w-5" />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Input
                          placeholder="Duração"
                          value={t.duracao || ""}
                          onChange={(e) => updateTrecho(idx, "duracao", e.target.value)}
                          className={cn(
                            "text-center",
                            !t._duracao_manual && t.duracao && "bg-muted/40"
                          )}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        Calculado automaticamente pelos horários. Edite se necessário.
                      </TooltipContent>
                    </Tooltip>
                    <Input
                      placeholder="Escalas"
                      type="number"
                      min={0}
                      value={t.escalas || 0}
                      onChange={(e) => updateTrecho(idx, "escalas", parseInt(e.target.value) || 0)}
                      className="text-center"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Destino</Label>
                    <Input
                      placeholder="IATA"
                      value={t.destino_iata || ""}
                      onChange={(e) => updateTrecho(idx, "destino_iata", e.target.value.toUpperCase())}
                    />
                    <Input
                      placeholder="Cidade"
                      value={t.destino_cidade || ""}
                      onChange={(e) => updateTrecho(idx, "destino_cidade", e.target.value)}
                    />
                    <Input
                      placeholder="Chegada HH:MM"
                      value={t.horario_chegada || ""}
                      onChange={(e) => updateTrecho(idx, "horario_chegada", e.target.value)}
                    />
                  </div>
                </div>
                {t.escalas > 0 && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                    <Input
                      placeholder="Aeroporto escala (IATA)"
                      value={t.aeroporto_escala || ""}
                      onChange={(e) => updateTrecho(idx, "aeroporto_escala", e.target.value)}
                    />
                    <Input
                      placeholder="Tempo de escala"
                      value={t.tempo_escala || ""}
                      onChange={(e) => updateTrecho(idx, "tempo_escala", e.target.value)}
                    />
                  </div>
                )}
              </div>
            ))}

            {formData.itinerary.trechos.length > 0 && !formData.itinerary_reviewed && (
              <Button
                variant="outline"
                onClick={() => setFormData((p) => ({ ...p, itinerary_reviewed: true }))}
                className="w-full gap-2 border-emerald-500/50 text-emerald-700 hover:bg-emerald-500/10"
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

  useEffect(() => {
    (async () => {
      const list = await localClient.entities.MilesTable.list();
      setMilesTable(list || []);
    })();
  }, []);

  const isSplit = formData.ticket_type === "Quebra de Trecho";

  // Inicialização automática do modo split conforme ticket_type / itinerário.
  useEffect(() => {
    if (isSplit) {
      const trechos = formData.itinerary?.trechos || [];
      setFormData((prev) => {
        const existing = prev.pricing?.trechos || [];
        const newTrechos = trechos.map((t, idx) => {
          const label = `${t.tipo === "ida" ? "Ida" : "Volta"} — ${t.origem_iata || "?"} → ${t.destino_iata || "?"}`;
          const prior = existing[idx];
          return prior
            ? { ...prior, label }
            : {
                label,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSplit, formData.itinerary?.trechos?.length]);

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

  const selectedProgram = useMemo(
    () => milesTable.find((m) => m.id === formData.pricing.program_id) || null,
    [milesTable, formData.pricing.program_id]
  );

  const appliedTier = useMemo(
    () => (selectedProgram ? getTierForMiles(selectedProgram, formData.pricing.miles_qty) : null),
    [selectedProgram, formData.pricing.miles_qty]
  );

  const appliedCostPerThousand = useMemo(() => {
    if (!selectedProgram) return Number(formData.pricing.miles_value_per_thousand) || 0;
    return getCostForMiles(selectedProgram, formData.pricing.miles_qty);
  }, [selectedProgram, formData.pricing.miles_qty, formData.pricing.miles_value_per_thousand]);

  const appliedSalePerThousand = useMemo(() => {
    if (!selectedProgram) return Number(formData.pricing.miles_value_per_thousand) || 0;
    return getSaleForMiles(selectedProgram, formData.pricing.miles_qty);
  }, [selectedProgram, formData.pricing.miles_qty, formData.pricing.miles_value_per_thousand]);

  // Cálculos
  const calc = useMemo(() => {
    const pr = formData.pricing;
    let cost_brl = 0;       // custo real interno (cost_per_thousand × milhas) — sem taxa
    let venda_base = 0;     // valor de venda das milhas (sale_per_thousand)
    let nipon = 0;
    let acrescimo = 0;
    let custoTotal = 0;

    if (pr.is_split) {
      // Em modo split, custo e nipon vêm dos totais consolidados (já incluem taxas).
      nipon = Number(pr.total_nipon) || 0;
      custoTotal = Number(pr.total_cost) || 0;
      cost_brl = custoTotal;
    } else {
      const tax = Number(pr.tax) || 0;
      if (pr.type === "milhas") {
        const milhas = Number(pr.miles_qty) || 0;
        cost_brl = (milhas / 1000) * appliedCostPerThousand;
        venda_base = (milhas / 1000) * appliedSalePerThousand;
        // Nipon (preço mínimo de venda) usa o preço de VENDA da milha, não o custo
        nipon = venda_base + tax;
      } else {
        const cost = Number(pr.cost_brl) || 0;
        const base = cost + tax;
        acrescimo = pr.is_azul ? 0 : base * 0.10;
        nipon = base + acrescimo;
        cost_brl = cost;
      }
      custoTotal = cost_brl + tax;
    }

    const sale = Number(pr.sale_value) || 0;
    // Comissão base = 25% do lucro Nipon (nipon - custo total).
    const lucroNipon = Math.max(0, nipon - custoTotal);
    const comissaoBase = lucroNipon * 0.25;
    // Excedente: só conta o que passou do Nipon (nunca negativo).
    const excedente = Math.max(0, sale - nipon);
    const comissaoExtra = excedente * 0.45;
    const comissaoTotal = comissaoBase + comissaoExtra;
    // Lucro bruto real (mantido para exibição)
    const lucroBruto = sale - custoTotal;

    const total =
      sale +
      (formData.additional.active ? Number(formData.additional.value) || 0 : 0) +
      (formData.services.insurance.active ? Number(formData.services.insurance.value) || 0 : 0) +
      (formData.services.transfer.active ? Number(formData.services.transfer.value) || 0 : 0);

    return {
      cost_brl, venda_base, nipon, acrescimo,
      lucroNipon, lucroBruto, custoTotal,
      comissaoBase, excedente, comissaoExtra, comissaoTotal,
      total,
    };
  }, [formData, appliedCostPerThousand, appliedSalePerThousand]);

  // Mantém nipon_value/cost_brl_calc sincronizados (apenas no modo single).
  useEffect(() => {
    if (formData.pricing.is_split) return;
    setFormData((p) => ({
      ...p,
      pricing: { ...p.pricing, nipon_value: calc.nipon, cost_brl_calc: calc.cost_brl },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calc.nipon, calc.cost_brl, formData.pricing.is_split]);

  const sale = Number(formData.pricing.sale_value) || 0;
  const aboveNipon = sale >= calc.nipon && sale > 0;

  return (
    <div className="space-y-6">
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
        {isSplit ? (
          <SplitPricing
            trechos={formData.pricing?.trechos || []}
            milesTable={milesTable}
            onChange={updateTrechoPricing}
          />
        ) : (
          <Tabs
            value={formData.pricing.type}
            onValueChange={(v) => setPricing({ type: v })}
          >
            <TabsList className="grid grid-cols-2 w-full max-w-sm">
              <TabsTrigger value="milhas">Milhas</TabsTrigger>
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
                        <SelectItem key={m.id} value={m.id}>
                          {m.program} — {formatBRL(m.cost_per_thousand)}/mil
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Custo em milhas</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 80000"
                    value={formData.pricing.miles_qty}
                    onChange={(e) => setPricing({ miles_qty: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Taxa de embarque (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 320.50"
                    value={formData.pricing.tax}
                    onChange={(e) => setPricing({ tax: e.target.value })}
                  />
                </div>
              </div>
              <Card className="bg-muted/40 border-border/50">
                <CardContent className="p-4 space-y-1.5 text-sm">
                  {appliedTier && (
                    <div className="flex items-center justify-between p-2 mb-1 rounded-lg bg-purple-500/10 border border-purple-500/30">
                      <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                        Faixa aplicada: {appliedTier.label}
                      </span>
                      <span className="text-xs text-purple-600 dark:text-purple-400">
                        base venda: {formatBRL(selectedProgram?.sale_per_thousand)}/mil
                      </span>
                    </div>
                  )}
                  <Row label="Venda do milheiro" value={formatBRL(appliedSalePerThousand)} />
                  <Row label="Custo real (interno)" value={formatBRL(appliedCostPerThousand)} muted />
                  <Row label="Valor das milhas (venda)" value={formatBRL(calc.venda_base)} />
                  <Row label="Taxa de embarque" value={formatBRL(formData.pricing.tax)} />
                  <Separator className="my-2" />
                  <Row label="VALOR NIPON (venda mínima)" value={formatBRL(calc.nipon)} bold accent />
                  <Row
                    label="Custo real total"
                    value={formatBRL(calc.cost_brl + (Number(formData.pricing.tax) || 0))}
                    muted
                  />
                  <Row
                    label="Margem bruta"
                    value={formatBRL(calc.nipon - calc.cost_brl - (Number(formData.pricing.tax) || 0))}
                    bold
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="dinheiro" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Preço de custo (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.pricing.cost_brl}
                    onChange={(e) => setPricing({ cost_brl: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Taxa de embarque (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.pricing.tax}
                    onChange={(e) => setPricing({ tax: e.target.value })}
                  />
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
                  <Row label="Custo base" value={formatBRL(formData.pricing.cost_brl)} />
                  <Row label="Taxa de embarque" value={formatBRL(formData.pricing.tax)} />
                  <Row
                    label="Acréscimo 10%"
                    value={formData.pricing.is_azul ? "Isento — Azul" : formatBRL(calc.acrescimo)}
                  />
                  <Separator className="my-2" />
                  <Row label="VALOR NIPON (venda mínima)" value={formatBRL(calc.nipon)} bold accent />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
        </CardContent>
      </Card>

      {/* 4B - Valor de venda */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Valor de Venda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 max-w-xs">
            <Label>Valor de venda ao cliente (R$) *</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.pricing.sale_value}
              onChange={(e) => setPricing({ sale_value: e.target.value })}
            />
          </div>
          {sale > 0 && !aboveNipon && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span className="text-amber-700 dark:text-amber-400">
                Valor de venda ({formatBRL(sale)}) está abaixo do Nipon ({formatBRL(calc.nipon)}).
                Sem comissão extra — comissão base calculada sobre o lucro mínimo do Nipon.
              </span>
            </div>
          )}
          {sale > 0 && (
            <Card className={cn(
              aboveNipon
                ? "bg-emerald-500/5 border-emerald-500/30"
                : "bg-muted/40 border-border/60"
            )}>
              <CardContent className="p-4 space-y-1.5 text-sm">
                <Row label="Lucro Nipon (nipon − custo)" value={formatBRL(calc.lucroNipon)} />
                <Row label="Comissão base (25% do lucro Nipon)" value={formatBRL(calc.comissaoBase)} />
                <Row label="Excedente sobre Nipon" value={formatBRL(calc.excedente)} />
                <Row label="Comissão extra (45% do excedente)" value={formatBRL(calc.comissaoExtra)} />
                <Separator className="my-2" />
                <Row
                  label="COMISSÃO TOTAL DO VENDEDOR"
                  value={formatBRL(calc.comissaoTotal)}
                  bold
                  className={aboveNipon ? "text-emerald-700" : "text-foreground"}
                />
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* 4C - Valor adicional */}
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
                  type="number"
                  step="0.01"
                  value={formData.additional.value}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, additional: { ...p.additional, value: e.target.value } }))
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
                  type="number"
                  step="0.01"
                  value={formData.competitor.value}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, competitor: { ...p.competitor, value: e.target.value } }))
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
            {Number(formData.competitor.value) > 0 && sale > 0 && (
              <div className="p-3 rounded-lg bg-muted/40 border text-sm">
                Nosso preço: <strong>{formatBRL(sale)}</strong> vs Concorrência:{" "}
                <strong>{formatBRL(formData.competitor.value)}</strong> →{" "}
                <span className="text-emerald-700">
                  Economia de {formatBRL(Number(formData.competitor.value) - sale)} (
                  {(((Number(formData.competitor.value) - sale) / Number(formData.competitor.value)) * 100).toFixed(1)}%)
                </span>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* 4E - Serviços adicionais */}
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
                type="number"
                step="0.01"
                placeholder="R$"
                disabled={!formData.services[s.key].active}
                value={formData.services[s.key].value}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    services: { ...p.services, [s.key]: { ...p.services[s.key], value: e.target.value } },
                  }))
                }
                className="w-32"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Total */}
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <div className="text-xs opacity-80">VALOR TOTAL DA PROPOSTA</div>
            <div className="text-2xl font-bold mt-1">{formatBRL(calc.total)}</div>
          </div>
          <DollarSign className="h-10 w-10 opacity-30" />
        </CardContent>
      </Card>
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

// ─── Quebra de Trecho — múltiplas emissões ─────────────────────────
function SplitPricing({ trechos, milesTable, onChange }) {
  const totalNipon = trechos.reduce((s, t) => s + (Number(t.nipon_value) || 0), 0);
  const totalCost = trechos.reduce((s, t) => s + (Number(t.cost_total) || 0), 0);
  const totalMargin = totalNipon - totalCost;

  if (trechos.length === 0) {
    return (
      <div className="p-4 rounded-lg bg-muted/40 border border-dashed text-sm text-muted-foreground text-center">
        Adicione trechos no Bloco 3 para configurar a precificação por trecho.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm">
        <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-amber-800 dark:text-amber-300">
          <strong>Quebra de Trecho:</strong> cada trecho pode ser emitido com método
          diferente (ex: ida em milhas Latam, volta em milhas Smiles, ou um trecho em milhas e outro em dinheiro).
        </div>
      </div>

      {trechos.map((trecho, idx) => (
        <TrechoPricingCard
          key={idx}
          trecho={trecho}
          index={idx}
          milesTable={milesTable}
          onChange={(updated) => onChange(idx, updated)}
        />
      ))}

      {/* Totais consolidados */}
      <Card className="bg-slate-900 text-white border-slate-800">
        <CardContent className="p-5 space-y-2">
          <div className="text-[10px] uppercase tracking-widest text-slate-400">
            Totais consolidados
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-300">Custo total:</span>
            <span className="font-semibold">{formatBRL(totalCost)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-300">Valor Nipon total:</span>
            <span className="font-semibold text-amber-400">{formatBRL(totalNipon)}</span>
          </div>
          <Separator className="my-2 bg-slate-700" />
          <div className="flex justify-between text-sm">
            <span className="text-slate-300">Margem bruta:</span>
            <span className={cn("font-semibold", totalMargin >= 0 ? "text-emerald-400" : "text-red-400")}>
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
    const tax = Number(trecho.tax) || 0;

    if (trecho.type === "milhas") {
      const milhas = Number(trecho.miles_qty) || 0;
      if (selectedProgram && milhas > 0) {
        const costPerThousand = getCostForMiles(selectedProgram, milhas);
        const salePerThousand = getSaleForMiles(selectedProgram, milhas);
        cost_total = (milhas / 1000) * costPerThousand + tax;
        nipon_value = (milhas / 1000) * salePerThousand + tax;
      }
    } else {
      const cost = Number(trecho.cost_brl) || 0;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
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
                      <SelectItem key={m.id} value={m.id}>
                        {m.program} — {formatBRL(m.cost_per_thousand)}/mil
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Custo em milhas</Label>
                <Input
                  type="number"
                  placeholder="Ex: 80000"
                  value={trecho.miles_qty || ""}
                  onChange={(e) => onChange({ ...trecho, miles_qty: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Taxa de embarque (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 320.50"
                  value={trecho.tax || ""}
                  onChange={(e) => onChange({ ...trecho, tax: e.target.value })}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="dinheiro" className="space-y-3 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Preço de custo (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={trecho.cost_brl || ""}
                  onChange={(e) => onChange({ ...trecho, cost_brl: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Taxa de embarque (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={trecho.tax || ""}
                  onChange={(e) => onChange({ ...trecho, tax: e.target.value })}
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

// ─── Bloco 5 — Gerar ────────────────────────────────────────────────
function BlocoGerar({ formData, totalValue, commission, onSaved }) {
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [whatsappText, setWhatsappText] = useState("");
  const [copied, setCopied] = useState(false);
  const [savedQuote, setSavedQuote] = useState(null);
  const [quoteNumber] = useState(
    () => `PCD-${Math.floor(10000 + Math.random() * 90000)}`
  );
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const buildWhatsapp = () => {
    const t = formData;
    const trechos = t.itinerary.trechos || [];
    let texto = `✈️ PassagensComDesconto\n📌 CADASTUR: 62830477000151\n\n`;
    texto += `Olá ${t.client?.name || ""}! Segue sua cotação personalizada com todo suporte da nossa agência.\n\n`;
    texto += `🛫 ITINERÁRIO:\n`;
    trechos.forEach((tr) => {
      const escalaInfo =
        tr.escalas > 0
          ? `${tr.escalas} escala(s) via ${tr.aeroporto_escala || "—"}`
          : "Voo direto";
      texto += `${tr.tipo === "volta" ? "↩️ VOLTA: " : ""}${tr.origem_cidade} (${tr.origem_iata}) ➝ ${tr.destino_cidade} (${tr.destino_iata})\n`;
      texto += `✈️ ${escalaInfo} operado por ${tr.companhia}${tr.numero_voo ? ` (${tr.numero_voo})` : ""}\n`;
      texto += `🕒 Saída: ${tr.horario_saida}\n🕒 Chegada: ${tr.horario_chegada}\n⏱️ Duração: ${tr.duracao}\n\n`;
    });

    texto += `📅 DATAS:\n`;
    texto += `IDA: ${formatDateBR(t.departure_date)}\n`;
    texto += `VOLTA: ${t.one_way ? "Apenas ida" : formatDateBR(t.return_date)}\n\n`;

    texto += `💰 VALOR TOTAL: ${formatBRL(totalValue)}\n`;
    texto += `➡️ Consulte opções de parcelamento no cartão 💳\n\n`;

    texto += `👤 PASSAGEIROS:\n${t.passengers} ${t.passengers > 1 ? "Adultos" : "Adulto"}\n\n`;

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

    if (t.services.insurance.active) texto += `🛡️ Seguro Viagem incluso (${formatBRL(t.services.insurance.value)})\n`;
    if (t.services.transfer.active) texto += `🚗 Transfer incluso (${formatBRL(t.services.transfer.value)})\n`;
    if (t.additional.active && t.additional.description) {
      texto += `➕ ${t.additional.description}: ${formatBRL(t.additional.value)}\n`;
    }
    if (t.services.insurance.active || t.services.transfer.active || t.additional.active) texto += `\n`;

    texto += `✅ Taxas inclusas\n✅ Assessoria e suporte durante todo o trajeto\n✅ Check-in antecipado\n\n`;
    texto += `⚠️ Observações importantes:\nValores sujeitos a alteração até o fechamento 🚨\nTaxa de cancelamento conforme regras da cia aérea 🚨\nPagamento no crédito pode ter taxas adicionais 🚨\n\n`;
    texto += `📌 CNPJ: 62.830.477/0001-51\n📅 Data da cotação: ${new Date().toLocaleDateString("pt-BR")}`;

    return texto;
  };

  const persistQuote = async (text) => {
    if (savedQuote) return savedQuote;
    const quote = await localClient.entities.Quotes.create({
      quote_number: quoteNumber,
      client: formData.client,
      client_id: formData.client?.id || null,
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
      pricing: {
        ...formData.pricing,
        program: formData.pricing.program_name,
        cost_brl: formData.pricing.cost_brl_calc || formData.pricing.cost_brl,
      },
      additional: formData.additional.active ? formData.additional : null,
      competitor: formData.competitor.active ? formData.competitor : null,
      services: formData.services,
      total_value: totalValue,
      commission,
      seller_name: user?.name || "Equipe PCD",
      seller_id: user?.id || null,
      status: "Enviado",
      whatsapp_text: text,
    });
    if (!quote) {
      toast({ title: "Erro ao salvar orçamento no servidor", variant: "destructive" });
      return null;
    }
    setSavedQuote(quote);
    onSaved?.(quote);
    toast({ title: "Orçamento salvo com sucesso!" });
    return quote;
  };

  const handleWhatsapp = async () => {
    const txt = buildWhatsapp();
    setWhatsappText(txt);
    await persistQuote(txt);
    setWhatsappOpen(true);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(whatsappText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleGerarPDF = async () => {
    const txt = buildWhatsapp();
    await persistQuote(txt);
    openQuoteInNewTab({
      quote_number: quoteNumber,
      client: formData.client,
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
      pricing: formData.pricing,
      additional: formData.additional.active ? formData.additional : null,
      competitor: formData.competitor.active ? formData.competitor : null,
      services: formData.services,
      total_value: totalValue,
      commission,
      seller_name: user?.name || "Equipe PCD",
      created_date: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <Card className="border-border/50">
        <CardHeader className="pb-3"><CardTitle className="text-sm">Cliente</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          <div><strong>{formData.client?.name}</strong></div>
          <div className="text-muted-foreground">{formData.client?.phone || "—"} · {formData.client?.lead_origin || "—"}</div>
        </CardContent>
      </Card>

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
          <Row label="Custo total (Nipon)" value={formatBRL(formData.pricing.nipon_value)} />
          <Row label="Valor de venda" value={formatBRL(formData.pricing.sale_value)} />
          <Row label="Comissão do vendedor" value={formatBRL(commission.total)} bold />
        </CardContent>
      </Card>

      <Card className="bg-primary text-primary-foreground">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <div className="text-xs opacity-80">VALOR TOTAL DA PROPOSTA</div>
            <div className="text-2xl font-bold mt-1">{formatBRL(totalValue)}</div>
          </div>
          <Sparkles className="h-10 w-10 opacity-30" />
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
        <Button
          onClick={handleWhatsapp}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-12"
        >
          <MessageCircle className="h-5 w-5" /> 📱 Gerar texto WhatsApp
        </Button>
        <Button
          onClick={handleGerarPDF}
          className="bg-[#0D2B6E] hover:bg-[#0A2259] text-white gap-2 h-12"
        >
          <FileText className="h-5 w-5" /> 📄 Gerar PDF profissional
        </Button>
      </div>

      {savedQuote && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600" /> Orçamento salvo
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

  const apiKeyMissing = !import.meta.env.VITE_ANTHROPIC_API_KEY;

  // Cálculos derivados
  const totalValue = useMemo(() => {
    const sale = Number(formData.pricing.sale_value) || 0;
    return (
      sale +
      (formData.additional.active ? Number(formData.additional.value) || 0 : 0) +
      (formData.services.insurance.active ? Number(formData.services.insurance.value) || 0 : 0) +
      (formData.services.transfer.active ? Number(formData.services.transfer.value) || 0 : 0)
    );
  }, [formData]);

  const commission = useMemo(() => {
    const pr = formData.pricing;
    let custoTotal = 0;
    let nipon = 0;

    if (pr.is_split) {
      custoTotal = Number(pr.total_cost) || 0;
      nipon = Number(pr.total_nipon) || 0;
    } else {
      // Usa cost_brl_calc (calculado em BlocoPrecificacao com faixa variável aplicada se houver)
      const cost_brl = pr.type === "milhas"
        ? Number(pr.cost_brl_calc) || ((Number(pr.miles_qty) || 0) / 1000) * (Number(pr.miles_value_per_thousand) || 0)
        : Number(pr.cost_brl) || 0;
      const tax = Number(pr.tax) || 0;
      custoTotal = cost_brl + tax;
      nipon = Number(pr.nipon_value) || 0;
    }

    const sale = Number(pr.sale_value) || 0;
    const lucroNipon = Math.max(0, nipon - custoTotal);
    const base = lucroNipon * 0.25;
    const excedente = Math.max(0, sale - nipon);
    const extra = excedente * 0.45;
    return { base, extra, total: base + extra };
  }, [formData.pricing]);

  // Validação por bloco
  const canAdvance = useMemo(() => {
    switch (currentStep) {
      case 1: return !!formData.client?.id;
      case 2: return formData.product === "aereo";
      case 3:
        return (
          formData.itinerary.trechos.length > 0 &&
          formData.itinerary_reviewed &&
          !!formData.departure_date &&
          (formData.one_way || !!formData.return_date)
        );
      case 4: {
        const sale = Number(formData.pricing.sale_value) || 0;
        return sale > 0;
      }
      default: return true;
    }
  }, [currentStep, formData]);

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
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <span className="text-amber-700 dark:text-amber-400">
            Configure VITE_ANTHROPIC_API_KEY no .env para usar a extração automática de itinerário.
          </span>
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
