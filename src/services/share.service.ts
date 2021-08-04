import { getHeaders } from '../lib/auth';

interface GenerateShareLinkResponse {
  token: string
}

export function generateShareLink(fileId: string, views: number, isFolder: boolean, encryptionKey: string, isTeam = false): Promise<string> {
  return fetch(`/api/storage/share/file/${fileId}`, {
    method: 'POST',
    headers: getHeaders(true, true, isTeam),
    body: JSON.stringify({ isFolder, views, encryptionKey })
  }).then((res) => {
    return res.json();
  }).then((res: GenerateShareLinkResponse) => {
    return `${window.location.origin}/${res.token}`;
  });
}
