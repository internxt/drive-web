export function setCookie(cookieName: string, cookieValue: string, expDays = 30): void {
  const date = new Date();
  date.setTime(date.getTime() + expDays * 24 * 60 * 60 * 1000);
  const expires = `expires=${date.toUTCString()}`;
  window.document.cookie = `${cookieName}=${cookieValue}; ${expires}; domain=internxt.com'`;
}

export function getCookie(cookieName: string): string {
  const cookie = {};
  document.cookie.split(';').forEach((el) => {
    const [key, value] = el.split('=');
    cookie[key.trim()] = value;
  });
  return cookie[cookieName];
}
