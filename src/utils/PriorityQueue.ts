/**
 * Min-heap priority queue.
 * Items with the lowest priority (as determined by the comparator) are
 * dequeued first. The comparator should return a negative number if `a`
 * has higher priority (should come out first) than `b`.
 */
export class PriorityQueue<T> {
  private heap: T[] = [];
  private comparator: (a: T, b: T) => number;

  constructor(comparator: (a: T, b: T) => number) {
    this.comparator = comparator;
  }

  get size(): number {
    return this.heap.length;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  /** Look at the highest-priority item without removing it. */
  peek(): T | undefined {
    return this.heap[0];
  }

  /** Add an item to the queue. */
  push(item: T): void {
    this.heap.push(item);
    this.bubbleUp(this.heap.length - 1);
  }

  /** Remove and return the highest-priority (smallest) item. */
  pop(): T | undefined {
    if (this.heap.length === 0) return undefined;

    const top = this.heap[0];
    const last = this.heap.pop()!;

    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.sinkDown(0);
    }

    return top;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = (index - 1) >> 1;
      if (this.comparator(this.heap[index]!, this.heap[parentIndex]!) >= 0) break;
      this.swap(index, parentIndex);
      index = parentIndex;
    }
  }

  private sinkDown(index: number): void {
    const length = this.heap.length;
    while (true) {
      const left = 2 * index + 1;
      const right = 2 * index + 2;
      let smallest = index;

      if (left < length && this.comparator(this.heap[left]!, this.heap[smallest]!) < 0) {
        smallest = left;
      }
      if (right < length && this.comparator(this.heap[right]!, this.heap[smallest]!) < 0) {
        smallest = right;
      }

      if (smallest === index) break;
      this.swap(index, smallest);
      index = smallest;
    }
  }

  private swap(i: number, j: number): void {
    const temp = this.heap[i]!;
    this.heap[i] = this.heap[j]!;
    this.heap[j] = temp;
  }
}
