import { getHeaders } from '../lib/auth';

export const generateShareLink = async (fileId: string, views: number, isFolder: boolean, isTeams = false): Promise<string> => {
  const isTeam: boolean = isTeams;

  const response = await fetch(`/api/storage/share/file/${fileId}`, {
    method: 'POST',
    headers: getHeaders(true, true, isTeam),
    body: JSON.stringify({
      'isFolder': isFolder ? 'true' : 'false',
      'views': views
    })
  });

  if (response.status !== 200) {
    throw response;
  }
  const data = await response.json();
  const link = `${window.location.origin}/${data.token}`;

  console.log('newlink', link);
  return link;
};