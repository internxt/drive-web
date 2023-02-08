const fs = require('fs');

const convertDotenvFileToCypressEnvFormat = () => {
  const transformedEnvFile = fs
    .readFileSync('./.env')
    .toString('utf-8')
    .split('\n')
    .map((keyValue) => keyValue.split(/=(.*)/s))
    .filter((value) => !String(value).trim().startsWith('#'))
    .reduce(
      (cypressEnv, [key, value]) => ({
        ...cypressEnv,
        [key]: value,
      }),
      {},
    );
  fs.writeFileSync('./test/e2e/cypress.env.json', JSON.stringify(transformedEnvFile));
};
convertDotenvFileToCypressEnvFormat();
