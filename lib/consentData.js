import { redis } from './redis.js';

const PREFIX = 'vibrun:';

// プライバシーポリシーの文面を変更したら、このバージョン文字列を必ず更新してください。
// バージョンが変わると、既に同意済みの会員にも自動的に再同意を求めます。
export const PRIVACY_POLICY_VERSION = '2026-08-01';

export async function getConsent(userId) {
  const data = await redis.get(`${PREFIX}consent:${userId}`);
  return data || null; // { version, agreedAt } または null(未同意)
}

export async function saveConsent(userId, version) {
  const record = { version, agreedAt: new Date().toISOString() };
  await redis.set(`${PREFIX}consent:${userId}`, record);
  return record;
}