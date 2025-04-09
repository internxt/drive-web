function getAvatarExpiration(url: string): Date | null {
  const dateRegex = /X-Amz-Date=(\d{8}T\d{6})Z/;
  const expiresRegex = /X-Amz-Expires=(\d+)/;

  const dateMatch = dateRegex.exec(url);
  const expiresMatch = expiresRegex.exec(url);

  if (!dateMatch || !expiresMatch) return null;

  const isoString = dateMatch[1].replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/, '$1-$2-$3T$4:$5:$6Z');
  const issuedDate = new Date(isoString);
  const expiresIn = Number(expiresMatch[1]);

  if (isNaN(issuedDate.getTime())) return null;

  return new Date(issuedDate.getTime() + expiresIn * 1000);
}

function isAvatarExpired(url: string): boolean {
  const expirationDate = getAvatarExpiration(url);
  if (!expirationDate) return true;

  return new Date() > expirationDate;
}

export { getAvatarExpiration, isAvatarExpired };
