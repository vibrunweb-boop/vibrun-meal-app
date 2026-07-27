// 仮の認証ヘルパーです。
// 今は x-user-id ヘッダーをそのまま信用しているだけなので、
// LINEログイン(LIFF)を組み込む段階で getUserId() の中身を
// 「LINEのIDトークンを検証してuserIdを取り出す」処理に置き換えてください。
// (参考: LIFF の liff.getIDToken() で取得したトークンを、
//  サーバー側で LINE の検証エンドポイントに投げて確認する流れになります)

export class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthError';
  }
}

export function getUserId(req) {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    throw new AuthError('ログインが必要です');
  }
  return decodeURIComponent(String(userId));
}

export function isTrainer(userId) {
  const trainerIds = (process.env.TRAINER_LINE_USER_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return trainerIds.includes(userId);
}

export function requireTrainer(req) {
  const userId = getUserId(req);
  if (!isTrainer(userId)) {
    throw new AuthError('トレーナー権限が必要です');
  }
  return userId;
}
