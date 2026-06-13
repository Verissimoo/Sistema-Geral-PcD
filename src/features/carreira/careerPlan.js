export const CAREER_LEVELS = [
  {
    level: "N0",
    title: "Formação",
    minTime: "20 dias",
    minTimeDays: 20,
    monthlyGoal: 0,
    weeklyGoal: 0,
    weeklyGoalLabel: "Scorecard",
    fixedSalary: 0,
    bonus100: 0,
    bonus150: 0,
    bonus200: 0,
    bonusLabel: "Não se aplica",
    connection: "META-06",
    color: "#94A3B8",
    description: "Período de formação e treinamento. Sem meta de vendas — foco no aprendizado.",
  },
  {
    level: "N1",
    title: "Ativação",
    minTime: "1 mês",
    minTimeDays: 30,
    monthlyGoal: 5000,
    weeklyGoal: 1250,
    weeklyGoalLabel: "R$ 1.250",
    fixedSalary: 200,
    bonus100: 50,
    bonus150: 100,
    bonus200: 150,
    bonusLabel: "R$ 50 / R$ 100 / R$ 150",
    connection: "META-05",
    color: "#3B82F6",
    description: "Primeiras vendas reais. Meta mensal de R$ 5.000 em receita.",
  },
  {
    level: "N2",
    title: "Vendedor Jr 1",
    minTime: "2 meses",
    minTimeDays: 60,
    monthlyGoal: 10000,
    weeklyGoal: 2500,
    weeklyGoalLabel: "R$ 2.500",
    fixedSalary: 400,
    bonus100: 100,
    bonus150: 200,
    bonus200: 300,
    bonusLabel: "R$ 100 / R$ 200 / R$ 300",
    connection: "META-05",
    color: "#8B5CF6",
    description: "Consolidação do processo de vendas. Crescimento de carteira.",
  },
  {
    level: "N3",
    title: "Vendedor Jr 2",
    minTime: "3 meses",
    minTimeDays: 90,
    monthlyGoal: 15000,
    weeklyGoal: 3750,
    weeklyGoalLabel: "R$ 3.750",
    fixedSalary: 600,
    bonus100: 150,
    bonus150: 300,
    bonus200: 500,
    bonusLabel: "R$ 150 / R$ 300 / R$ 500",
    connection: "META-05",
    color: "#F59E0B",
    description: "Autonomia nas cotações e fechamento. Aumento de ticket médio.",
  },
  {
    level: "N4",
    title: "Vendedor Pleno",
    minTime: "3 meses",
    minTimeDays: 90,
    monthlyGoal: 25000,
    weeklyGoal: 6250,
    weeklyGoalLabel: "R$ 6.250",
    fixedSalary: 800,
    bonus100: 250,
    bonus150: 500,
    bonus200: 800,
    bonusLabel: "R$ 250 / R$ 500 / R$ 800",
    connection: "META-05",
    color: "#10B981",
    description: "Vendedor completo. Alta conversão, domínio de produto e upsell consistente.",
  },
  {
    level: "N5",
    title: "Vendedor Sênior",
    minTime: "3 meses mantendo alta performance",
    minTimeDays: 90,
    monthlyGoal: 30000,
    weeklyGoal: 7500,
    weeklyGoalLabel: "R$ 7.500+",
    fixedSalary: 1000,
    bonus100: 400,
    bonus150: 800,
    bonus200: 1200,
    bonusLabel: "R$ 400 / R$ 800 / R$ 1.200",
    connection: "META-05",
    color: "#EF4444",
    description: "Top performer. Alta performance sustentada com consistência.",
  },
  {
    level: "N6A",
    title: "Especialista Comercial",
    minTime: "Após Sênior",
    minTimeDays: null,
    monthlyGoal: 30000,
    weeklyGoal: 7500,
    weeklyGoalLabel: "R$ 7.500+",
    fixedSalary: 1000,
    bonus100: null,
    bonus150: null,
    bonus200: null,
    bonusLabel: "Comissão especial a definir",
    connection: "CAR-07",
    color: "#0B1E3D",
    description: "Domínio profundo de produto específico. Referência técnica para o time.",
  },
  {
    level: "N6B",
    title: "Gerente Comercial",
    minTime: "Após Sênior",
    minTimeDays: null,
    monthlyGoal: null,
    weeklyGoal: null,
    weeklyGoalLabel: "Estrutura em definição",
    fixedSalary: null,
    bonus100: null,
    bonus150: null,
    bonus200: null,
    bonusLabel: "A definir",
    connection: "CAR-08",
    color: "#0B1E3D",
    description: "Gestão de equipe comercial. Estrutura em construção.",
  },
];

export function getSellerStats(sellerId, quotes) {
  const sellerQuotes = quotes.filter(
    (q) =>
      q.seller_id === sellerId &&
      (q.status === "Aprovado" || q.status === "Emitido")
  );

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthlyRevenue = sellerQuotes
    .filter((q) => {
      const d = new Date(q.created_date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, q) => sum + (q.total_value || 0), 0);

  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weeklyRevenue = sellerQuotes
    .filter((q) => new Date(q.created_date) >= weekAgo)
    .reduce((sum, q) => sum + (q.total_value || 0), 0);

  const totalRevenue = sellerQuotes.reduce(
    (sum, q) => sum + (q.total_value || 0),
    0
  );
  const totalSales = sellerQuotes.length;

  // Histórico dos últimos 3 meses
  const monthlyHistory = [];
  for (let i = 0; i < 3; i++) {
    const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthRevenue = sellerQuotes
      .filter((q) => {
        const d = new Date(q.created_date);
        return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
      })
      .reduce((sum, q) => sum + (q.total_value || 0), 0);
    monthlyHistory.push({
      label: ref.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
      monthIdx: ref.getMonth(),
      year: ref.getFullYear(),
      revenue: monthRevenue,
    });
  }

  return { monthlyRevenue, weeklyRevenue, totalRevenue, totalSales, monthlyHistory };
}

export function getCurrentLevel(seller) {
  const levelCode = seller?.career_level || "N0";
  return CAREER_LEVELS.find((l) => l.level === levelCode) || CAREER_LEVELS[0];
}

export function getNextLevel(currentLevel) {
  // N5 bifurca em N6A e N6B — caminho linear até lá
  const idx = CAREER_LEVELS.findIndex((l) => l.level === currentLevel.level);
  if (idx === -1) return null;
  if (currentLevel.level === "N5") return null; // bifurcação
  if (currentLevel.level === "N6A" || currentLevel.level === "N6B") return null;
  if (idx < CAREER_LEVELS.length - 1) return CAREER_LEVELS[idx + 1];
  return null;
}

export function getBonusTier(monthlyRevenue, monthlyGoal) {
  if (!monthlyGoal || monthlyGoal === 0) return null;
  const pct = (monthlyRevenue / monthlyGoal) * 100;
  if (pct >= 200) return "200%";
  if (pct >= 150) return "150%";
  if (pct >= 100) return "100%";
  return null;
}

export function getBonusValue(level, tier) {
  if (!tier || !level) return 0;
  if (tier === "200%") return level.bonus200 || 0;
  if (tier === "150%") return level.bonus150 || 0;
  if (tier === "100%") return level.bonus100 || 0;
  return 0;
}
