export const COLORS = {
  bg: '#F6F1E9',
  card: '#FFFDF8',
  ink: '#2E2620',
  inkSoft: '#7A6E5E',
  border: '#E5DBC9',
  terracotta: '#C1673F',
  gold: '#D6A24A',
  sage: '#7C9070',
  rose: '#B85C5C',
};

export const MEAL_TYPES = [
  { key: 'breakfast', label: '朝食' },
  { key: 'lunch', label: '昼食' },
  { key: 'dinner', label: '夕食' },
  { key: 'snack', label: '間食' },
];

export const DEFAULT_TARGETS = { calories: 2000, protein: 120, fat: 55, carbs: 250, sugar: 50, fiber: 18, salt: 7 };

export function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDateLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`;
}

export function addDays(dateStr, delta) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return formatDate(d);
}

export function sanitizeKey(name) {
  return name.trim().replace(/[\s/\\'"]+/g, '_');
}

export function num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

export function round1(n) {
  return Math.round(n * 10) / 10;
}

export function uid() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function scaleIngredient(ing, grams) {
  const factor = num(grams) / 100;
  return {
    calories: Math.round(ing.calories * factor),
    protein: round1(ing.protein * factor),
    fat: round1(ing.fat * factor),
    carbs: round1(ing.carbs * factor),
    sugar: round1((ing.sugar || 0) * factor),
    fiber: round1((ing.fiber || 0) * factor),
    salt: round1(ing.salt * factor),
  };
}
