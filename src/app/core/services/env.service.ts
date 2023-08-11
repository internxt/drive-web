function isProduction(): boolean {
  if (process.env.REACT_APP_NODE_ENV === 'staging') return false;
  return process.env.NODE_ENV === 'production' || process.env.REACT_APP_NODE_ENV === 'production';
}

const envService = {
  isProduction,
};

export default envService;
