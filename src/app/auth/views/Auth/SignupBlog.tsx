import { SignupComponent } from './AuthView';
import InternxtDevices from '../../../../assets/images/banner/internxt_secure_cloud_storage.webp';
import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';

const textContent = {
  en: {
    title: {
      line1: 'Make privacy a priority and join',
      blueText: ' Internxt ',
      line2: 'today',
    },
    email: 'Email',
    passwordLabel: 'Password',
    emailEmpty: 'Email cannot be empty',
    passwordLabelEmpty: 'Password cannot be empty',
    buttonText: 'Get up to 1GB - For free!',
    legal: {
      line1: 'By creating an account you accept the',
      line2: 'terms of service, and privacy policy',
    },
  },
  es: {
    title: {
      line1: 'Prioriza tu privacidad y únete a',
      blueText: ' Internxt ',
      line2: 'hoy',
    },
    email: 'Correo electrónico',
    passwordLabel: 'Contraseña',
    emailEmpty: 'El correo electrónico no puede estar vacío',
    passwordLabelEmpty: 'La contraseña no puede estar vacía',
    buttonText: 'Consigue 1GB - ¡Gratis!',
    legal: {
      line1: 'Al crear una cuenta aceptas los',
      line2: 'términos de servicio y la política de privacidad',
    },
  },
};

const SignupAuth = ({ lang }) => {
  return (
    <div className="flex h-52 w-full flex-col space-y-2 lg:items-start lg:pt-0">
      <SignupComponent
        buttonColor="bg-primary focus-visible:bg-primary-dark active:bg-primary-dark"
        textContent={textContent[lang]}
        appRedirect={true}
      />
    </div>
  );
};

const includedLanguages = ['en', 'es'];

export default function SignupBlog(): JSX.Element {
  const [lang, setLang] = useState('en');

  useEffect(() => {
    const query = window.location.search;
    const params = new URLSearchParams(query);
    const language = params.get('lang') as string;
    if (includedLanguages.includes(language)) {
      setLang(language);
    }
  }, []);

  return (
    <>
      <Helmet>
        <link rel="canonical" href={`${process.env.REACT_APP_HOSTNAME}/signup-blog`} />
        <script src={`https://www.googletagmanager.com/gtag/js?id=${process.env.REACT_APP_GA_BLOG_ID}`}></script>
      </Helmet>

      <div className="flex flex-col items-center justify-center overflow-hidden bg-white">
        <div className="flex w-full flex-row overflow-hidden bg-gradient-to-br from-primary/20 to-white">
          <div className="mb-10 mt-5 flex w-full flex-col items-center justify-center px-5 text-center text-gray-100 dark:text-gray-1 sm:ml-11 sm:w-full sm:max-w-xs sm:items-start sm:px-0 sm:text-left">
            <p className="text-3xl font-semibold">
              {textContent[lang].title.line1}
              <span className="text-primary">{textContent[lang].title.blueText}</span>
              {textContent[lang].title.line2}
            </p>
            <div className="flex w-72">
              <SignupAuth lang={lang} />
            </div>
          </div>
          <div className="-ml-32 flex items-center overflow-hidden">
            <div className="relative left-56 hidden flex-col overflow-hidden sm:flex">
              <img
                src={InternxtDevices}
                width={534}
                height={340}
                loading="eager"
                alt="desktop, laptop and phone with Internxt app"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
