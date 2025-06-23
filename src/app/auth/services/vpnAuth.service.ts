import envService from 'app/core/services/env.service';

export const postMessageToVpn = (payload: Record<string, any>, source = 'drive-web') => {
  const targetUrl = envService.getVaribale('hostname');
  window.postMessage({ source: source, payload }, targetUrl);
};

export const logIn = (userToken: string) => {
  postMessageToVpn({ message: 'user-token', token: userToken });
};

export const logOut = () => {
  postMessageToVpn({ message: 'user-logged-out' });
};

const vpnAuthService = {
  logIn,
  logOut,
};

export default vpnAuthService;
