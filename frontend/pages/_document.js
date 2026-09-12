// pages/_document.js
import { Html, Head, Main, NextScript } from 'next/document';

/**
 * Custom Document: hanya dirender sekali di server.
 * Dipakai untuk menambahkan <html lang> dan tag favicon global
 * (berlaku di semua halaman, termasuk halaman login).
 */
export default function Document() {
  return (
    <Html lang="id">
      <Head>
        {/* v=2 -> paksa browser buang cache favicon lama */}
        <link rel="icon" href="/favicon.ico?v=2" />
        <link rel="shortcut icon" href="/favicon.ico?v=2" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=2" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png?v=2" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=2" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
