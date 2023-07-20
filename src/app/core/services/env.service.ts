function isProduction(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.REACT_APP_NODE_ENV === 'production';
}

const envService = {
  isProduction,
};

export default envService;
