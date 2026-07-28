import { useState, useEffect } from 'react';
import liff from '@line/liff';
import { COLORS } from '../lib/helpers.js';

export default function LiffGate({ onReady }) {
  const [status, setStatus] = useState('initializing'); // initializing | error
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        await liff.init({ liffId: import.meta.env.VITE_LIFF_ID });
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }
        const idToken = liff.getIDToken();
        const profile = await liff.getProfile();
        if (cancelled) return;
        onReady({
          idToken,
          userId: profile.userId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl,
        });
      } catch (e) {
        if (!cancelled) {
          setStatus('error');
          setErrorMessage(e?.message || String(e));
        }
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [onReady]);

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <p style={{ color: COLORS.rose }} className="text-sm mb-2">
          LINEログインに失敗しました
        </p>
        <p style={{ color: COLORS.inkSoft }} className="text-xs">{errorMessage}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <p style={{ color: COLORS.inkSoft }} className="text-sm">LINEでログイン中…</p>
    </div>
  );
}