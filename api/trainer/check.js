import { AuthError, getUserId, isTrainer } from '../../lib/auth.js';

// フロントエンドが「トレーナータブを表示するかどうか」を判断するための軽量な確認用エンドポイントです。
// 実際のトレーナー専用操作の権限チェックは、各APIの requireTrainer() が別途行っています
// (このエンドポイントはUI表示の出し分け用で、認可の境界そのものではありません)。
export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const userId = await getUserId(req);
    return res.status(200).json({ isTrainer: isTrainer(userId) });
  } catch (err) {
    if (err instanceof AuthError) return res.status(401).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: 'Internal error' });
  }
}