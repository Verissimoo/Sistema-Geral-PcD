export function getCostForMiles(program, milesQty) {
  if (!program) return 0;
  if (!program.has_variable_pricing || !program.variable_tiers?.length) {
    return program.cost_per_thousand;
  }

  const qty = Number(milesQty) || 0;
  const tier = program.variable_tiers.find((t) => {
    const aboveMin = qty >= t.min_miles;
    const belowMax = t.max_miles === null || t.max_miles === undefined || qty <= t.max_miles;
    return aboveMin && belowMax;
  });

  return tier ? tier.cost : program.cost_per_thousand;
}

export function getTierForMiles(program, milesQty) {
  if (!program?.has_variable_pricing || !program.variable_tiers?.length) return null;
  const qty = Number(milesQty) || 0;
  return program.variable_tiers.find((t) => {
    const aboveMin = qty >= t.min_miles;
    const belowMax = t.max_miles === null || t.max_miles === undefined || qty <= t.max_miles;
    return aboveMin && belowMax;
  }) || null;
}

export function getSaleForMiles(program, milesQty) {
  if (!program) return 0;
  if (!program.has_variable_pricing || !program.variable_tiers?.length) {
    return program.sale_per_thousand || 0;
  }

  const qty = Number(milesQty) || 0;
  const tier = program.variable_tiers.find((t) => {
    const aboveMin = qty >= t.min_miles;
    const belowMax = t.max_miles === null || t.max_miles === undefined || qty <= t.max_miles;
    return aboveMin && belowMax;
  });

  if (!tier) return program.sale_per_thousand || 0;

  if (tier.sale != null && tier.sale > 0) {
    return tier.sale;
  }
  const baseMargin = (program.sale_per_thousand || 0) - (program.cost_per_thousand || 0);
  return (tier.cost || 0) + baseMargin;
}

export function getMarginPercent(cost, sale) {
  if (!cost || cost === 0) return 0;
  return Number((((sale - cost) / cost) * 100).toFixed(1));
}

export function isOutdated(updatedDate, thresholdDays = 30) {
  if (!updatedDate) return true;
  const updated = new Date(updatedDate);
  const now = new Date();
  const diffDays = Math.floor((now - updated) / (1000 * 60 * 60 * 24));
  return diffDays > thresholdDays;
}

export function daysSinceUpdate(updatedDate) {
  if (!updatedDate) return null;
  const updated = new Date(updatedDate);
  const now = new Date();
  return Math.floor((now - updated) / (1000 * 60 * 60 * 24));
}
