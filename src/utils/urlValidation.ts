export const TRUSTED_WEB_PROTOCOLS = ['https:'];
export const TRUSTED_WEB_HOSTNAMES = ['internxt.com', 'drive.internxt.com'];

export const TRUSTED_LOCALHOST_PROTOCOLS = ['http:'];
export const TRUSTED_LOCALHOST_HOSTNAMES = ['127.0.0.1'];

type ValidateUrlParams = {
  urlString: string;
  allowedProtocols: string[];
  allowedHostnames: string[];
};

export const validateUrl = ({ urlString, allowedProtocols, allowedHostnames }: ValidateUrlParams): boolean => {
  try {
    const url = new URL(urlString);
    return allowedProtocols.includes(url.protocol) && allowedHostnames.includes(url.hostname);
  } catch {
    return false;
  }
};
