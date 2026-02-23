/**
 * Create an ID generator that returns incrementing string IDs.
 * Each call to the returned function produces "e0", "e1", "e2", etc.
 */
export function createIdGenerator(): () => string {
  let nextId = 0;
  return () => `e${nextId++}`;
}
