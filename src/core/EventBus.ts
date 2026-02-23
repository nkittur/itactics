export class EventBus {
  private listeners = new Map<string, Set<(...args: any[]) => void>>();

  /**
   * Subscribe to an event. Returns an unsubscribe function.
   */
  on(event: string, callback: (...args: any[]) => void): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(callback);

    return () => {
      this.off(event, callback);
    };
  }

  /**
   * Emit an event to all registered listeners.
   */
  emit(event: string, ...args: any[]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const callback of set) {
      callback(...args);
    }
  }

  /**
   * Remove a specific listener for an event.
   */
  off(event: string, callback: (...args: any[]) => void): void {
    const set = this.listeners.get(event);
    if (!set) return;
    set.delete(callback);
    if (set.size === 0) {
      this.listeners.delete(event);
    }
  }
}
