import { useEffect } from 'react';
import { useHistory, useParams } from 'react-router-dom';

const SharingRedirect = () => {
  const params = useParams<{ sharingId: string; action: string }>();
  const history = useHistory();

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    const sharingId = params?.sharingId;
    const action = params?.action;
    const redirectURL = `/login?sharingId=${sharingId}&action=${action}&token=${token}`;

    history.push(redirectURL);
  }, [params, history]);

  return null;
};

export default SharingRedirect;
