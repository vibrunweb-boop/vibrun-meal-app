import { useState, useEffect, useMemo, useRef } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { Plus, Check, Store, Wheat, Camera, Trash2, RotateCcw, BookOpen } from 'lucide-react';
import { COLORS, num, uid, scaleIngredient, addDays, formatDateLabel } from '../lib/helpers.js';
import liff from '@line/liff';

export function Gauge({ label, value, target, unit, color, danger }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  const over = target > 0 && value > target;
  return (
    <div className="mb-3">
      <div className="flex justify-between items-baseline mb-1">
        <span style={{ color: COLORS.inkSoft }} className="text-xs tracking-wide">{label}</span>
        <span style={{ color: over && danger ? COLORS.rose : COLORS.ink }} className="text-sm font-semibold">
          {Math.round(value)}
          <span style={{ color: COLORS.inkSoft }} className="font-normal"> / {target}{unit}</span>
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: COLORS.border }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: over && danger ? COLORS.rose : color }}
        />
      </div>
    </div>
  );
}

export function PlateVisual({ protein, fat, carbs }) {
  const data = [
    { name: 'たんぱく質', value: protein * 4, color: COLORS.terracotta },
    { name: '脂質', value: fat * 9, color: COLORS.gold },
    { name: '炭水化物', value: carbs * 4, color: COLORS.sage },
  ];
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="relative w-40 h-40 mx-auto">
      <div
        className="absolute inset-0 rounded-full"
        style={{ boxShadow: `inset 0 0 0 6px ${COLORS.card}, inset 0 0 0 7px ${COLORS.border}` }}
      />
      {total > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={0} outerRadius={78} stroke={COLORS.card} strokeWidth={3}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="w-full h-full rounded-full flex items-center justify-center" style={{ background: COLORS.border + '55' }}>
          <span style={{ color: COLORS.inkSoft }} className="text-xs">記録なし</span>
        </div>
      )}
    </div>
  );
}

export function BarcodeScannerModal({ onDetect, onClose }) {
  const [status, setStatus] = useState('starting'); // starting | unsupported | error
  const [manualCode, setManualCode] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!liff.isInClient()) {
        // LINEアプリ内で開いていない場合(PCブラウザでのテスト等)はスキャン非対応
        if (!cancelled) setStatus('unsupported');
        return;
      }
      try {
        const result = await liff.scanCodeV2();
        if (cancelled) return;
        if (result && result.value) {
          onDetect(result.value);
        } else {
          // キャンセルされた場合
          onClose();
        }
      } catch (e) {
        if (!cancelled) setStatus('error');
      }
    }

    start();
    return () => {
      cancelled = true;
    };
  }, [onDetect, onClose]);

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4"
      style={{ background: '#00000088' }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full sm:w-96 rounded-2xl p-4" style={{ background: COLORS.card }}>
        <h3 style={{ fontFamily: "'Shippori Mincho', serif", color: COLORS.ink }} className="text-base mb-2">
          バーコードをスキャン
        </h3>

        {status === 'starting' && (
          <p style={{ color: COLORS.inkSoft }} className="text-xs mb-3">
            LINEのスキャン画面を起動しています…
          </p>
        )}

        {(status === 'unsupported' || status === 'error') && (
          <p style={{ color: COLORS.inkSoft }} className="text-xs mb-3">
            {status === 'unsupported'
              ? 'この環境ではカメラスキャンをご利用いただけません。バーコード番号を直接入力してください。'
              : 'スキャンに失敗しました。バーコード番号を直接入力してください。'}
          </p>
        )}

        <div className="flex gap-2 mb-2">
          <input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="バーコード番号を入力"
            inputMode="numeric"
            className="flex-1 px-2 py-1.5 rounded text-sm outline-none"
            style={{ border: `1px solid ${COLORS.border}`, background: COLORS.bg, color: COLORS.ink }}
          />
          <button
            onClick={() => manualCode.trim() && onDetect(manualCode.trim())}
            className="px-3 py-1.5 rounded text-xs font-medium"
            style={{ background: COLORS.terracotta, color: '#fff' }}
          >
            確定
          </button>
        </div>

        <button onClick={onClose} className="w-full text-xs px-3 py-1.5 rounded" style={{ color: COLORS.inkSoft }}>
          閉じる
        </button>
      </div>
    </div>
  );
}

export function AddEntryForm({ onAdd, onCancel, ingredientDb, productDb, recipeDb, onUseProduct }) {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState(null); // { source: 'ingredient'|'product', ...data }
  const [grams, setGrams] = useState('100');
  const [vals, setVals] = useState({ calories: '', protein: '', fat: '', carbs: '', fiber: '', salt: '' });
  const [showScanner, setShowScanner] = useState(false);
  const [scanMessage, setScanMessage] = useState('');

  const suggestions = useMemo(() => {
    const q = name.trim();
  if (!q || selected) return [];
  const pool = [
    ...ingredientDb.map((i) => ({ ...i, source: 'ingredient' })),
    ...productDb.map((p) => ({ ...p, source: 'product' })),
    ...recipeDb.map((r) => ({ ...r, source: 'recipe' })),
  ];
  const starts = pool.filter((i) => i.name.startsWith(q));
  const includes = pool.filter((i) => !i.name.startsWith(q) && i.name.includes(q));
  return [...starts, ...includes].slice(0, 6);
}, [name, selected, ingredientDb, productDb, recipeDb]);

  const handleNameChange = (e) => {
    const v = e.target.value;
    setName(v);
    if (selected && v !== selected.name) setSelected(null);
  };

  const pickSuggestion = (item) => {
    setName(item.name);
    setSelected(item);
    if (item.source === 'ingredient') {
      setGrams('100');
      setVals(scaleIngredientToStrings(item, '100'));
    } else {
      setVals({
        calories: String(item.calories),
        protein: String(item.protein),
        fat: String(item.fat),
        carbs: String(item.carbs),
        fiber: String(item.fiber || 0),
        salt: String(item.salt),
      });
    }
  };

  function scaleIngredientToStrings(ing, g) {
    const s = scaleIngredient(ing, g);
    return {
      calories: String(s.calories),
      protein: String(s.protein),
      fat: String(s.fat),
      carbs: String(s.carbs),
      fiber: String(s.fiber),
      salt: String(s.salt),
    };
  }

  const handleGramsChange = (e) => {
    const g = e.target.value;
    setGrams(g);
    if (selected?.source === 'ingredient') setVals(scaleIngredientToStrings(selected, g));
  };

  const setField = (k) => (e) => setVals({ ...vals, [k]: e.target.value });

  const handleBarcodeDetect = (code) => {
    setShowScanner(false);
    const match = productDb.find((p) => p.barcode && p.barcode === code);
    if (match) {
      pickSuggestion({ ...match, source: 'product' });
      setScanMessage('');
    } else {
      setScanMessage(`バーコード${code}の商品は未登録です。「コンビニ・スーパー商品を登録」で登録すると次回から使えます。`);
    }
  };

  const reset = () => {
    setName('');
    setSelected(null);
    setGrams('100');
    setVals({ calories: '', protein: '', fat: '', carbs: '', fiber: '', salt: '' });
    setScanMessage('');
  };

  const submit = () => {
    if (!name.trim()) return;
    const finalVals = {
      calories: num(vals.calories),
      protein: num(vals.protein),
      fat: num(vals.fat),
      carbs: num(vals.carbs),
      fiber: num(vals.fiber),
      salt: num(vals.salt),
    };
    const finalName = selected?.source === 'ingredient' ? `${selected.name}(${num(grams) || 0}g)` : name.trim();

    onAdd({ id: uid(), name: finalName, nutrients: selected?.nutrients || '', ...finalVals });

    if (selected?.source === 'product') {
      onUseProduct(selected.id);
    }
    reset();
  };

  return (
    <div className="rounded-lg p-3 mt-2 mb-1" style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}` }}>
      <div className="relative flex gap-1.5">
        <input
          value={name}
          onChange={handleNameChange}
          placeholder="食材名または商品名(例: 鶏むね肉、おにぎり)"
          className="flex-1 mb-1 px-2 py-1.5 rounded text-sm outline-none"
          style={{ border: `1px solid ${COLORS.border}`, background: COLORS.card, color: COLORS.ink }}
        />
        <button
          onClick={() => {
            setScanMessage('');
            setShowScanner(true);
          }}
          className="mb-1 px-2 rounded flex items-center justify-center"
          style={{ border: `1px solid ${COLORS.border}`, background: COLORS.card, color: COLORS.terracotta }}
          title="バーコードでスキャン"
        >
          <Camera size={16} />
        </button>
        {suggestions.length > 0 && (
          <div
            className="absolute z-10 left-0 right-0 rounded-lg overflow-hidden shadow-md"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
          >
            {suggestions.map((s, i) => (
              <button
                key={`${s.source}-${s.name}-${i}`}
                onClick={() => pickSuggestion(s)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 text-left text-xs"
                style={{ borderTop: i > 0 ? `1px solid ${COLORS.border}` : 'none' }}
              >
                <span className="flex items-center gap-1.5" style={{ color: COLORS.ink }}>
                  {s.source === 'ingredient' ? (
                    <Wheat size={12} style={{ color: COLORS.sage }} />
                  ) : s.source === 'recipe' ? (
                    <BookOpen size={12} style={{ color: COLORS.gold }} />
                  ) : (  
                    <Store size={12} style={{ color: COLORS.terracotta }} />
                  )}
                  {s.name}
                </span>
                <span style={{ color: COLORS.inkSoft }}>
                  {s.source === 'ingredient'
                    ? `${s.calories}kcal/100g`
                    : s.source === 'recipe'
                    ? `${s.calories}kcal`
                    : `${s.calories}kcal${s.store ? `(${s.store})` : ''}`}
  
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {scanMessage && (
        <p className="text-[11px] mb-2" style={{ color: COLORS.rose }}>{scanMessage}</p>
      )}

      {showScanner && <BarcodeScannerModal onDetect={handleBarcodeDetect} onClose={() => setShowScanner(false)} />}

      {selected && (
        <p className="text-[11px] mb-2" style={{ color: selected.source === 'ingredient' ? COLORS.sage : COLORS.terracotta }}>
          {selected.source === 'ingredient' ? '✓ 食材データベースから自動計算(重さを調整できます)' : `✓ みんなの商品データベースから自動入力${selected.store ? '(' + selected.store + ')' : ''}`}
          {selected.nutrients ? `・豊富な栄養素: ${selected.nutrients}` : ''}
        </p>
      )}

      {selected?.source === 'ingredient' && (
        <div className="flex items-center gap-2 mb-2">
          <label style={{ color: COLORS.inkSoft }} className="text-xs">重さ</label>
          <input
            type="number"
            inputMode="decimal"
            value={grams}
            onChange={handleGramsChange}
            className="w-20 px-2 py-1 rounded text-xs text-center outline-none"
            style={{ border: `1px solid ${COLORS.border}`, background: COLORS.card, color: COLORS.ink }}
          />
          <span style={{ color: COLORS.inkSoft }} className="text-xs">g</span>
        </div>
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
            value={vals[k]}
            onChange={setField(k)}
            placeholder={ph}
            className="w-full px-1.5 py-1.5 rounded text-xs outline-none text-center"
            style={{ border: `1px solid ${COLORS.border}`, background: COLORS.card, color: COLORS.ink }}
          />
        ))}
      </div>

      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="text-xs px-3 py-1.5 rounded" style={{ color: COLORS.inkSoft }}>
          キャンセル
        </button>
        <button
          onClick={submit}
          className="text-xs px-3 py-1.5 rounded font-medium flex items-center gap-1"
          style={{ background: COLORS.terracotta, color: '#fff' }}
        >
          <Check size={14} /> 追加
        </button>
      </div>
    </div>
  );
}

export function MealSection({ mealLabel, entries, onAdd, onDelete, readOnly, ingredientDb, productDb, recipeDb, onUseProduct }) {
  const [adding, setAdding] = useState(false);
  const subtotal = entries.reduce((s, e) => s + e.calories, 0);
  return (
    <div className="rounded-xl p-4 mb-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
      <div className="flex justify-between items-center">
        <h3 style={{ fontFamily: "'Shippori Mincho', serif", color: COLORS.ink }} className="text-base">
          {mealLabel}
        </h3>
        <div className="flex items-center gap-2">
          <span style={{ color: COLORS.inkSoft }} className="text-xs">{Math.round(subtotal)} kcal</span>
          {!readOnly && (
            <button onClick={() => setAdding(!adding)} style={{ color: COLORS.terracotta }}>
              <Plus size={18} />
            </button>
          )}
        </div>
      </div>
      {entries.length > 0 && (
        <ul className="mt-2 space-y-1">
          {entries.map((e) => (
            <li key={e.id} className="flex justify-between items-start text-sm py-1" style={{ borderTop: `1px dashed ${COLORS.border}` }}>
              <div>
                <span style={{ color: COLORS.ink }}>{e.name}</span>
                {e.nutrients && (
                  <p style={{ color: COLORS.sage }} className="text-[10px] mt-0.5">豊富な栄養素: {e.nutrients}</p>
                )}
              </div>
              <div className="flex items-center gap-2 pt-0.5">
                <span style={{ color: COLORS.inkSoft }} className="text-xs">{Math.round(e.calories)}kcal</span>
                {!readOnly && (
                  <button onClick={() => onDelete(e.id)} style={{ color: COLORS.inkSoft }}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {adding && !readOnly && (
        <AddEntryForm
          ingredientDb={ingredientDb}
          productDb={productDb}
          recipeDb={recipeDb}
          onUseProduct={onUseProduct}
          onAdd={(entry) => {
            onAdd(entry);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      )}
      {entries.length === 0 && !adding && (
        <p style={{ color: COLORS.inkSoft }} className="text-xs mt-2">
          まだ記録がありません
        </p>
      )}
    </div>
  );
}

export function RecipeManager({ recipeDb, ingredientDb, onSave, onDelete, onClose }) {
  const [name, setName] = useState('');
  const [items, setItems] = useState([]); // [{ ingredientId, name, grams }]
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');

  const suggestions = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return ingredientDb.filter((i) => i.name.includes(q)).slice(0, 6);
  }, [query, ingredientDb]);

  const addItem = (ing) => {
    setItems((prev) => [...prev, { ingredientId: ing.id, name: ing.name, grams: 100 }]);
    setQuery('');
  };
  const updateGrams = (idx, g) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, grams: g } : it)));
  };
  const removeItem = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const totals = useMemo(() => {
    return items.reduce(
      (acc, it) => {
        const ing = ingredientDb.find((i) => i.id === it.ingredientId);
        if (!ing) return acc;
        const s = scaleIngredient(ing, it.grams);
        return {
          calories: acc.calories + s.calories,
          protein: acc.protein + s.protein,
          fat: acc.fat + s.fat,
          carbs: acc.carbs + s.carbs,
          fiber: acc.fiber + (s.fiber || 0),
          salt: acc.salt + s.salt,
        };
      },
      { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, salt: 0 }
    );
  }, [items, ingredientDb]);

  const submit = async () => {
    if (!name.trim() || items.length === 0) {
      setMessage('レシピ名と食材を入力してください');
      return;
    }
    try {
      await onSave({
        name: name.trim(),
        items: items.map((it) => ({ name: it.name, grams: it.grams })),
        calories: Math.round(totals.calories),
        protein: Math.round(totals.protein * 10) / 10,
        fat: Math.round(totals.fat * 10) / 10,
        carbs: Math.round(totals.carbs * 10) / 10,
        fiber: Math.round(totals.fiber * 10) / 10,
        salt: Math.round(totals.salt * 10) / 10,
      });
      setName('');
      setItems([]);
      setMessage('保存しました');
    } catch (err) {
      setMessage(`保存に失敗しました: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-20 flex items-end sm:items-center justify-center" style={{ background: '#00000055' }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:w-96 rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto"
        style={{ background: COLORS.card }}
      >
        <h3 style={{ fontFamily: "'Shippori Mincho', serif", color: COLORS.ink }} className="text-lg mb-3">
          マイレシピ
        </h3>

        <div className="mb-4 pb-4" style={{ borderBottom: `1px dashed ${COLORS.border}` }}>
          <p style={{ color: COLORS.inkSoft }} className="text-xs mb-2">登録済みのレシピ(他の会員には表示されません)</p>
          {recipeDb.length === 0 && <p style={{ color: COLORS.inkSoft }} className="text-xs">まだレシピがありません</p>}
          <ul className="space-y-1">
            {recipeDb.map((r) => (
              <li key={r.id} className="flex justify-between items-center text-xs">
                <span style={{ color: COLORS.ink }}>{r.name}</span>
                <div className="flex items-center gap-2">
                  <span style={{ color: COLORS.inkSoft }}>{Math.round(r.calories)}kcal</span>
                  <button onClick={() => onDelete(r.id)} style={{ color: COLORS.inkSoft }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p style={{ color: COLORS.inkSoft }} className="text-xs mb-2">新しいレシピを作る</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="レシピ名(例: 生姜焼き)"
          className="w-full mb-2 px-2 py-1.5 rounded text-sm outline-none"
          style={{ border: `1px solid ${COLORS.border}`, background: COLORS.bg, color: COLORS.ink }}
        />

        <div className="relative mb-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="食材を検索して追加"
            className="w-full px-2 py-1.5 rounded text-sm outline-none"
            style={{ border: `1px solid ${COLORS.border}`, background: COLORS.bg, color: COLORS.ink }}
          />
          {suggestions.length > 0 && (
            <div className="absolute z-10 left-0 right-0 mt-1 rounded-lg overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
              {suggestions.map((ing) => (
                <button
                  key={ing.id}
                  onClick={() => addItem(ing)}
                  className="w-full text-left px-2.5 py-1.5 text-xs"
                  style={{ color: COLORS.ink }}
                >
                  {ing.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <ul className="space-y-1.5 mb-3">
            {items.map((it, idx) => (
              <li key={idx} className="flex items-center gap-2 text-xs">
                <span style={{ color: COLORS.ink }} className="flex-1">{it.name}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={it.grams}
                  onChange={(e) => updateGrams(idx, num(e.target.value))}
                  className="w-16 px-1.5 py-1 rounded text-xs text-center outline-none"
                  style={{ border: `1px solid ${COLORS.border}`, background: COLORS.bg, color: COLORS.ink }}
                />
                <span style={{ color: COLORS.inkSoft }}>g</span>
                <button onClick={() => removeItem(idx)} style={{ color: COLORS.inkSoft }}>
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {items.length > 0 && (
          <p style={{ color: COLORS.inkSoft }} className="text-xs mb-3">
            合計: 約{Math.round(totals.calories)}kcal
          </p>
        )}

        <div className="flex items-center justify-between">
          <span style={{ color: COLORS.sage }} className="text-xs">{message}</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="text-xs px-3 py-1.5 rounded" style={{ color: COLORS.inkSoft }}>
              閉じる
            </button>
            <button
              onClick={submit}
              className="text-xs px-4 py-1.5 rounded font-medium flex items-center gap-1"
              style={{ background: COLORS.terracotta, color: '#fff' }}
            >
              <Check size={14} /> 保存する
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TargetPanel({ targets, onSave, onClose, onReset }) {
  const [t, setT] = useState(targets);
  return (
    <div className="fixed inset-0 z-20 flex items-end sm:items-center justify-center" style={{ background: '#00000055' }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:w-96 rounded-t-2xl sm:rounded-2xl p-5"
        style={{ background: COLORS.card }}
      >
        <h3 style={{ fontFamily: "'Shippori Mincho', serif", color: COLORS.ink }} className="text-lg mb-3">
          目標値の設定
        </h3>
        {[
          ['calories', 'カロリー (kcal)'],
          ['protein', 'たんぱく質 (g)'],
          ['fat', '脂質 (g)'],
          ['carbs', '炭水化物 (g)'],
          ['fiber', '食物繊維 (g)'],
          ['salt', '塩分 (g)'],
        ].map(([k, label]) => (
          <div key={k} className="flex items-center justify-between mb-2">
            <label style={{ color: COLORS.inkSoft }} className="text-sm">{label}</label>
            <input
              type="number"
              value={t[k]}
              onChange={(e) => setT({ ...t, [k]: num(e.target.value) })}
              className="w-24 px-2 py-1 rounded text-sm text-right outline-none"
              style={{ border: `1px solid ${COLORS.border}`, color: COLORS.ink }}
            />
          </div>
        ))}
        <div className="flex justify-between items-center mt-4">
          <button onClick={onReset} className="text-xs flex items-center gap-1" style={{ color: COLORS.rose }}>
            <RotateCcw size={13} /> このデータをリセット
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="text-sm px-3 py-1.5 rounded" style={{ color: COLORS.inkSoft }}>
              閉じる
            </button>
            <button
              onClick={() => onSave(t)}
              className="text-sm px-4 py-1.5 rounded font-medium"
              style={{ background: COLORS.terracotta, color: '#fff' }}
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WeekChart({ meals, selectedDate }) {
  const days = useMemo(() => {
    const arr = [];
    for (let i = 6; i >= 0; i--) arr.push(addDays(selectedDate, -i));
    return arr;
  }, [selectedDate]);
  const data = days.map((d) => ({
    day: formatDateLabel(d).replace(/\(.*\)/, ''),
    kcal: meals.filter((m) => m.date === d).reduce((s, m) => s + m.calories, 0),
  }));
  return (
    <div className="rounded-xl p-4 mb-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
      <h3 style={{ fontFamily: "'Shippori Mincho', serif", color: COLORS.ink }} className="text-base mb-2">
        直近7日間の推移
      </h3>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: COLORS.inkSoft }} axisLine={{ stroke: COLORS.border }} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: COLORS.inkSoft }} axisLine={false} tickLine={false} />
          <Tooltip formatter={(v) => [`${Math.round(v)} kcal`, '']} contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: COLORS.border }} />
          <Bar dataKey="kcal" fill={COLORS.terracotta} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
