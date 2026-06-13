import { useState, useRef, useEffect, Fragment } from "react";
import {
  ImagePlus, X, Check, Loader2, AlertTriangle, Info,
  Sparkles, ClipboardPaste, Plus, Trash2,
  PlaneTakeoff, PlaneLanding,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Checkbox } from "@/shared/ui/checkbox";
import { Badge } from "@/shared/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/shared/ui/select";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from "@/shared/ui/tooltip";
import { useToast } from "@/shared/ui/use-toast";
import { cn } from "@/shared/lib/utils";
import { normalizeItinerary } from "@/features/orcamento/lib/normalizeItinerary";
import { calculateSegmentDuration } from "@/shared/lib/timeParser";
import {
  toBase64, TICKET_TYPES, createLegacySegment, getSegmentos, syncTrechoFromSegmentos,
} from "@/features/orcamento/lib/orcamentoHelpers";
import SegmentoCard from "@/features/orcamento/components/SegmentoCard";
import HiddenCitySummary from "@/features/orcamento/components/HiddenCitySummary";

// ─── Bloco 3 — Itinerário ───────────────────────────────────────────
export default function BlocoItinerario({ formData, setFormData }) {
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
