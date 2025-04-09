function getAvatarExpiration(url: string): Date | null {
  const dateRegex = /X-Amz-Date=(\d{8}T\d{6})Z/;
  const expiresRegex = /X-Amz-Expires=(\d+)/;

  const dateMatch = dateRegex.exec(url);
  const expiresMatch = expiresRegex.exec(url);

  if (!dateMatch || !expiresMatch) return null;

  const issuedAt = dateMatch[1];
  const expiresIn = parseInt(expiresMatch[1], 10);

  const year = Number(issuedAt.slice(0, 4));
  const month = Number(issuedAt.slice(4, 6)) - 1;
  const day = Number(issuedAt.slice(6, 8));
  const hour = Number(issuedAt.slice(9, 11));
  const minute = Number(issuedAt.slice(11, 13));
  const second = Number(issuedAt.slice(13, 15));

  const issuedDate = new Date(Date.UTC(year, month, day, hour, minute, second));
  return new Date(issuedDate.getTime() + expiresIn * 1000);
}

function isAvatarExpired(url: string): boolean {
  const expirationDate = getAvatarExpiration(url);
  if (!expirationDate) return true;

  return new Date() > expirationDate;
}

export { getAvatarExpiration, isAvatarExpired };
