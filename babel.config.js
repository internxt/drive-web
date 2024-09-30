module.exports = {
  presets: ['@babel/preset-env', '@babel/preset-react'],
  plugins: [['react-refresh/babel', { skipEnvCheck: true }], '@babel/plugin-proposal-class-properties'],
};
