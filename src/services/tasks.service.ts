import { queue, QueueObject } from 'async';

const tasksService: QueueObject<any> = queue(async (task: () => Promise<void>, callback) => {
  await task();
  callback();
}, 1);

export default tasksService;