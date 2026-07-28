// LINEログイン(LIFF)のIDトークンを検証して、ログイン中のLINEユーザーIDを取得する認証ヘルパーです。
//
// フロントエンド(LIFF)は liff.getIDToken() で取得したIDトークンを
// "Authorization: Bearer <IDトークン>" ヘッダーに載せて送ってきます。
// ここではLINEの「IDトークン検証」エンドポイントにそのトークンを渡し、
// 署名・有効期限・発行者(iss)・宛先(aud = このLIFFチャネルのID)を検証してもらい、
// 検証済みのLINEユーザーID(sub)と表示名(name)を取得します。
// 参考: https://developers.line.biz/en/docs/line-login/verify-id-token/

export class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthError';
  }
}

function getBearerToken(req) {
  const header = req.headers['authorization'] || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new AuthError('ログインが必要です');
  }
  return token;
}

// IDトークンを検証し、{ userId, displayName, picture } を返します。
// 同じリクエスト内で複数回呼ばれても検証は1回で済むよう、req単位でキャッシュします。
export async function verifyLineToken(req) {
  if (req._lineUser) return req._lineUser;

  const idToken = getBearerToken(req);
  const channelId = process.env.LIFF_CHANNEL_ID;
  if (!channelId) {
    throw new Error('LIFF_CHANNEL_ID が設定されていません');
  }

  const params = new URLSearchParams({ id_token: idToken, client_id: channelId });
  const verifyRes = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  if (!verifyRes.ok) {
    throw new AuthError('ログインが必要です(トークンが無効です)');
  }

  const payload = await verifyRes.json();
  // payload: { iss, sub, aud, exp, iat, name, picture, ... }
  const user = {
    userId: payload.sub,
    displayName: payload.name || payload.sub,
    picture: payload.picture || '',
  };
  req._lineUser = user;
  return user;
}

export async function getUserId(req) {
  const { userId } = await verifyLineToken(req);
  return userId;
}

export function isTrainer(userId) {
  const trainerIds = (process.env.TRAINER_LINE_USER_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return trainerIds.includes(userId);
}

export async function requireTrainer(req) {
  const userId = await getUserId(req);
  if (!isTrainer(userId)) {
    throw new AuthError('トレーナー権限が必要です');
  }
  return userId;
}