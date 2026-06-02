import '../styles/globals.css';
import Head from 'next/head';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>
      {/* Декоративный блик верхний левый угол */}
      <div style={{
        position: 'fixed',
        top: '-120px',
        left: '-160px',
        width: '580px',
        height: '340px',
        borderRadius: '50%',
        background: 'radial-gradient(ellipse at 35% 40%, rgba(200,140,45,0.22) 0%, rgba(180,100,35,0.10) 45%, transparent 72%)',
        filter: 'blur(90px)',
        pointerEvents: 'none',
        zIndex: 0,
        mixBlendMode: 'screen',
        transform: 'rotate(-15deg)',
      }} />
      <div style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <Component {...pageProps} />
      </div>
    </>
  );
}
