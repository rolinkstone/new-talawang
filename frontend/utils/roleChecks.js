// utils/roleChecks.js
// Helper role-based checks — aman dipakai di client (browser) maupun server (getServerSideProps).
// Role disimpan di session NextAuth: session.user.roles (array) / session.user.role (string, legacy).
import { isSessionExpired } from './sessionExpiry';

export function getRoleList(session) {
    if (!session?.user) return [];
    const u = session.user;
    let roles = [];
    if (Array.isArray(u.roles)) roles = u.roles;
    else if (u.role) roles = Array.isArray(u.role) ? u.role : [u.role];
    return roles.filter(Boolean).map(String);
}

export function hasRole(session, patterns) {
    const roles = getRoleList(session).map((r) => r.toLowerCase());
    const list = (Array.isArray(patterns) ? patterns : [patterns]).map((p) => String(p).toLowerCase());
    return roles.some((role) => list.some((p) => role.includes(p)));
}

export const isAdmin = (session) => hasRole(session, 'admin');
export const isPPK = (session) => hasRole(session, 'ppk');
export const isKabagTu = (session) => hasRole(session, 'kabag_tu');
export const isKatim = (session) => hasRole(session, ['katim', 'kabag']);
export const isKabalai = (session) => hasRole(session, ['kabalai', 'kepala balai']);

// ============ Dipakai pada getServerSideProps ============

// ============ Dipakai saat mengirim session ke client (getServerSideProps) ============
// getSession() di server mengembalikan token MENTAH pada session.accessToken,
// sehingga tanpa dibersihkan token itu ikut tertanam di __NEXT_DATA__ tiap halaman.
// Helper ini membuang token mentah tersebut:
//   - mode proxy (NEXT_PUBLIC_API_URL berupa path, mis. "/backend"):
//     nilai diganti placeholder — token asli disuntikkan proxy dari cookie httpOnly.
//   - mode langsung (URL backend penuh): nilai dibiarkan karena komponen masih
//     memakainya untuk memanggil backend dari browser.
const API_VIA_PROXY = String(process.env.NEXT_PUBLIC_API_URL || '').startsWith('/');
export const CLIENT_ACCESS_TOKEN_PLACEHOLDER = 'via-proxy';

export function sessionForClient(session) {
    if (!session) return session;
    const { idToken, ...rest } = session;
    if (API_VIA_PROXY) {
        return { ...rest, accessToken: CLIENT_ACCESS_TOKEN_PLACEHOLDER };
    }
    return rest;
}

export function redirectTo(destination) {
    return { redirect: { destination, permanent: false } };
}

// Guard halaman:
//  - belum login            -> redirect /login
//  - session sudah habis    -> redirect /login?message=session_expired (pesan warning)
//  - role tidak diizinkan   -> redirect '/'
// Mengembalikan objek redirect bila harus diarahkan, selain itu null.
export function requireSession(session, patterns) {
    if (!session) return redirectTo('/login');
    if (isSessionExpired(session)) return redirectTo(`/login?${'message=session_expired'}`);
    if (patterns && patterns.length && !hasRole(session, patterns)) return redirectTo('/');
    return null;
}

export function requireRole(session, patterns) {
    return requireSession(session, patterns);
}

// Membatasi halaman debug/test agar hanya tersedia di environment development.
export function devOnlyGuard() {
    if (process.env.NODE_ENV !== 'development') {
        return { notFound: true };
    }
    return null;
}
