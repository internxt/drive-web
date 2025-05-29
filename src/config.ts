function getEnvVar(name: string, required = true): string {
  const value = process.env[name];
  if (!value && required) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value!;
}

export const envConfig = {
  api: {
    location: getEnvVar('REACT_APP_LOCATION_API_URL'),
  },
};
