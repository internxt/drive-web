import { getHeaders } from "../lib/auth";

export function isUserActivated (): Promise<any> {
  return fetch('/api/user/isactivated', {
    method: 'get',
    headers: getHeaders(true, false)
  }).then((response) => response.json())
    .catch(() => {
      console.log('Error getting user activation');
    });
};

const userService = {
  isUserActivated
};

export default userService;