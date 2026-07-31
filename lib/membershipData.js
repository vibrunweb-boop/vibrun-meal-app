import { redis } from './redis.js';

const PREFIX = 'vibrun:';

export class WithdrawnError extends Error {}

export async function getWithdrawnUserIds() {
  return (await redis.get(`${PREFIX}withdrawn-members`)) || [];
}

export async function setWithdrawn(userId, withdrawn) {
  const list = await getWithdrawnUserIds();
  const updated = withdrawn
    ? list.includes(userId) ? list : [...list, userId]
    : list.filter((id) => id !== userId);
  await redis.set(`${PREFIX}withdrawn-members`, updated);
  return updated;
}

// 会員本人のAPI(meals / targets / recipes など)の先頭で呼び出し、
// 退会済みなら例外を投げて処理を止めるためのヘルパー
export async function assertActiveMember(userId) {
  const list = await getWithdrawnUserIds();
  if (list.includes(userId)) {
    throw new WithdrawnError('退会済みのため、本アプリはご利用いただけません。');
  }
}