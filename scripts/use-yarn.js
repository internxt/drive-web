let execPath = process.env.npm_execpath

if (execPath.indexOf('yarn') === -1) {
  console.error('Do not use NPM to install packages. Use yarn.');
  console.error('To install/update yarn: npm i -g yarn');
  process.exit(1);
}