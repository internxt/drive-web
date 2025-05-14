const LOCATION_API = process.env.REACT_APP_LOCATION_API_URL;

export const getUserLocation = async (): Promise<{ ip: string; location: string }> => {
  const response = await fetch(`${LOCATION_API}`, {
    method: 'GET',
  });

  if (response.status !== 200) {
    const message = await response.text();
    throw new Error(message);
  }
  return response.json();
};
