import { describe, expect, it } from "vite-plus/test";

import { dispatchProjectNotesAction, subscribeProjectNotesAction } from "./projectNotesActionBus";

describe("project notes action bus", () => {
  it("delivers actions until the subscriber unsubscribes", () => {
    const target = new EventTarget();
    const received: string[] = [];
    const unsubscribe = subscribeProjectNotesAction((action) => received.push(action), target);

    dispatchProjectNotesAction("toggle", target);
    unsubscribe();
    dispatchProjectNotesAction("toggle", target);

    expect(received).toEqual(["toggle"]);
  });
});
