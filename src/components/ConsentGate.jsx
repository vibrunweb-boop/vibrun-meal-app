import { useState, useEffect } from 'react';
import { COLORS } from '../lib/helpers.js';
import * as api from '../lib/api.js';

const POLICY_TEXT = `プライバシーポリシー(食事ノート)

VIBRUN合同会社(以下「当社」といいます)は、会員向け食事記録アプリ「食事ノート」
(以下「本アプリ」といいます)の提供にあたり、以下のとおり個人情報を取り扱います。

1. 取得する情報
・LINEアカウントの表示名、プロフィール画像、LINEユーザーID
・本アプリに記録された食事内容、カロリー・栄養バランスの目標値
・上記に付随する記録日時等の情報

2. 利用目的
・会員ご本人が、ご自身の食事記録・栄養バランスを確認できるようにするため
・トレーナーが、指導の一環として会員の記録を確認し、アドバイスを行うため
・本アプリの不具合対応、品質改善のため

3. 第三者提供について
法令に基づく場合を除き、ご本人の同意なく第三者に提供することはありません。
当社のトレーナーは、指導目的の範囲内で会員の記録を閲覧できます。

4. 業務委託・外部サービスの利用について
本アプリはデータの保存にVercel Inc.およびUpstash Inc.が提供するクラウド
サービスを利用しています。これらのサービスの管理下でデータが保存されます。

5. データの保管期間
会員登録が有効な期間中、記録を保存します。退会等により保存の必要がなく
なった場合は、合理的な期間内に削除します。

6. 開示・訂正・削除等のご請求
ご自身の記録の確認・訂正・削除をご希望の場合は、トレーナーまたは下記
問い合わせ窓口までご連絡ください。

7. お問い合わせ窓口
VIBRUN合同会社　連絡先: pg.vibrun@gmail.com

8. 本ポリシーの変更
本ポリシーの内容は、必要に応じて変更することがあります。重要な変更が
ある場合は、本アプリ上で再度同意を求めます。

制定日: 2026年8月1日`;

export default function ConsentGate({ idToken, children }) {
  const [status, setStatus] = useState('checking'); // checking | needed | agreeing | agreed | error
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .getConsentStatus(idToken)
      .then((res) => {
        if (cancelled) return;
        setStatus(res.agreed ? 'agreed' : 'needed');
      })
      .catch((e) => {
        if (cancelled) return;
        setStatus('error');
        setErrorMessage(e?.message || String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [idToken]);

  const handleAgree = async () => {
    setStatus('agreeing');
    try {
      await api.agreeToConsent(idToken);
      setStatus('agreed');
    } catch (e) {
      setStatus('error');
      setErrorMessage(e?.message || String(e));
    }
  };

  if (status === 'checking') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <p style={{ color: COLORS.inkSoft }} className="text-sm">確認中…</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <p style={{ color: COLORS.rose }} className="text-sm mb-2">エラーが発生しました</p>
        <p style={{ color: COLORS.inkSoft }} className="text-xs">{errorMessage}</p>
      </div>
    );
  }

  if (status === 'needed' || status === 'agreeing') {
    return (
      <div className="py-6 px-2">
        <h2 style={{ fontFamily: "'Shippori Mincho', serif", color: COLORS.ink }} className="text-lg mb-3">
          ご利用にあたって
        </h2>
        <div
          className="text-xs leading-relaxed mb-4 p-3 rounded-lg overflow-y-auto"
          style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            color: COLORS.ink,
            maxHeight: '50vh',
            whiteSpace: 'pre-wrap',
          }}
        >
          {POLICY_TEXT}
        </div>
        <button
          onClick={handleAgree}
          disabled={status === 'agreeing'}
          className="w-full py-2.5 rounded-lg text-sm font-medium"
          style={{ background: COLORS.terracotta, color: '#fff', opacity: status === 'agreeing' ? 0.6 : 1 }}
        >
          {status === 'agreeing' ? '処理中…' : '同意して利用を開始する'}
        </button>
      </div>
    );
  }

  return children;
}