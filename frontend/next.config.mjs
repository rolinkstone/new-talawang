/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Batas ukuran body yang boleh dilewatkan proxy/middleware (frontend/proxy.js).
    // Default Next.js 16 = 10MB → upload beberapa file sekaligus bisa terpotong
    // dan berakhir 500 ("socket hang up").
    // Backend sendiri membatasi 10MB PER FILE (multer: kwitansi/SPD/LPD),
    // jadi 50MB memberi ruang untuk beberapa file dalam satu FormData.
    // ⚠️ Kalau limit multer dinaikkan, nilai ini juga harus dinaikkan.
    proxyClientMaxBodySize: '50mb',
  },
};

export default nextConfig;
