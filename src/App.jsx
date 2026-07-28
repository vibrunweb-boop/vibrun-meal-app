import { useState, useEffect, useCallback } from 'react';
import { COLORS } from './lib/helpers.js';
import * as api from './lib/api.js';
import LiffGate from './components/LiffGate.jsx';
import MemberDashboard from './components/MemberDashboard.jsx';
import TrainerView from './components/TrainerView.jsx';

export default function App() {
  const [mode, setMode] = useState('member');
  const [identity, setIdentity] = useState(null); // { idToken, userId, displayName, pictureUrl }
  const [isTrainer, setIsTrainer] = useState(false);

  const handleReady = useCallback((next) => setIdentity(next), []);

  useEffect(() => {
    if (!identity) {
      setIsTrainer(false);
      return;
    }
    let cancelled = false;
    api
      .checkIsTrainer(identity.idToken)
      .then((res) => {
        if (cancelled) return;
        const trainer = !!res.isTrainer;
        setIsTrainer(trainer);
        if (!trainer) setMode('member');
      })
      .catch(() => {
        if (!cancelled) {
          setIsTrainer(false);
          setMode('member');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [identity]);

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
          {identity && isTrainer && (
            <div className="flex rounded-full p-0.5" style={{ background: COLORS.border }}>
              <button
                onClick={() => setMode('member')}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition"
                style={{ background: mode === 'member' ? COLORS.terracotta : 'transparent', color: mode === 'member' ? '#fff' : COLORS.inkSoft }}
              >
                会員
              </button>
              <button
                onClick={() => setMode('trainer')}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition"
                style={{ background: mode === 'trainer' ? COLORS.terracotta : 'transparent', color: mode === 'trainer' ? '#fff' : COLORS.inkSoft }}
              >
                トレーナー
              </button>
            </div>
          )}
        </div>

        {!identity ? (
          <LiffGate onReady={handleReady} />
        ) : mode === 'trainer' ? (
          <TrainerView trainerId={identity.idToken} />
        ) : (
          <MemberDashboard
            ownerId={identity.idToken}
            viewerId={identity.idToken}
            displayName={identity.displayName}
            readOnly={false}
          />
        )}
      </div>
    </div>
  );
}