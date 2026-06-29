import type { RuntimeEvent } from "../../../apps/matrix-appservice/src/index.ts";

export class FakeRuntimeEventQueue {
  readonly events: RuntimeEvent[] = [];
  readonly available: boolean;

  constructor(available = true) {
    this.available = available;
  }

  enqueue(event: RuntimeEvent) {
    this.events.push(event);
  }
}
