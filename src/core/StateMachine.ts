export interface State {
  readonly name: string;
  onEnter?(): void;
  onUpdate?(dt: number): void;
  onExit?(): void;
}

export class StateMachine {
  private states = new Map<string, State>();
  private stack: State[] = []; // supports push/pop for overlay states
  private current: State | null = null;

  register(state: State): void {
    this.states.set(state.name, state);
  }

  /** Transition to a new state, replacing the current one. */
  transition(name: string): void {
    const next = this.states.get(name);
    if (!next) throw new Error(`Unknown state: ${name}`);

    this.current?.onExit?.();
    this.current = next;
    this.current.onEnter?.();
  }

  /** Push a state on top (for overlays like inventory). */
  push(name: string): void {
    const next = this.states.get(name);
    if (!next) throw new Error(`Unknown state: ${name}`);

    if (this.current) this.stack.push(this.current);
    this.current?.onExit?.();
    this.current = next;
    this.current.onEnter?.();
  }

  /** Pop back to the previous state. */
  pop(): void {
    this.current?.onExit?.();
    this.current = this.stack.pop() ?? null;
    this.current?.onEnter?.();
  }

  update(dt: number): void {
    this.current?.onUpdate?.(dt);
  }

  get currentState(): string | null {
    return this.current?.name ?? null;
  }
}
