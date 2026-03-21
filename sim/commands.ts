export type SimCommand = {
  type: "sim/tick";
  deltaMs: number;
};

export interface SimCommandQueue {
  enqueue(command: SimCommand): void;
  drain(): SimCommand[];
}

export function createSimCommandQueue(): SimCommandQueue {
  const queue: SimCommand[] = [];

  return {
    enqueue(command) {
      queue.push(command);
    },

    drain() {
      return queue.splice(0, queue.length);
    },
  };
}
