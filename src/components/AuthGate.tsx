import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { firebaseAuth } from '../lib/firebase';

const ADMIN_EMAIL = 'pantipa3826@gmail.com';

interface AuthGateProps {
  children: ReactNode;
}

export default function AuthGate({ children }: AuthGateProps) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => onAuthStateChanged(firebaseAuth, (nextUser) => {
    setUser(nextUser);
    setChecking(false);
  }), []);

  const isAllowed = user?.email?.toLowerCase() === ADMIN_EMAIL;

  async function loginWithEmail(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const credential = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
      if (credential.user.email?.toLowerCase() !== ADMIN_EMAIL) {
        await signOut(firebaseAuth);
        throw new Error('บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลระบบ');
      }
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }

  async function loginWithGoogle() {
    setLoading(true);
    setError('');
    try {
      const credential = await signInWithPopup(firebaseAuth, new GoogleAuthProvider());
      if (credential.user.email?.toLowerCase() !== ADMIN_EMAIL) {
        await signOut(firebaseAuth);
        throw new Error('บัญชี Google นี้ไม่มีสิทธิ์ผู้ดูแลระบบ');
      }
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'เข้าสู่ระบบด้วย Google ไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return <div className="min-h-screen grid place-items-center bg-slate-950 text-white">กำลังตรวจสอบบัญชี...</div>;
  }

  if (user && !isAllowed) {
    void signOut(firebaseAuth);
  }

  if (!user || !isAllowed) {
    return (
      <main className="min-h-screen grid place-items-center bg-slate-950 px-4 text-white">
        <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-7 shadow-2xl backdrop-blur">
          <p className="mb-2 text-sm text-cyan-300">AI Voice LINE Announcer</p>
          <h1 className="text-2xl font-semibold">เข้าสู่ระบบผู้ดูแล</h1>
          <p className="mt-2 text-sm text-slate-400">ใช้บัญชีที่ลงทะเบียนใน Firebase Authentication</p>

          <form className="mt-6 space-y-4" onSubmit={loginWithEmail}>
            <label className="block text-sm">
              อีเมล
              <input
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-cyan-400"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label className="block text-sm">
              รหัสผ่าน
              <input
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-cyan-400"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            {error && <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
            <button
              className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-medium text-slate-950 disabled:opacity-50"
              disabled={loading}
              type="submit"
            >
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>

          <button
            className="mt-3 w-full rounded-xl border border-white/15 px-4 py-3 font-medium disabled:opacity-50"
            disabled={loading}
            onClick={loginWithGoogle}
            type="button"
          >
            เข้าสู่ระบบด้วย Google
          </button>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
