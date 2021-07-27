import { queue } from 'async';

const queueFileLogger = queue(async (task: () => Promise<void>, callBack) => {
  await task();
  callBack();
}, 1);

export default queueFileLogger;
