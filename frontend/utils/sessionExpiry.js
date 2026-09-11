// utils/sessionExpiry.js
// Bantuan untuk mendeteksi & menangani session yang akan habis / sudah habis.
// Aman digunakan di client (browser) maupun server (getServerSideProps).

export const SESSION_WARNING_MS = 5 * 60 * 1000; // mulai peringatan 5 menit sebelum habis
export const SESSION_EXPIRED_PARAM = 'message=session_expired';

export function getExpiryMs(session) {
  if (!session?.expires) return null;
  const t = new Date(session.expires).getTime();
  return Number.isFinite(t) ? t : null;
}

export function getTimeLeftMs(session, now = Date.now()) {
  const expiry = getExpiryMs(session);
  return expiry === null ? null : expiry - now;
}

export function isSessionExpired(session, now = Date.now()) {
  const left = getTimeLeftMs(session, now);
  return left !== null && left <= 0;
}

// Format m:ss untuk countdown (mis. 04:59)
export function formatCountdown(ms) {
  const safe = ms === null || ms === undefined || Number.isNaN(ms) ? 0 : Math.max(0, ms);
  const totalSeconds = Math.ceil(safe / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
