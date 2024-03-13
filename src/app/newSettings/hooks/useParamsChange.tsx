import { useState, useEffect } from 'react';

import { useAppDispatch } from 'app/store/hooks';
import { uiActions } from 'app/store/slices/ui';

export const useParamsChange = () => {
  const dispatch = useAppDispatch();
  const params = new URLSearchParams(window.location.search);
  const isOpenParms = params.get('preferences') === 'open';

  const [haveParamsChanged, setHaveParamsChanged] = useState(false);

  useEffect(() => {
    window.onpopstate = () => {
      setHaveParamsChanged(true);
    };
  });

  useEffect(() => {
    if (isOpenParms) {
      dispatch(uiActions.setIsPreferencesDialogOpen(true));
      setHaveParamsChanged(false);
    } else {
      dispatch(uiActions.setIsPreferencesDialogOpen(false));
      setHaveParamsChanged(false);
    }
  }, [haveParamsChanged]);

  return haveParamsChanged;
};
