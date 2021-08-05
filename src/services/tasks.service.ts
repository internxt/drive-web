import { queue } from 'async';

const tasksService: queue = queue(async (task: () => Promise<void>, callBack) => {
  await task();
  callBack();
}, 1);

export default tasksService;
