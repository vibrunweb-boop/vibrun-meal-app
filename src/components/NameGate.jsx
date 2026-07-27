import { useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';
import { COLORS } from '../lib/helpers.js';

export default function NameGate({ onEnter }) {
  const [name, setName] = useState('');
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <UtensilsCrossed size={28} style={{ color: COLORS.terracotta }} className="mb-3" />
      <h2 style={{ fontFamily: "'Shippori Mincho', serif", color: COLORS.ink }} className="text-xl mb-1">
        お名前を入力してください
      </h2>
      <p style={{ color: COLORS.inkSoft }} className="text-xs mb-4 text-center">
        次回からはこの端末で自動的にログインした状態になります
        <br />
        (トレーナー権限が必要な方は、管理者にこの名前を伝えてください)
      </p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="例: 立川 歩"
        className="w-64 px-3 py-2 rounded-lg text-sm outline-none mb-3 text-center"
        style={{ border: `1px solid ${COLORS.border}`, background: COLORS.card, color: COLORS.ink }}
        onKeyDown={(e) => e.key === 'Enter' && name.trim() && onEnter(name.trim())}
      />
      <button
        onClick={() => name.trim() && onEnter(name.trim())}
        className="px-6 py-2 rounded-lg text-sm font-medium"
        style={{ background: COLORS.terracotta, color: '#fff' }}
      >
        はじめる
      </button>
    </div>
  );
}
