export function isTokenExpired(token): boolean {
  try {
    const arrayToken = token.split('.');
    const tokenPayload = JSON.parse(atob(arrayToken[1]));
    if (!tokenPayload.exp) {
      return true;
    }
    return Math.floor(new Date().getTime() / 1000) >= tokenPayload.exp;
  } catch (error) {
    return true;
  }
}
