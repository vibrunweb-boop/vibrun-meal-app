import { useState, useEffect, useCallback } from 'react';
import { Settings, ChevronLeft, ChevronRight, User, Store, Check, Camera, BookOpen } from 'lucide-react';
import { COLORS, MEAL_TYPES, DEFAULT_TARGETS, formatDate, formatDateLabel, addDays, num } from '../lib/helpers.js';
import * as api from '../lib/api.js';
import { Gauge, PlateVisual, MealSection, TargetPanel, WeekChart, BarcodeScannerModal, RecipeManager } from './Widgets.jsx';
import { calculateDailyScore } from '../lib/score.js';

function ProductRegisterSection({ productDb, onRegister }) {
  const EMPTY = { name: '', store: '', barcode: '', calories: '', protein: '', fat: '', carbs: '', fiber: '', salt: '', nutrients: '' };
  const [form, setForm] = useState(EMPTY);
  const [message, setMessage] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const set = (k) => (e) => {
    setForm({ ...form, [k]: e.target.value });
    if (message) setMessage('');
  };

  const handleScan = (code) => {
    setShowScanner(false);
    const match = productDb.find((p) => p.barcode && p.barcode === code);
    if (match) {
      setForm({
        name: match.name,
        store: match.store || '',
        barcode: code,
        calories: String(match.calories),
        protein: String(match.protein),
        fat: String(match.fat),
        carbs: String(match.carbs),
        fiber: String(match.fiber || 0),
        salt: String(match.salt),
        nutrients: match.nutrients || '',
      });
      setMessage('既に登録済みの商品です。内容を確認・修正して保存してください。');
    } else {
      setForm({ ...form, barcode: code });
      setMessage('新しいバーコードです。商品名と栄養情報を入力してください。');
    }
  };

  const submit = async () => {
    if (!form.name.trim()) return;
    const entry = {
      name: form.name.trim(),
      store: form.store.trim(),
      barcode: form.barcode.trim(),
      calories: num(form.calories),
      protein: num(form.protein),
      fat: num(form.fat),
      carbs: num(form.carbs),
      fiber: num(form.fiber),
      salt: num(form.salt),
      nutrients: form.nutrients.trim(),
    };
    try {
      const isNew = await onRegister(entry);
      setMessage(isNew ? `✓ 「${entry.name}」を登録しました` : `✓ 「${entry.name}」の情報を更新しました`);
      setForm(EMPTY);
    } catch (err) {
      setMessage(`登録に失敗しました: ${err.message}`);
    }
  };

  const recent = [...productDb].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 5);

  return (
    <div className="rounded-xl p-4 mb-3" style={{ background: COLORS.card, border: `2px solid ${COLORS.terracotta}33` }}>
      <div className="flex items-center gap-2 mb-1">
        <Store size={16} style={{ color: COLORS.terracotta }} />
        <h3 style={{ fontFamily: "'Shippori Mincho', serif", color: COLORS.ink }} className="text-base">
          コンビニ・スーパー商品を登録
        </h3>
      </div>
      <p style={{ color: COLORS.inkSoft }} className="text-[11px] mb-3">
        ここで登録すると、他の会員が同じ商品名を入力したときに食事記録の候補として自動表示されます。今日の食事の記録はここでは行いません。
      </p>

      <input
        value={form.name}
        onChange={set('name')}
        placeholder="商品名(例: セブンプレミアム 鶏むね肉のサラダ)"
        className="w-full mb-2 px-2 py-1.5 rounded text-sm outline-none"
        style={{ border: `1px solid ${COLORS.border}`, background: COLORS.bg, color: COLORS.ink }}
      />
      <input
        value={form.store}
        onChange={set('store')}
        placeholder="購入店(任意) 例: セブンイレブン"
        className="w-full mb-2 px-2 py-1.5 rounded text-sm outline-none"
        style={{ border: `1px solid ${COLORS.border}`, background: COLORS.bg, color: COLORS.ink }}
      />
      <div className="flex gap-1.5 mb-2">
        <input
          value={form.barcode}
          onChange={set('barcode')}
          placeholder="バーコード番号(任意)"
          inputMode="numeric"
          className="flex-1 px-2 py-1.5 rounded text-sm outline-none"
          style={{ border: `1px solid ${COLORS.border}`, background: COLORS.bg, color: COLORS.ink }}
        />
        <button
          onClick={() => {
            setMessage('');
            setShowScanner(true);
          }}
          className="px-2 rounded flex items-center justify-center"
          style={{ border: `1px solid ${COLORS.border}`, background: COLORS.bg, color: COLORS.terracotta }}
          title="バーコードでスキャン"
        >
          <Camera size={16} />
        </button>
      </div>
      {showScanner && <BarcodeScannerModal onDetect={handleScan} onClose={() => setShowScanner(false)} />}
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
            style={{ border: `1px solid ${COLORS.border}`, background: COLORS.bg, color: COLORS.ink }}
          />
        ))}
      </div>
      <input
        value={form.nutrients}
        onChange={set('nutrients')}
        placeholder="豊富な栄養素(任意) 例: ビタミンC, 鉄"
        className="w-full mb-3 px-2 py-1.5 rounded text-sm outline-none"
        style={{ border: `1px solid ${COLORS.border}`, background: COLORS.bg, color: COLORS.ink }}
      />

      <div className="flex items-center justify-between">
        <span style={{ color: COLORS.sage }} className="text-xs">{message}</span>
        <button
          onClick={submit}
          className="text-xs px-4 py-1.5 rounded font-medium flex items-center gap-1"
          style={{ background: COLORS.terracotta, color: '#fff' }}
        >
          <Check size={14} /> 登録する
        </button>
      </div>

      {recent.length > 0 && (
        <div className="mt-3 pt-3" style={{ borderTop: `1px dashed ${COLORS.border}` }}>
          <p style={{ color: COLORS.inkSoft }} className="text-[11px] mb-1.5">
            最近登録された商品(全{productDb.length}件)
          </p>
          <ul className="space-y-1">
            {recent.map((p) => (
              <li key={p.id} className="flex justify-between text-xs">
                <span style={{ color: COLORS.ink }}>{p.name}{p.store ? `(${p.store})` : ''}</span>
                <span style={{ color: COLORS.inkSoft }}>{Math.round(p.calories)}kcal</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
function ScoreBadge({ score }) {
  if (score === null) return null;
  const color = score >= 80 ? COLORS.sage : score >= 50 ? COLORS.gold : COLORS.rose;
  return (
    <div className="flex flex-col items-center justify-center mb-3">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ border: `3px solid ${color}` }}
      >
        <span style={{ color }} className="text-xl font-semibold">{score}</span>
      </div>
      <span style={{ color: COLORS.inkSoft }} className="text-[11px] mt-1">今日の食事スコア</span>
    </div>
  );
}

export default function MemberDashboard({ ownerId, viewerId, displayName, readOnly, onBack }) {
  // ownerId:  表示対象(誰の記録を見せるか)
  // viewerId: 実際にリクエストしているログイン中の人(x-user-id ヘッダーに使う)
  // 会員が自分のページを見るときは ownerId === viewerId。
  // トレーナーが会員の記録を閲覧するときは、ownerId=閲覧対象の会員, viewerId=トレーナー自身。
  const [data, setData] = useState(null);
  const [ingredientDb, setIngredientDb] = useState([]);
  const [productDb, setProductDb] = useState([]);
  const [recipeDb, setRecipeDb] = useState([]);
  const [showRecipes, setShowRecipes] = useState(false);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [showTargets, setShowTargets] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (readOnly) {
        // トレーナーが会員の記録を閲覧する場合(読み取り専用)
        const d = await api.fetchTrainerMemberDetail(viewerId, ownerId);
        setData(d);
      } else {
        const d = await api.fetchMemberData(viewerId);
        setData(d);
        const [ing, prod, rec] = await Promise.all([api.fetchIngredientDb(), api.fetchProductDb(), api.fetchRecipes(viewerId)]);
        setIngredientDb(ing);
        setProductDb(prod);
        setRecipeDb(rec);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [ownerId, viewerId, displayName, readOnly]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const incrementProductUse = async (productId) => {
    try {
      await api.incrementProductUseCount(viewerId, productId);
      setProductDb((prev) => prev.map((p) => (p.id === productId ? { ...p, useCount: (p.useCount || 1) + 1 } : p)));
    } catch (err) {
      console.error(err);
    }
  };

  const saveRecipe = async (recipe) => {
    const saved = await api.saveRecipeApi(viewerId, recipe);
    setRecipeDb((prev) => [...prev, saved]);
  };
  
  const deleteRecipeHandler = async (id) => {
    await api.deleteRecipeApi(viewerId, id);
    setRecipeDb((prev) => prev.filter((r) => r.id !== id));
  };  
  
  const registerProduct = async (entry) => {
    const { isNew } = await api.registerOrUpdateProduct(viewerId, entry);
    const fresh = await api.fetchProductDb();
    setProductDb(fresh);
    return isNew;
  };

  if (error) {
    return <div style={{ color: COLORS.rose }} className="text-center py-10 text-sm">読み込みに失敗しました: {error}</div>;
  }
  if (loading || !data) {
    return <div style={{ color: COLORS.inkSoft }} className="text-center py-10 text-sm">読み込み中…</div>;
  }

  const todaysMeals = data.meals.filter((m) => m.date === selectedDate);
  const totals = todaysMeals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      fat: acc.fat + m.fat,
      carbs: acc.carbs + m.carbs,
      fiber: acc.fiber + (m.fiber || 0),
      salt: acc.salt + m.salt,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, salt: 0 }
  );

const score = calculateDailyScore(totals, data.targets);

  const addMeal = async (mealType, entry) => {
    try {
      const meal = await api.addMealEntry(viewerId, mealType, selectedDate, entry);
      setData((prev) => ({ ...prev, meals: [...prev.meals, meal] }));
    } catch (err) {
      console.error(err);
    }
  };
  const deleteMeal = async (id) => {
    try {
      await api.deleteMealEntry(viewerId, id);
      setData((prev) => ({ ...prev, meals: prev.meals.filter((m) => m.id !== id) }));
    } catch (err) {
      console.error(err);
    }
  };
  const saveTargets = async (targets) => {
    try {
      const updated = await api.updateTargets(viewerId, targets);
      setData((prev) => ({ ...prev, targets: updated }));
      setShowTargets(false);
    } catch (err) {
      console.error(err);
    }
  };
  const resetData = async () => {
    try {
      const fresh = await api.resetMemberData(viewerId);
      setData(fresh);
      setShowTargets(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {onBack && (
            <button onClick={onBack} style={{ color: COLORS.inkSoft }}>
              <ChevronLeft size={20} />
            </button>
          )}
          <User size={16} style={{ color: COLORS.terracotta }} />
          <span style={{ color: COLORS.ink }} className="font-medium text-sm">{displayName}</span>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-3">
            <button onClick={() => setShowRecipes(true)} style={{ color: COLORS.inkSoft }}>
              <BookOpen size={18} />
            </button>
            <button onClick={() => setShowTargets(true)} style={{ color: COLORS.inkSoft }}>
              <Settings size={18} />
            </button>
          </div>
        )}     
      </div>

      <div className="flex items-center justify-center gap-4 mb-4">
        <button onClick={() => setSelectedDate(addDays(selectedDate, -1))} style={{ color: COLORS.inkSoft }}>
          <ChevronLeft size={18} />
        </button>
        <span style={{ color: COLORS.ink, fontFamily: "'Shippori Mincho', serif" }} className="text-lg">
          {formatDateLabel(selectedDate)}
        </span>
        <button
          onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          disabled={selectedDate >= formatDate(new Date())}
          style={{ color: selectedDate >= formatDate(new Date()) ? COLORS.border : COLORS.inkSoft }}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="rounded-xl p-5 mb-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        <ScoreBadge score={score} />
        <PlateVisual protein={totals.protein} fat={totals.fat} carbs={totals.carbs} />
        <div className="text-center mt-2 mb-4">
          <span style={{ color: COLORS.ink }} className="text-2xl font-semibold">{Math.round(totals.calories)}</span>
          <span style={{ color: COLORS.inkSoft }} className="text-sm"> / {data.targets.calories} kcal</span>
        </div>
        <Gauge label="たんぱく質" value={totals.protein} target={data.targets.protein} unit="g" color={COLORS.terracotta} />
        <Gauge label="脂質" value={totals.fat} target={data.targets.fat} unit="g" color={COLORS.gold} />
        <Gauge label="炭水化物" value={totals.carbs} target={data.targets.carbs} unit="g" color={COLORS.sage} />
        <Gauge label="食物繊維" value={totals.fiber} target={data.targets.fiber} unit="g" color={COLORS.gold} />
        <Gauge label="塩分" value={totals.salt} target={data.targets.salt} unit="g" color={COLORS.rose} danger />
      </div>

      {MEAL_TYPES.map((mt) => (
        <MealSection
          key={mt.key}
          mealLabel={mt.label}
          entries={todaysMeals.filter((m) => m.mealType === mt.key)}
          onAdd={(entry) => addMeal(mt.key, entry)}
          onDelete={deleteMeal}
          readOnly={readOnly}
          ingredientDb={ingredientDb}
          productDb={productDb}
          recipeDb={recipeDb}
          onUseProduct={incrementProductUse}
        />
      ))}

      {!readOnly && <ProductRegisterSection productDb={productDb} onRegister={registerProduct} />}

      <WeekChart meals={data.meals} selectedDate={selectedDate} />

      {showTargets && (
        <TargetPanel targets={data.targets} onSave={saveTargets} onClose={() => setShowTargets(false)} onReset={resetData} />
      )}
      {showRecipes && (
        <RecipeManager
          recipeDb={recipeDb}
          ingredientDb={ingredientDb}
          onSave={saveRecipe}
          onDelete={deleteRecipeHandler}
          onClose={() => setShowRecipes(false)}
         />
       )}
     </div>
  );
}