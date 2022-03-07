import queryString from 'query-string';
import { UilCheckCircle } from '@iconscout/react-unicons';

import i18n from 'app/i18n/services/i18n.service';
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
    <div className="px-10 pt-10 text-center flex flex-col justify-center items-center h-full">
      <div className="mb-4 bg-green-40 rounded-1/2">
        <UilCheckCircle size={50} className="text-white transform scale-125" />
      </div>
      <h1 className="mb-6 text-xl font-semibold">{i18n.get('views.redirectToApp.message')}</h1>
      <a
        className="bg-blue-60 no-underline py-2 px-4 rounded-lg w-full max-w-sm hover:bg-blue-70 text-white hover:text-white"
        ref={anchorRef}
        href={appUrl}
      >
        {i18n.get('views.redirectToApp.goToApp')}
      </a>
    </div>
  );
};

export default RedirectToAppView;
