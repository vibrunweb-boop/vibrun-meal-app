import { useEffect, useState } from 'react';

// これは動作確認用の最小構成です。
// /api/ingredients が正しく呼べていれば、Vite -> Vercel Functions -> Upstash Redis の
// 一連の疎通ができている証拠になります。
// UI本体(プロトタイプのコンポーネント群)は、この疎通確認ができてから移植します。
export default function App() {
  const [status, setStatus] = useState('loading'); // loading | ok | error
  const [ingredients, setIngredients] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/ingredients')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setIngredients(data);
        setStatus('ok');
      })
      .catch((err) => {
        setError(String(err));
        setStatus('error');
      });
  }, []);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 480, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, marginBottom: 12 }}>疎通確認</h1>
      {status === 'loading' && <p>/api/ingredients を呼び出し中…</p>}
      {status === 'error' && (
        <p style={{ color: 'crimson' }}>
          エラー: {error}
          <br />
          Upstash Redisの環境変数(UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN)が
          設定されているか、`vercel dev` で起動しているか確認してください。
        </p>
      )}
      {status === 'ok' && (
        <p style={{ color: 'seagreen' }}>
          成功: 食材データベースを {ingredients.length} 件読み込みました(初回アクセス時に自動でシードされます)。
        </p>
      )}
    </div>
  );
}
