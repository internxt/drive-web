import queryString from 'query-string';
import { UilCheckCircle } from '@iconscout/react-unicons';
import ROUTES from '../../../routes/paths.json';

import React, { useEffect, useState } from 'react';
import navigationService from 'app/core/services/navigation.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

const RedirectToAppView = (): JSX.Element => {
  const allowedPaths = ROUTES.views.map((view) => view.path);
  const { translate } = useTranslationContext();
  const qs = queryString.parse(navigationService.history.location.search);
  const path = Array.isArray(qs.path) ? qs.path[0] : qs.path || '';
  const isValidRedirect = allowedPaths.includes(path);
  const securePath = isValidRedirect ? path : '/not-found';
  const [appUrl] = useState(`inxt://${securePath}`);
  const [anchorRef] = useState(React.createRef<HTMLAnchorElement>());

  useEffect(() => {
    anchorRef.current?.click();
  }, []);

  return (
    <div className="flex h-full flex-col items-center justify-center px-10 pt-10 text-center">
      <div className="mb-4 rounded-1/2 bg-green">
        <UilCheckCircle size={50} className="scale-125 text-white" />
      </div>
      <h1 className="mb-6 text-xl font-semibold">{translate('views.redirectToApp.message')}</h1>
      <a
        className="w-full max-w-sm rounded-lg bg-primary px-4 py-2 text-white no-underline hover:bg-primary-dark hover:text-white"
        ref={anchorRef}
        href={appUrl}
      >
        {translate('views.redirectToApp.goToApp')}
      </a>
    </div>
  );
};

export default RedirectToAppView;
