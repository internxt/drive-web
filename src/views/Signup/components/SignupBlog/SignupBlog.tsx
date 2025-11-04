import { SignupComponent } from './AuthView';
import InternxtDevices from '../../../../assets/images/banner/internxt_secure_cloud_storage.webp';
import { Helmet } from 'react-helmet-async';
import envService from 'app/core/services/env.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

const SignupAuth = () => {
  return (
    <div className="flex h-52 w-full flex-col space-y-2 lg:items-start lg:pt-0">
      <SignupComponent
        buttonColor="bg-primary focus-visible:bg-primary-dark active:bg-primary-dark"
        appRedirect={true}
        variant="blog"
      />
    </div>
  );
};

export default function SignupBlog(): JSX.Element {
  const { translate } = useTranslationContext();

  return (
    <>
      <Helmet>
        <link rel="canonical" href={`${envService.getVariable('hostname')}/signup-blog`} />
        <script src={`https://www.googletagmanager.com/gtag/js?id=${envService.getVariable('gaBlogId')}`}></script>
      </Helmet>

      <div className="flex flex-col items-center justify-center overflow-hidden bg-white">
        <div className="flex w-full flex-row overflow-hidden bg-gradient-to-br from-primary/20 to-white">
          <div className="mb-10 mt-5 flex w-full flex-col items-center justify-center px-5 text-center text-gray-100 dark:text-gray-1 sm:ml-11 sm:w-full sm:max-w-xs sm:items-start sm:px-0 sm:text-left">
            <p className="text-3xl font-semibold">
              {translate('auth.signup.blog.title.line1')}
              <span className="text-primary">{translate('auth.signup.blog.title.blueText')}</span>
              {translate('auth.signup.blog.title.line2')}
            </p>
            <div className="flex w-72">
              <SignupAuth />
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
