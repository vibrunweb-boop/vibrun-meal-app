import { useState, useEffect } from 'react';
import { COLORS, sanitizeKey } from './lib/helpers.js';
import NameGate from './components/NameGate.jsx';
import MemberDashboard from './components/MemberDashboard.jsx';
import TrainerView from './components/TrainerView.jsx';

const IDENTITY_STORAGE_KEY = 'vibrun-identity';

export default function App() {
  const [mode, setMode] = useState('member');
  const [identity, setIdentity] = useState(null); // { key, displayName }
  const [checkedStorage, setCheckedStorage] = useState(false);

  // LINEログイン導入前の仮実装: 一度入力した名前をこの端末に保存しておき、
  // 次回以降は自動的にログインした状態にします。
  useEffect(() => {
    try {
      const saved = localStorage.getItem(IDENTITY_STORAGE_KEY);
      if (saved) setIdentity(JSON.parse(saved));
    } catch (e) {}
    setCheckedStorage(true);
  }, []);

  const enterAs = (name) => {
    const next = { key: sanitizeKey(name), displayName: name };
    try {
      localStorage.setItem(IDENTITY_STORAGE_KEY, JSON.stringify(next));
    } catch (e) {}
    setIdentity(next);
  };

  const switchIdentity = () => {
    try {
      localStorage.removeItem(IDENTITY_STORAGE_KEY);
    } catch (e) {}
    setIdentity(null);
  };

  if (!checkedStorage) return null;

  return (
    <div className="min-h-screen" style={{ background: COLORS.bg }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;600;700&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap');
        * { font-family: 'Zen Kaku Gothic New', sans-serif; box-sizing: border-box; }
      `}</style>

      <div className="max-w-md mx-auto px-4 pt-6 pb-16">
        <div className="flex items-center justify-between mb-5">
          <h1 style={{ fontFamily: "'Shippori Mincho', serif", color: COLORS.ink }} className="text-2xl">
            食事ノート
          </h1>
          {identity && (
            <div className="flex rounded-full p-0.5" style={{ background: COLORS.border }}>
              <button
                onClick={() => setMode('member')}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition"
                style={{
                  background: mode === 'member' ? COLORS.terracotta : 'transparent',
                  color: mode === 'member' ? '#fff' : COLORS.inkSoft,
                }}
              >
                会員
              </button>
              <button
                onClick={() => setMode('trainer')}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition"
                style={{
                  background: mode === 'trainer' ? COLORS.terracotta : 'transparent',
                  color: mode === 'trainer' ? '#fff' : COLORS.inkSoft,
                }}
              >
                トレーナー
              </button>
            </div>
          )}
        </div>

        {!identity ? (
          <NameGate onEnter={enterAs} />
        ) : (
          <>
            <button onClick={switchIdentity} style={{ color: COLORS.inkSoft }} className="text-xs mb-3 underline">
              別の名前に切り替える
            </button>
            {mode === 'trainer' ? (
              <TrainerView trainerId={identity.key} />
            ) : (
              <MemberDashboard ownerId={identity.key} viewerId={identity.key} displayName={identity.displayName} readOnly={false} />
            )}
          </>
        )}

        <p style={{ color: COLORS.inkSoft }} className="text-[10px] text-center mt-8 leading-relaxed">
          ※ 認証はLINEログイン導入前の仮実装です。トレーナー権限は、この画面で入力した名前を
          Vercelの環境変数 TRAINER_LINE_USER_IDS に登録することで付与されます。
        </p>
      </div>
    </div>
  );
}
