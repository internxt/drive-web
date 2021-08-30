function isProduction(): boolean {
  return process.env.NODE_ENV !== 'production';
}

const envService = {
  isProduction,
};

export default envService;
