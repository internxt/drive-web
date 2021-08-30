import { queue, QueueObject } from 'async';

const tasksService: QueueObject<any> = queue(async (task: () => Promise<void>) => {
  await task();
}, 1);

export default tasksService;
