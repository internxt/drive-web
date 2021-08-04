import { getHeaders } from '../lib/auth';

function generateShortLink(url: string): Promise<string> {
  const isTeam: boolean = !!this.props.user.teams;

  return new Promise((resolve, reject) => {
    fetch('/api/storage/shortLink', {
      method: 'POST',
      headers: getHeaders(true, true, isTeam),
      body: JSON.stringify({ 'url': url })
    }).then(res => res.json()).then(res => {
      resolve(res.shortUrl);
    }).catch(reject);
  });
}

const generateShareLink = async (fileId: string, views: number, isFolder: boolean, isTeams = false): Promise<string> => {
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

  return link;
};

const shareService = {
  generateShortLink,
  generateShareLink
};

export default shareService;