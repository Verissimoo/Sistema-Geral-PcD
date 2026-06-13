// Scoring system for IT/Automation projects
const complexityScores = { "Baixo": 1, "Médio": 2, "Alto": 3, "Muito alto": 5 };
const impactScores = { "Baixo": 1, "Médio": 2, "Alto": 3, "Muito alto": 5 };
const docScores = { "Sem documentação": 0, "Parcial": 1, "Completo": 2 };
const deadlineScores = { "Atrasado": 0, "No prazo": 1, "Antecipado": 2 };

// Scoring for Educational/Commercial projects
const eduScores = {
  "Documento simples": 1,
  "Documento completo com passo a passo": 2,
  "Aula gravada ou live estruturada": 2,
  "Módulo de treinamento completo": 3,
  "Trilha de onboarding estruturada": 5,
};

export function calculateITScore(project) {
  const c = complexityScores[project.complexity] || 0;
  const i = impactScores[project.business_impact] || 0;
  const d = docScores[project.documentation_level] || 0;
  const p = deadlineScores[project.deadline_status] || 0;
  return c + i + d + p;
}

export function calculateEduScore(project) {
  return eduScores[project.edu_delivery_type] || 0;
}

export function calculateScore(project) {
  if (project.scope_type === "TI/Automações") {
    return calculateITScore(project);
  }
  return calculateEduScore(project);
}

export function isFullyAccepted(project) {
  return (
    project.acceptance_tested &&
    project.acceptance_validated &&
    project.acceptance_documented &&
    project.acceptance_monitored
  );
}

export function getGoalStatus(points, goal) {
  if (points >= goal * 1.2) return { label: "Meta superada", color: "text-green-600", bg: "bg-green-50" };
  if (points >= goal) return { label: "Meta atingida", color: "text-blue-600", bg: "bg-blue-50" };
  return { label: "Abaixo da meta", color: "text-red-600", bg: "bg-red-50" };
}