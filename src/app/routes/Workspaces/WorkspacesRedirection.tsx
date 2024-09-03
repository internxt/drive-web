import { useEffect } from 'react';
import { useHistory, useParams } from 'react-router-dom';

const WorkspacesRedirect = () => {
  const params = useParams<{ invitationId: string; action?: string; email?: string }>();
  const history = useHistory();

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    const invitationId = params?.invitationId;
    const action = params?.action;

    let redirectURL;

    if (action) {
      redirectURL = `/login?invitationId=${invitationId}&action=${action}&token=${token}`;
    }
    history.push(redirectURL);
  }, [params, history]);

  return null;
};

export default WorkspacesRedirect;
