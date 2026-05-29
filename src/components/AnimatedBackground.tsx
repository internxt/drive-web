export default function AnimatedBackground(): JSX.Element {
  return (
    <>
      <style>{`
        @keyframes orbTL {
          0%, 100% { transform: translate(0, 0) rotate(-164.506deg); }
          33%       { transform: translate(100vw, 0) rotate(-164.506deg); }
          66%       { transform: translate(100vw, 100vh) rotate(-164.506deg); }
        }
        @keyframes orbTR {
          0%, 100% { transform: translate(0, 0); }
          33%       { transform: translate(0, 100vh); }
          66%       { transform: translate(-100vw, 100vh); }
        }
        @keyframes orbBL {
          0%, 100% { transform: translate(0, 0) rotate(-133.484deg); }
          33%       { transform: translate(0, -100vh) rotate(-133.484deg); }
          66%       { transform: translate(100vw, -100vh) rotate(-133.484deg); }
        }
        @keyframes orbBR {
          0%, 100% { transform: translate(0, 0); }
          33%       { transform: translate(-100vw, 0); }
          66%       { transform: translate(-100vw, -100vh); }
        }
      `}</style>

      {/* Light mode orbs */}
      <div
        className="pointer-events-none absolute dark:hidden"
        style={{
          width: '841.186px',
          height: '863.451px',
          top: '-300px',
          left: '-300px',
          background: 'rgba(0, 102, 255, 0.40)',
          filter: 'blur(175px)',
          borderRadius: '50%',
          animation: 'orbTL 30s ease-in-out infinite',
        }}
      />
      <div
        className="pointer-events-none absolute dark:hidden"
        style={{
          width: '932.945px',
          height: '932.945px',
          top: '-350px',
          right: '-350px',
          background: 'rgba(214, 232, 255, 0.60)',
          filter: 'blur(250px)',
          borderRadius: '50%',
          animation: 'orbTR 30s ease-in-out infinite 7s',
        }}
      />
      <div
        className="pointer-events-none absolute dark:hidden"
        style={{
          width: '653.061px',
          height: '653.061px',
          bottom: '-250px',
          left: '-200px',
          background: 'rgba(175, 168, 255, 0.30)',
          filter: 'blur(225px)',
          borderRadius: '50%',
          animation: 'orbBL 30s ease-in-out infinite 14s',
        }}
      />
      <div
        className="pointer-events-none absolute dark:hidden"
        style={{
          width: '1280px',
          height: '800px',
          bottom: '-400px',
          right: '-400px',
          background: 'rgba(128, 191, 255, 0.40)',
          filter: 'blur(225px)',
          borderRadius: '50%',
          animation: 'orbBR 30s ease-in-out infinite 3s',
        }}
      />

      {/* Dark mode orbs */}
      <div
        className="pointer-events-none absolute hidden dark:block"
        style={{
          width: '841.186px',
          height: '863.451px',
          top: '-300px',
          left: '-300px',
          background: 'rgba(0, 102, 255, 0.60)',
          filter: 'blur(250px)',
          borderRadius: '50%',
          animation: 'orbTL 30s ease-in-out infinite',
        }}
      />
      <div
        className="pointer-events-none absolute hidden dark:block"
        style={{
          width: '932.945px',
          height: '932.945px',
          aspectRatio: '1/1',
          top: '-350px',
          right: '-350px',
          background: 'rgba(77, 163, 255, 0.65)',
          mixBlendMode: 'soft-light',
          filter: 'blur(175px)',
          borderRadius: '50%',
          animation: 'orbTR 30s ease-in-out infinite 7s',
        }}
      />
      <div
        className="pointer-events-none absolute hidden dark:block"
        style={{
          width: '765.146px',
          height: '749.943px',
          bottom: '-300px',
          right: '-300px',
          background: '#003D99',
          mixBlendMode: 'overlay',
          filter: 'blur(200px)',
          borderRadius: '50%',
          animation: 'orbBR 30s ease-in-out infinite 3s',
        }}
      />
      <div
        className="pointer-events-none absolute hidden dark:block"
        style={{
          width: '653.061px',
          height: '653.061px',
          aspectRatio: '1/1',
          bottom: '-250px',
          left: '-200px',
          background: 'rgba(107, 92, 255, 0.95)',
          mixBlendMode: 'overlay',
          filter: 'blur(125px)',
          borderRadius: '50%',
          animation: 'orbBL 30s ease-in-out infinite 14s',
        }}
      />
    </>
  );
}
