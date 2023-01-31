import queryString from 'query-string';
import { UilCheckCircle } from '@iconscout/react-unicons';

import { get } from 'app/i18n/services/i18n.service';
import React, { useEffect, useState } from 'react';
import navigationService from 'app/core/services/navigation.service';

const RedirectToAppView = (): JSX.Element => {
  const qs = queryString.parse(navigationService.history.location.search);
  const [appUrl] = useState(`inxt://${qs.path || ''}`);
  const [anchorRef] = useState(React.createRef<HTMLAnchorElement>());

  useEffect(() => {
    anchorRef.current?.click();
  }, []);

  return (
    <div className="flex h-full flex-col items-center justify-center px-10 pt-10 text-center">
      <div className="mb-4 rounded-1/2 bg-green">
        <UilCheckCircle size={50} className="scale-125 transform text-white" />
      </div>
      <h1 className="mb-6 text-xl font-semibold">{get('views.redirectToApp.message')}</h1>
      <a
        className="w-full max-w-sm rounded-lg bg-blue-60 py-2 px-4 text-white no-underline hover:bg-blue-70 hover:text-white"
        ref={anchorRef}
        href={appUrl}
      >
        {get('views.redirectToApp.goToApp')}
      </a>
    </div>
  );
};

export default RedirectToAppView;
