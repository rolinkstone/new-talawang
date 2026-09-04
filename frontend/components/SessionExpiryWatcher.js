// components/SessionExpiryWatcher.js
// Watcher global (dipasang di _app.js) untuk:
//  1. Menampilkan peringatan + countdown sebelum session habis.
//  2. Auto-redirect ke /login?message=session_expired saat session habis.
//  3. Menangkap response 401 dari API (token tidak valid) lalu memperlakukan
//     sebagai session habis, sehingga semua halaman protected mendapat perilaku sama.
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';
import { getTimeLeftMs, SESSION_WARNING_MS, formatCountdown } from '../utils/sessionExpiry';

const LOGIN_URL = '/login?message=session_expired';

export default function SessionExpiryWatcher() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [secondsLeft, setSecondsLeft] = useState(null);
    const [showWarning, setShowWarning] = useState(false);
    const [expired, setExpired] = useState(false);
    const handlingRef = useRef(false);
    const sessionRef = useRef(session);
    sessionRef.current = session;

    const authenticated = status === 'authenticated' && !!session;
    const isAuthPage = router.pathname === '/login';

    const redirectToLogin = () => {
        window.location.href = LOGIN_URL;
    };

    // Bersihkan sesi lokal lalu arahkan ke login dengan pesan warning yang jelas.
    const runExpiry = async () => {
        if (handlingRef.current) return;
        handlingRef.current = true;
        setExpired(true);
        try {
            localStorage.removeItem('token');
            localStorage.removeItem('access_token');
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('access_token');
        } catch (_) { /* ignore */ }
        try {
            if (window.clearUserCache) window.clearUserCache();
        } catch (_) { /* ignore */ }
        try {
            await signOut({ redirect: false, callbackUrl: '/login' });
        } catch (_) { /* ignore */ }
        redirectToLogin();
    };

    // ==== Interceptor global: 401 dari axios mana pun = token invalid ====
    useEffect(() => {
        let disposed = false;
        const responseInterceptor = axios.interceptors.response.use(
            (res) => res,
            (err) => {
                if (err?.response?.status === 401 && !disposed) {
                    window.dispatchEvent(new Event('session-expired'));
                }
                return Promise.reject(err);
            }
        );
        return () => {
            disposed = true;
            axios.interceptors.response.eject(responseInterceptor);
        };
    }, []);

    // ==== Dengarkan event session habis / unauthorized ====
    useEffect(() => {
        if (!authenticated || isAuthPage) return undefined;
        const handleExpiryEvent = () => runExpiry();
        window.addEventListener('session-expired', handleExpiryEvent);
        window.addEventListener('unauthorized', handleExpiryEvent);
        return () => {
            window.removeEventListener('session-expired', handleExpiryEvent);
            window.removeEventListener('unauthorized', handleExpiryEvent);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authenticated, isAuthPage, session?.expires]);

    // ==== Hitung mundur waktu tersisa session (client only) ====
    useEffect(() => {
        if (!authenticated || isAuthPage) {
            setShowWarning(false);
            setSecondsLeft(null);
            return undefined;
        }
        const evaluate = () => {
            const left = getTimeLeftMs(sessionRef.current);
            if (left === null) {
                setShowWarning(false);
                setSecondsLeft(null);
                return;
            }
            setSecondsLeft(Math.max(0, Math.ceil(left / 1000)));
            setShowWarning(left <= SESSION_WARNING_MS);
            if (left <= 0) runExpiry();
        };
        evaluate();
        const timer = setInterval(evaluate, 1000);
        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authenticated, isAuthPage, session?.expires]);

    // Layar penuh saat session sudah habis (muncul sesaat sebelum redirect)
    if (expired) {
        return (
            <div className="fixed inset-0 z-[9999] bg-gray-900/90 backdrop-blur-sm flex items-center justify-center p-6">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                        <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Sesi Anda Telah Berakhir</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        Demi keamanan akun, Anda akan diarahkan ke halaman login untuk masuk kembali.
                    </p>
                    <button
                        onClick={redirectToLogin}
                        className="mt-6 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        Ke Halaman Login
                    </button>
                </div>
            </div>
        );
    }

    // Peringatan countdown mendekati habis
    if (!authenticated || isAuthPage || !showWarning || secondsLeft === null) return null;

    return (
        <div className="fixed top-4 inset-x-0 z-[9998] flex justify-center px-4 pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-3 bg-amber-50 dark:bg-amber-900/90 border border-amber-300 dark:border-amber-600 text-amber-900 dark:text-amber-100 rounded-xl shadow-lg px-4 py-3 text-sm max-w-xl">
                <svg className="w-5 h-5 flex-shrink-0 text-amber-500 dark:text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                    <p className="font-semibold">Sesi akan segera berakhir</p>
                    <p className="text-xs mt-0.5 opacity-90">
                        Waktu tersisa{' '}
                        <span className="font-mono font-bold">{formatCountdown(secondsLeft * 1000)}</span>.
                        Simpan pekerjaan Anda sebelum sesi berakhir.
                    </p>
                </div>
                <button
                    onClick={() => runExpiry()}
                    className="ml-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-medium transition-colors"
                >
                    Keluar Sekarang
                </button>
            </div>
        </div>
    );
}
