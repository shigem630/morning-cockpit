import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
} from 'firebase/firestore';

// web の apiKey は公開されることを前提に設計された値。守るのはルールとリファラ制限のほう。
const firebaseConfig = {
  apiKey: 'AIzaSyABe18Aqo-YDp5wdzUINft2pfPX5Iso5hI',
  authDomain: 'morning-cockpit-38e47.firebaseapp.com',
  projectId: 'morning-cockpit-38e47',
  storageBucket: 'morning-cockpit-38e47.firebasestorage.app',
  messagingSenderId: '102076936598',
  appId: '1:102076936598:web:086679dcf472c0efa62db7',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// 自前の楽観的更新を書かない。ローカル即時反映・サーバ拒否時のロールバック・
// 複数タブ同期を、この2行で標準機能として得る。
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  // 既定では undefined のフィールドを1つ渡すだけで書き込み全体が例外になる。
  // 「〆切なし」のような任意項目が普通にあるので、無視する設定にしておく。
  ignoreUndefinedProperties: true,
});

export const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

/** ログイン。カレンダー読み取りのスコープも同時に要求する。 */
export async function login() {
  const provider = new GoogleAuthProvider();
  provider.addScope(CALENDAR_SCOPE);
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  const cred = GoogleAuthProvider.credentialFromResult(result);
  if (cred?.accessToken) saveCalendarToken(cred.accessToken);
  return result.user;
}

export function logout() {
  clearCalendarToken();
  return signOut(auth);
}

/* ───────── カレンダー用アクセストークン ─────────
   Firebase はリフレッシュトークンを渡さないので、この値は約1時間で切れる。
   切れたら黙って古い予定を出さず、「取得できません・読み直す」を画面に出す。 */

const TOKEN_KEY = 'mc.calToken';
const TOKEN_AT_KEY = 'mc.calTokenAt';
const TOKEN_TTL_MS = 55 * 60 * 1000;

export function saveCalendarToken(token: string) {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(TOKEN_AT_KEY, String(Date.now()));
  } catch { /* プライベートウィンドウ等。トークンは今回限りになる */ }
}

export function clearCalendarToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_AT_KEY);
  } catch { /* 読めない環境では何もしない */ }
}

export function getCalendarToken(): string | null {
  try {
    const at = Number(sessionStorage.getItem(TOKEN_AT_KEY) || 0);
    if (!at || Date.now() - at > TOKEN_TTL_MS) return null;
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
