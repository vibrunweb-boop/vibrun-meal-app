import { redis } from './redis.js';

const PREFIX = 'vibrun:';

export async function getRecipes(userId) {
  const data = await redis.get(`${PREFIX}recipes:${userId}`);
  return data || [];
}

export async function saveRecipes(userId, list) {
  await redis.set(`${PREFIX}recipes:${userId}`, list);
  return list;
}