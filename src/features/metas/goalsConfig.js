/**
 * Configurações globais de Metas e Bônus.
 * O gestor define esses valores na tela de Metas e Bônus.
 * São persistidos no localStorage e lidos automaticamente em todo o sistema.
 */

const STORAGE_KEY = "innohvasion_goals_config";

export const DEFAULT_GOALS_CONFIG = {
  "TI/Automações": {
    monthly_point_goal: 25,
    salary_below_goal: 1000,
    salary_at_goal: 1500,
    bonus_per_extra_point: 100,
  },
  "Educacional/Comercial": {
    monthly_point_goal: 15,
    salary_below_goal: 1200,
    salary_at_goal: 1800,
    bonus_per_extra_point: 50,
  },
  special_bonuses: [],                // Bônus especiais pontuais configurados pelo gestor
};

/**
 * Carrega a configuração salva ou retorna o padrão.
 */
export function loadGoalsConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Mesclagem profunda simples para garantir novos escopos no futuro
      return {
        ...DEFAULT_GOALS_CONFIG,
        ...parsed,
        "TI/Automações": { ...DEFAULT_GOALS_CONFIG["TI/Automações"], ...(parsed["TI/Automações"] || {}) },
        "Educacional/Comercial": { ...DEFAULT_GOALS_CONFIG["Educacional/Comercial"], ...(parsed["Educacional/Comercial"] || {}) },
      };
    }
  } catch {
    // fallback silencioso
  }
  return { ...DEFAULT_GOALS_CONFIG };
}

/**
 * Salva a configuração no localStorage.
 * @param {object} config
 */
export function saveGoalsConfig(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/**
 * Calcula o Valor Mensal Estimado com base nas configurações e no total de pontos do mês.
 *
 * @param {number} totalPoints - total de pontos acumulados no mês
 * @param {object} config - configuração carregada por loadGoalsConfig()
 * @param {string} scopeType - "TI/Automações" ou "Educacional/Comercial"
 * @returns {{ salarioBase: number, bonusExtra: number, bonusEspecial: number, total: number, excedente: number }}
 */
export function calcMonthlyEstimated(totalPoints, config, scopeType = "TI/Automações") {
  const cfg = config || loadGoalsConfig();
  const scopeCfg = cfg[scopeType] || cfg["TI/Automações"];
  const goal = scopeCfg.monthly_point_goal;

  let salarioBase = scopeCfg.salary_below_goal;
  let bonusExtra = 0;
  let excedente = 0;

  if (totalPoints >= goal) {
    salarioBase = scopeCfg.salary_at_goal;
    if (totalPoints > goal) {
      excedente = totalPoints - goal;
      bonusExtra = excedente * scopeCfg.bonus_per_extra_point;
    }
  }

  // Soma bônus especiais pontuais (se ativos)
  const bonusEspecial = (cfg.special_bonuses || [])
    .filter(b => b.active)
    .reduce((sum, b) => sum + (b.value || 0), 0);

  return {
    salarioBase,
    bonusExtra,
    bonusEspecial,
    excedente,
    total: salarioBase + bonusExtra + bonusEspecial,
  };
}
