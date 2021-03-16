import { useEffect, useState } from 'react';
import { getHeaders } from '../../lib/auth';
import { decryptPGP } from '../../lib/utilspgp';
import { storeTeamsInfo } from '../../services/teams.service';
import history from '../../lib/history';
import LoadingFileExplorer from '../xcloud/LoadingFileExplorer';

export default function Success(props) {
  const [sessionId, setSessionIdStripe] = useState<string>();

  const getTeamInfo = async () => {
    return fetch('/api/teams/team/info', {
      method: 'get',
      headers: getHeaders(true, false, false)
    }).then(res => res.json());
  };

  const checkoutSessionStripe = async () => {
    const { userTeam } = await getTeamInfo();

    const mnemonic = await decryptPGP(Buffer.from(userTeam.bridge_mnemonic, 'base64').toString());

    if (sessionId) {
      await fetch('/api/teams/checkout/session', {
        method: 'post',
        headers: getHeaders(true, false),
        body: JSON.stringify({
          checkoutSessionId: sessionId,
          test: process.env.NODE_ENV !== 'production',
          mnemonic: mnemonic.data
        })
      }).then((response) => {
        if (response.status !== 200) {
          throw Error(response.statusText);
        }
        return response.json();
      }).then(async (res) => {
        if (res) {
          await storeTeamsInfo();
          history.push('/');
        }
      });
    }
  };

  useEffect(() => {
    setSessionIdStripe(props.match.params.sessionId);
    checkoutSessionStripe();
  }, [sessionId]);

  return (
    <div style={{ display: 'flex', marginTop: '12rem', justifyContent: 'center', alignContent: 'center' }}>
      <LoadingFileExplorer />
    </div>
  );
}