import { formatBRL } from "@/shared/lib/format";

export const formatBRLShort = (v) => {
  const n = Number(v || 0);
  if (n >= 1000) return `R$ ${(n / 1000).toFixed(0)}k`;
  return formatBRL(n);
};

export const monthMatches = (createdISO, monthStr) => {
  if (!createdISO || !monthStr) return false;
  const d = new Date(createdISO);
  const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return ym === monthStr;
};

// Data canônica de receita: alinhada com revenueHelper.getMonthRevenue —
// usa a data efetiva de emissão; cai para issued_date e por fim created_date.
export const getIssuedDate = (q) =>
  q?.emission_completed_date || q?.issued_date || q?.created_date || null;

export const getDaysInMonth = (monthStr) => {
  const [y, m] = monthStr.split("-").map(Number);
  return new Date(y, m, 0).getDate();
};

export const getMonthBounds = (monthStr) => {
  const [y, m] = monthStr.split("-").map(Number);
  return {
    start: new Date(y, m - 1, 1),
    end: new Date(y, m, 0, 23, 59, 59),
  };
};

export const STATUS_BADGE = {
  Ativa: "bg-warning hover:bg-warning text-white border-0",
  Futura: "bg-muted text-muted-foreground hover:bg-muted border",
  Concluída: "bg-success hover:bg-success text-white border-0",
};

export const STRETCH_TRIGGERS = [
  {
    label: "Setembro forte",
    condition: "R$ 200k+, ticket >= R$ 2.500, margem >=15%, 10-12 produtivos",
    next: "Outubro pode perseguir R$ 250k",
  },
  {
    label: "Setembro excepcional",
    condition: "R$ 220k+, ticket ~R$ 3.000, 180-200 leads/semana, 14 produtivos",
    next: "Outubro pode perseguir R$ 300k aspiracional",
  },
];

export function incrementMonth(ym) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabelFromYM(ym) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "long" }).replace(/^./, (c) => c.toUpperCase());
}
