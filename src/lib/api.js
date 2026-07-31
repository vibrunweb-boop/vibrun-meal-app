// バックエンドAPI呼び出しをまとめたデータ層。
//
// 認証: LIFFで取得したIDトークンを Authorization: Bearer ヘッダーで送ります。
// サーバー側は lib/auth.js でこのトークンをLINEに照会して検証し、
// 検証済みのLINEユーザーID・表示名を取得します。

async function request(path, { idToken, method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

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

export function fetchMemberData(idToken) {
  return request('/api/meals', { idToken });
}

export function addMealEntry(idToken, mealType, date, entry) {
  return request('/api/meals', { idToken, method: 'POST', body: { mealType, date, ...entry } });
}

export function deleteMealEntry(idToken, id) {
  return request('/api/meals', { idToken, method: 'DELETE', body: { id } });
}

export function resetMemberData(idToken) {
  return request('/api/meals', { idToken, method: 'DELETE', body: { resetAll: true } });
}

export function updateTargets(idToken, targets) {
  return request('/api/targets', { idToken, method: 'PUT', body: targets });
}

// --- 食材データベース ----------------------------------------------------

export function fetchIngredientDb() {
  return request('/api/ingredients');
}

export function createIngredient(idToken, item) {
  return request('/api/ingredients', { idToken, method: 'POST', body: item });
}

export function updateIngredient(idToken, id, fields) {
  return request('/api/ingredients', { idToken, method: 'PUT', body: { id, ...fields } });
}

export function deleteIngredient(idToken, id) {
  return request('/api/ingredients', { idToken, method: 'DELETE', body: { id } });
}

// --- 商品データベース ----------------------------------------------------

export function fetchProductDb() {
  return request('/api/products');
}

export function registerOrUpdateProduct(idToken, item) {
  return request('/api/products', { idToken, method: 'POST', body: item });
}

export function incrementProductUseCount(idToken, id) {
  return request('/api/products', { idToken, method: 'PATCH', body: { id } });
}

export function updateProductAdmin(idToken, id, fields) {
  return request('/api/products', { idToken, method: 'PUT', body: { id, ...fields } });
}

export function deleteProductAdmin(idToken, id) {
  return request('/api/products', { idToken, method: 'DELETE', body: { id } });
}

// --- トレーナー専用 -------------------------------------------------------

export function fetchTrainerMembers(idToken) {
  return request('/api/trainer/members', { idToken });
}

export function fetchTrainerMemberDetail(idToken, memberUserId) {
  return request(`/api/trainer/member-detail?userId=${encodeURIComponent(memberUserId)}`, { idToken });
}

export function checkIsTrainer(idToken) {
  return request('/api/trainer/check', { idToken });
}

export function getConsentStatus(idToken) {
  return request('/api/consent', { idToken });
}

export function agreeToConsent(idToken) {
  return request('/api/consent', { idToken, method: 'POST' });
}

export function fetchRecipes(idToken) {
  return request('/api/recipes', { idToken });
}
export function saveRecipeApi(idToken, recipe) {
  return request('/api/recipes', { idToken, method: 'POST', body: recipe });
}
export function deleteRecipeApi(idToken, id) {
  return request(`/api/recipes?id=${id}`, { idToken, method: 'DELETE' });
}