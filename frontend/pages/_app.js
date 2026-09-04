// pages/_app.js
import '../styles/globals.css';
import '../styles/SalesForm.css';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '../components/ThemeProvider';
import SessionExpiryWatcher from '../components/SessionExpiryWatcher';

function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <SessionProvider session={session} refetchInterval={30} refetchOnWindowFocus>
      <ThemeProvider>
        {/* Watcher global: peringatan countdown + auto-redirect saat session habis */}
        <SessionExpiryWatcher />
        <Component {...pageProps} />
      </ThemeProvider>
    </SessionProvider>
  );
}

export default MyApp;