import { NodeEnv } from '../models/enums';

function isProduction(): boolean {
  return process.env.NODE_ENV === NodeEnv.Production;
}

const envService = {
  isProduction
};

export default envService;