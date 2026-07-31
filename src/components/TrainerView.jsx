import { useState, useEffect } from 'react';
import { Users, Plus, Check, Trash2, Wheat, Store } from 'lucide-react';
import { COLORS, DEFAULT_TARGETS, formatDate } from '../lib/helpers.js';
import * as api from '../lib/api.js';
import MemberDashboard from './MemberDashboard.jsx';

const BLANK_EDIT_FORM = { name: '', store: '', barcode: '', calories: '', protein: '', fat: '', carbs: '', fiber: '', salt: '', nutrients: '' };

function NutritionEditForm({ initial, showStore, onSave, onCancel, onDelete }) {
  const [form, setForm] = useState(initial);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <div className="rounded-lg p-3 mt-1 mb-2" style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}` }}>
      <input
        value={form.name}
        onChange={set('name')}
        placeholder="名前"
        className="w-full mb-2 px-2 py-1.5 rounded text-sm outline-none"
        style={{ border: `1px solid ${COLORS.border}`, background: COLORS.card, color: COLORS.ink }}
      />
      {showStore && (
        <>
          <input
            value={form.store || ''}
            onChange={set('store')}
            placeholder="購入店(任意)"
            className="w-full mb-2 px-2 py-1.5 rounded text-sm outline-none"
            style={{ border: `1px solid ${COLORS.border}`, background: COLORS.card, color: COLORS.ink }}
          />
          <input
            value={form.barcode || ''}
            onChange={set('barcode')}
            placeholder="バーコード番号(任意)"
            inputMode="numeric"
            className="w-full mb-2 px-2 py-1.5 rounded text-sm outline-none"
            style={{ border: `1px solid ${COLORS.border}`, background: COLORS.card, color: COLORS.ink }}
          />
        </>
      )}
      <div className="grid grid-cols-3 gap-1.5 mb-2">
        {[
          ['calories', 'kcal'],
          ['protein', 'P(g)'],
          ['fat', 'F(g)'],
          ['carbs', 'C(g)'],
          ['fiber', '食物繊維(g)'],
          ['salt', '塩分(g)'],
        ].map(([k, ph]) => (
          <input
            key={k}
            type="number"
            inputMode="decimal"
            value={form[k]}
            onChange={set(k)}
            placeholder={ph}
            className="w-full px-1.5 py-1.5 rounded text-xs outline-none text-center"
            style={{ border: `1px solid ${COLORS.border}`, background: COLORS.card, color: COLORS.ink }}
          />
        ))}
      </div>
      <input
        value={form.nutrients || ''}
        onChange={set('nutrients')}
        placeholder="豊富な栄養素(任意) 例: ビタミンC, 鉄"
        className="w-full mb-2 px-2 py-1.5 rounded text-sm outline-none"
        style={{ border: `1px solid ${COLORS.border}`, background: COLORS.card, color: COLORS.ink }}
      />
      <div className="flex justify-between items-center">
        {onDelete ? (
          <button onClick={onDelete} className="text-xs flex items-center gap-1" style={{ color: COLORS.rose }}>
            <Trash2 size={13} /> 削除
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button onClick={onCancel} className="text-xs px-3 py-1.5 rounded" style={{ color: COLORS.inkSoft }}>
            キャンセル
          </button>
          <button
            onClick={() => onSave(form)}
            className="text-xs px-3 py-1.5 rounded font-medium flex items-center gap-1"
            style={{ background: COLORS.terracotta, color: '#fff' }}
          >
            <Check size={14} /> 保存
          </button>
        </div>
      </div>
    </div>
  );
}

function ManagedList({ title, items, showStore, onCreate, onUpdate, onDelete }) {
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState(null); // 'new' | item id | null
  const filtered = items.filter((i) => i.name.includes(query.trim()));

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`${title}を検索`}
          className="flex-1 px-2 py-1.5 rounded text-sm outline-none"
          style={{ border: `1px solid ${COLORS.border}`, background: COLORS.card, color: COLORS.ink }}
        />
        <button
          onClick={() => setEditingId(editingId === 'new' ? null : 'new')}
          className="p-2 rounded-full"
          style={{ background: COLORS.terracotta, color: '#fff' }}
        >
          <Plus size={16} />
        </button>
      </div>

      {editingId === 'new' && (
        <NutritionEditForm
          initial={BLANK_EDIT_FORM}
          showStore={showStore}
          onSave={async (form) => {
            if (!form.name.trim()) return;
            await onCreate(form);
            setEditingId(null);
          }}
          onCancel={() => setEditingId(null)}
        />
      )}

      <div className="space-y-1.5 max-h-96 overflow-y-auto">
        {filtered.map((item) =>
          editingId === item.id ? (
            <NutritionEditForm
              key={item.id}
              initial={{
                name: item.name,
                store: item.store || '',
                barcode: item.barcode || '',
                calories: String(item.calories),
                protein: String(item.protein),
                fat: String(item.fat),
                carbs: String(item.carbs),
                fiber: String(item.fiber || 0),
                salt: String(item.salt),
                nutrients: item.nutrients || '',
              }}
              showStore={showStore}
              onSave={async (form) => {
                if (!form.name.trim()) return;
                await onUpdate(item.id, form);
                setEditingId(null);
              }}
              onCancel={() => setEditingId(null)}
              onDelete={async () => {
                await onDelete(item.id);
                setEditingId(null);
              }}
            />
          ) : (
            <button
              key={item.id}
              onClick={() => setEditingId(item.id)}
              className="w-full flex justify-between items-center px-2.5 py-2 rounded text-left text-sm"
              style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
            >
              <span style={{ color: COLORS.ink }}>
                {item.name}
                {showStore && item.store ? `(${item.store})` : ''}
              </span>
              <span style={{ color: COLORS.inkSoft }} className="text-xs">{Math.round(item.calories)}kcal</span>
            </button>
          )
        )}
        {filtered.length === 0 && (
          <p style={{ color: COLORS.inkSoft }} className="text-xs text-center py-6">
            該当する項目がありません
          </p>
        )}
      </div>
    </div>
  );
}

function DataManagementView({ trainerId }) {
  const [tab, setTab] = useState('ingredient'); // 'ingredient' | 'product'
  const [ingredientDb, setIngredientDb] = useState([]);
  const [productDb, setProductDb] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [ing, prod] = await Promise.all([api.fetchIngredientDb(), api.fetchProductDb()]);
      setIngredientDb(ing);
      setProductDb(prod);
      setLoading(false);
    })();
  }, []);

  const createIngredient = async (form) => {
    await api.createIngredient(trainerId, {
      name: form.name.trim(),
      calories: Number(form.calories) || 0,
      protein: Number(form.protein) || 0,
      fat: Number(form.fat) || 0,
      carbs: Number(form.carbs) || 0,
      fiber: Number(form.fiber) || 0,
      salt: Number(form.salt) || 0,
      nutrients: form.nutrients?.trim() || '',
    });
    setIngredientDb(await api.fetchIngredientDb());
  };
  const updateIngredient = async (id, form) => {
    await api.updateIngredient(trainerId, id, {
      name: form.name.trim(),
      calories: Number(form.calories) || 0,
      protein: Number(form.protein) || 0,
      fat: Number(form.fat) || 0,
      carbs: Number(form.carbs) || 0,
      fiber: Number(form.fiber) || 0,
      salt: Number(form.salt) || 0,
      nutrients: form.nutrients?.trim() || '',
    });
    setIngredientDb(await api.fetchIngredientDb());
  };
  const deleteIngredient = async (id) => {
    await api.deleteIngredient(trainerId, id);
    setIngredientDb(await api.fetchIngredientDb());
  };

  const createProduct = async (form) => {
    await api.registerOrUpdateProduct(trainerId, {
      name: form.name.trim(),
      store: form.store?.trim() || '',
      barcode: form.barcode?.trim() || '',
      calories: Number(form.calories) || 0,
      protein: Number(form.protein) || 0,
      fat: Number(form.fat) || 0,
      carbs: Number(form.carbs) || 0,
      fiber: Number(form.fiber) || 0,
      salt: Number(form.salt) || 0,
      nutrients: form.nutrients?.trim() || '',
    });
    setProductDb(await api.fetchProductDb());
  };
  const updateProduct = async (id, form) => {
    await api.updateProductAdmin(trainerId, id, {
      name: form.name.trim(),
      store: form.store?.trim() || '',
      barcode: form.barcode?.trim() || '',
      calories: Number(form.calories) || 0,
      protein: Number(form.protein) || 0,
      fat: Number(form.fat) || 0,
      carbs: Number(form.carbs) || 0,
      fiber: Number(form.fiber) || 0,
      salt: Number(form.salt) || 0,
      nutrients: form.nutrients?.trim() || '',
    });
    setProductDb(await api.fetchProductDb());
  };
  const deleteProduct = async (id) => {
    await api.deleteProductAdmin(trainerId, id);
    setProductDb(await api.fetchProductDb());
  };

  if (loading) {
    return <div style={{ color: COLORS.inkSoft }} className="text-center py-10 text-sm">読み込み中…</div>;
  }

  return (
    <div>
      <div className="flex rounded-full p-0.5 mb-3 w-fit" style={{ background: COLORS.border }}>
        <button
          onClick={() => setTab('ingredient')}
          className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1"
          style={{ background: tab === 'ingredient' ? COLORS.terracotta : 'transparent', color: tab === 'ingredient' ? '#fff' : COLORS.inkSoft }}
        >
          <Wheat size={12} /> 食材({ingredientDb.length})
        </button>
        <button
          onClick={() => setTab('product')}
          className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1"
          style={{ background: tab === 'product' ? COLORS.terracotta : 'transparent', color: tab === 'product' ? '#fff' : COLORS.inkSoft }}
        >
          <Store size={12} /> 商品({productDb.length})
        </button>
      </div>
      {tab === 'ingredient' ? (
        <ManagedList title="食材" items={ingredientDb} showStore={false} onCreate={createIngredient} onUpdate={updateIngredient} onDelete={deleteIngredient} />
      ) : (
        <ManagedList title="商品" items={productDb} showStore onCreate={createProduct} onUpdate={updateProduct} onDelete={deleteProduct} />
      )}
    </div>
  );
}

export default function TrainerView({ trainerId }) {
  const [subTab, setSubTab] = useState('members'); // 'members' | 'data'
  const [members, setMembers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [withdrawnIds, setWithdrawnIds] = useState([]);

  useEffect(() => {
  (async () => {
    setLoading(true);
    setError('');
    try {
      const [list, membership] = await Promise.all([
        api.fetchTrainerMembers(trainerId),
        api.fetchWithdrawnMembers(trainerId),
      ]);
      setMembers(list);
      setWithdrawnIds(membership.withdrawnUserIds);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  })();
}, [trainerId]);
const toggleWithdrawn = async (e, userId) => {
  e.stopPropagation(); // 会員詳細画面に遷移しないようにする
  try {
    const membership = await api.setMemberWithdrawn(trainerId, userId, !withdrawnIds.includes(userId));
    setWithdrawnIds(membership.withdrawnUserIds);
  } catch (err) {
    console.error(err);
  }
};

  if (selected) {
    return (
      <MemberDashboard
        ownerId={selected.key}
        viewerId={trainerId}
        displayName={selected.displayName}
        readOnly
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <div>
      <div className="flex rounded-full p-0.5 mb-4 w-fit" style={{ background: COLORS.border }}>
        <button
          onClick={() => setSubTab('members')}
          className="px-3 py-1.5 rounded-full text-xs font-medium"
          style={{ background: subTab === 'members' ? COLORS.terracotta : 'transparent', color: subTab === 'members' ? '#fff' : COLORS.inkSoft }}
        >
          会員一覧
        </button>
        <button
          onClick={() => setSubTab('data')}
          className="px-3 py-1.5 rounded-full text-xs font-medium"
          style={{ background: subTab === 'data' ? COLORS.terracotta : 'transparent', color: subTab === 'data' ? '#fff' : COLORS.inkSoft }}
        >
          食材・商品管理
        </button>
      </div>

      {subTab === 'data' ? (
        <DataManagementView trainerId={trainerId} />
      ) : (
        <>
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} style={{ color: COLORS.terracotta }} />
            <span style={{ color: COLORS.ink }} className="font-medium text-sm">会員一覧(本日の記録)</span>
          </div>
          {loading && <div style={{ color: COLORS.inkSoft }} className="text-center py-10 text-sm">読み込み中…</div>}
          {error && (
            <p style={{ color: COLORS.rose }} className="text-sm text-center py-10">
              読み込みに失敗しました: {error}
              <br />
              トレーナー権限が付与されているか(TRAINER_LINE_USER_IDS)を確認してください。
            </p>
          )}
          {!loading && !error && members.length === 0 && (
            <p style={{ color: COLORS.inkSoft }} className="text-sm text-center py-10">
              まだ記録した会員がいません
            </p>
          )}
          <div className="space-y-2">
            {members.map((m) => {
              const targets = m.targets || DEFAULT_TARGETS;
              const saltOver = m.totalSalt > targets.salt;
              const kcalOver = m.totalKcal > targets.calories * 1.15;
              const dotColor = saltOver ? COLORS.rose : kcalOver ? COLORS.gold : COLORS.sage;
              return (
                <button
                  key={m.key}
                  onClick={() => setSelected(m)}
                  className="w-full flex items-center justify-between rounded-xl p-3.5 text-left"
                  style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: dotColor }} />
                    <span style={{ color: COLORS.ink }} className="text-sm font-medium">{m.displayName}</span>
                  </div>
                  <span style={{ color: COLORS.inkSoft }} className="text-xs">
                    {Math.round(m.totalKcal)} / {targets.calories} kcal
                    {saltOver && <span style={{ color: COLORS.rose }}> ・塩分超過</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
