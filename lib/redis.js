import { Redis } from '@upstash/redis';

// UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN を環境変数から自動で読み込みます
export const redis = Redis.fromEnv();

// @upstash/redis はオブジェクトを自動でJSON化/復元してくれるので、
// プロトタイプの window.storage とほぼ同じ感覚で使えます。
export async function getValue(key, fallback = null) {
  const value = await redis.get(key);
  return value === null || value === undefined ? fallback : value;
}

export async function setValue(key, value) {
  await redis.set(key, value);
}
