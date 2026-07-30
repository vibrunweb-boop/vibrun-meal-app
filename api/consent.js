import { AuthError, getUserId } from '../lib/auth.js';
import { getConsent, saveConsent, PRIVACY_POLICY_VERSION } from '../lib/consentData.js';

export default async function handler(req, res) {
  try {
    const userId = await getUserId(req); // await を忘れないこと

    if (req.method === 'GET') {
      const consent = await getConsent(userId);
      const agreed = !!consent && consent.version === PRIVACY_POLICY_VERSION;
      return res.status(200).json({ agreed, currentVersion: PRIVACY_POLICY_VERSION });
    }

    if (req.method === 'POST') {
      const record = await saveConsent(userId, PRIVACY_POLICY_VERSION);
      return res.status(200).json({ agreed: true, currentVersion: PRIVACY_POLICY_VERSION, consent: record });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof AuthError) return res.status(401).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: 'Internal error' });
  }
}