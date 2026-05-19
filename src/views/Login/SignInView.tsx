import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import InternxtLogo from 'assets/icons/big-logo.svg?react';
import { isMobile } from 'react-device-detect';
import { LogIn } from './components';

interface SignInProps {
  displayIframe: boolean;
}

export default function SignInView(props: Readonly<SignInProps>): JSX.Element {
  const { translate } = useTranslationContext();

  return (
    <div
      className={`relative flex h-full w-full flex-col dark:bg-[#0A0F1C] ${props.displayIframe ? '' : 'overflow-hidden'}`}
    >
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

      {!props.displayIframe && (
        <div className="relative z-10 flex shrink-0 flex-row justify-center py-10 sm:justify-center">
          <InternxtLogo className="h-auto w-28 text-gray-100" />
        </div>
      )}

      <div className={`relative z-10 flex h-full flex-col ${!props.displayIframe && 'items-center justify-center'}`}>
        <LogIn />
      </div>

      {!props.displayIframe && (
        <div className="relative z-10 flex shrink-0 flex-col items-center justify-center space-x-0 text-gray-80 dark:text-gray-10 space-y-2 py-8 sm:flex-row sm:space-x-8 sm:space-y-0">
          {!isMobile && (
            <a href="https://internxt.com/legal" target="_blank" className="auth-footer-link">
              {translate('general.terms')}
            </a>
          )}
          <a href="https://help.internxt.com" target="_blank" className="auth-footer-link">
            {translate('general.help')}
          </a>
        </div>
      )}
    </div>
  );
}
