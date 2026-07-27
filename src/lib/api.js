// バックエンドAPI呼び出しをまとめたデータ層。
// プロトタイプ(meal-tracker.jsx)の window.storage 呼び出しを置き換えるものです。
//
// 認証はLINEログイン導入前の仮実装です。App.jsx で入力された名前をそのまま
// x-user-id / x-user-name ヘッダーとして送信しています(lib/auth.js 参照)。
// トレーナー権限は、Vercelの環境変数 TRAINER_LINE_USER_IDS にそのキーを
// 登録することで付与されます(README参照)。

async function request(path, { userId, displayName, method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (userId) headers['x-user-id'] = encodeURIComponent(userId);
  if (displayName) headers['x-user-name'] = encodeURIComponent(displayName);

  const res = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let message = `${method} ${path} failed (${res.status})`;
    try {
      const errBody = await res.json();
      if (errBody?.error) message = errBody.error;
    } catch (e) {}
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

// --- 会員の食事記録・目標値 --------------------------------------------

export function fetchMemberData(userId, displayName) {
  return request('/api/meals', { userId, displayName });
}

export function addMealEntry(userId, displayName, mealType, date, entry) {
  return request('/api/meals', {
    userId,
    displayName,
    method: 'POST',
    body: { mealType, date, ...entry },
  });
}

export function deleteMealEntry(userId, id) {
  return request('/api/meals', { userId, method: 'DELETE', body: { id } });
}

export function resetMemberData(userId) {
  return request('/api/meals', { userId, method: 'DELETE', body: { resetAll: true } });
}

export function updateTargets(userId, targets) {
  return request('/api/targets', { userId, method: 'PUT', body: targets });
}

// --- 食材データベース ----------------------------------------------------

export function fetchIngredientDb() {
  return request('/api/ingredients');
}

export function createIngredient(trainerId, item) {
  return request('/api/ingredients', { userId: trainerId, method: 'POST', body: item });
}

export function updateIngredient(trainerId, id, fields) {
  return request('/api/ingredients', { userId: trainerId, method: 'PUT', body: { id, ...fields } });
}

export function deleteIngredient(trainerId, id) {
  return request('/api/ingredients', { userId: trainerId, method: 'DELETE', body: { id } });
}

// --- 商品データベース ----------------------------------------------------

export function fetchProductDb() {
  return request('/api/products');
}

export function registerOrUpdateProduct(userId, displayName, item) {
  return request('/api/products', { userId, displayName, method: 'POST', body: item });
}

export function incrementProductUseCount(userId, id) {
  return request('/api/products', { userId, method: 'PATCH', body: { id } });
}

export function updateProductAdmin(trainerId, id, fields) {
  return request('/api/products', { userId: trainerId, method: 'PUT', body: { id, ...fields } });
}

export function deleteProductAdmin(trainerId, id) {
  return request('/api/products', { userId: trainerId, method: 'DELETE', body: { id } });
}

// --- トレーナー専用 -------------------------------------------------------

export function fetchTrainerMembers(trainerId) {
  return request('/api/trainer/members', { userId: trainerId });
}

export function fetchTrainerMemberDetail(trainerId, memberUserId) {
  return request(`/api/trainer/member-detail?userId=${encodeURIComponent(memberUserId)}`, { userId: trainerId });
}
