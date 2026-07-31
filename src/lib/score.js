function scoreForMetric(actual, target) {
  if (!target || target <= 0) return null;
  const diffRatio = Math.abs(actual - target) / target;
  const tolerance = 0.1; // 目標の±10%以内は満点
  if (diffRatio <= tolerance) return 100;
  const over = diffRatio - tolerance;
  return Math.max(0, Math.round(100 - over * 150));
}

export function calculateDailyScore(totals, targets) {
  const weights = { calories: 0.4, protein: 0.2, fat: 0.2, carbs: 0.2 };
  let weightedSum = 0;
  let totalWeight = 0;
  for (const key of Object.keys(weights)) {
    const s = scoreForMetric(totals[key], targets[key]);
    if (s !== null) {
      weightedSum += s * weights[key];
      totalWeight += weights[key];
    }
  }
  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : null;
}