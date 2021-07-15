import EventEmitter from 'events';

interface entry {
  filePath: string;
  status: string;
  action: string;
  progress?: string;
  message?: string;
}

class FileLogger extends EventEmitter {
  head: number;
  queue?: Array<entry>;
  maxSize: number;

  constructor(maxSize = 50) {
    super();
    this.maxSize = maxSize;
    this.queue = new Array(maxSize);
    this.head = 0;
  }

  push(item) {
    if (!item.filePath) {
      return;
    }
    if (this.queue[this.head] == null) {
      // Create First record in Logger
      this.queue[this.head] = item;
      this.emit('new-entry', this.getHead());
    } else if (item.filePath === this.queue[this.head].filePath) {
      try {
        // Update the last record in Logger
        if (!item.progress && !item.state) {
          this.queue[this.head] = item;
        } else {
          Object.assign(this.queue[this.head], item);
        }
        this.emit('update-last-entry', this.getHead());
      } catch (err) {
        console.error(err);
      }
    } else {
      // Create a new record in Logger
      this.head = (this.head + 1) % this.maxSize;
      this.queue[this.head] = item;
      this.emit('new-entry', this.getHead());
    }
    //console.log(this.queue[this.head]);
  }

  getAll() {
    const queue = this.queue
      .slice()
      .reverse()
      .filter(e => {
        return e != null;
      });
    const head = queue.slice(this.head, this.maxSize);
    const tail = queue.slice(0, this.head);
    const orderedItems = head.concat(tail);

    return orderedItems;
  }
  getQueue() {
    const queue = this.queue
      .slice()
      .reverse()
      .filter(e => {
        return e != null;
      });

    return queue;
  }

  getHead() {
    return this.queue[this.head];
  }

  clearLogger() {
    this.queue.splice(0, this.queue.length);
  }

  removeHead() {
    this.queue[this.head] = null;
    if (this.head > 0) {
      this.head = this.head - 1;
    }
    this.queue = this.getAll();
  }

  removeEntry(index: number) {
    this.queue[index] = null;
    this.queue = this.getAll();
  }
}

export default new FileLogger();