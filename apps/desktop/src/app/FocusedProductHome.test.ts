// @effect-diagnostics nodeBuiltinImport:off - this pre-ready boundary is synchronous by design.
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import { afterEach, assert, describe, it } from "@effect/vitest";

import {
  FOCUSED_PRODUCT_HOME_MARKER,
  FOCUSED_PRODUCT_HOME_MARKER_CONTENTS,
  FocusedProductHomeError,
  ensureFocusedProductHomeSync,
} from "./FocusedProductHome.ts";

const temporaryDirectories: string[] = [];

function makeTempDirectory(): string {
  const directory = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "sigidi-product-home-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    NodeFS.rmSync(directory, { recursive: true, force: true });
  }
});

describe("FocusedProductHome", () => {
  it("initializes a missing product home with only the versioned marker", () => {
    const parent = makeTempDirectory();
    const baseDir = NodePath.join(parent, "missing");

    ensureFocusedProductHomeSync(baseDir);

    assert.deepEqual(NodeFS.readdirSync(baseDir), [FOCUSED_PRODUCT_HOME_MARKER]);
    assert.equal(
      NodeFS.readFileSync(NodePath.join(baseDir, FOCUSED_PRODUCT_HOME_MARKER), "utf8"),
      FOCUSED_PRODUCT_HOME_MARKER_CONTENTS,
    );
  });

  it("initializes an existing empty product home", () => {
    const baseDir = makeTempDirectory();

    ensureFocusedProductHomeSync(baseDir);

    assert.deepEqual(NodeFS.readdirSync(baseDir), [FOCUSED_PRODUCT_HOME_MARKER]);
  });

  it("accepts a marked product home without changing its entries", () => {
    const baseDir = makeTempDirectory();
    ensureFocusedProductHomeSync(baseDir);
    NodeFS.writeFileSync(NodePath.join(baseDir, "retained.txt"), "retained");
    const before = NodeFS.readdirSync(baseDir).sort();

    ensureFocusedProductHomeSync(baseDir);

    assert.deepEqual(NodeFS.readdirSync(baseDir).sort(), before);
  });

  it("rejects a non-empty unmarked home without changing it", () => {
    const baseDir = makeTempDirectory();
    const legacyPath = NodePath.join(baseDir, "legacy.sqlite");
    NodeFS.writeFileSync(legacyPath, "legacy");
    const before = NodeFS.readdirSync(baseDir);

    let failure: unknown;
    try {
      ensureFocusedProductHomeSync(baseDir);
    } catch (error) {
      failure = error;
    }
    assert.instanceOf(failure, FocusedProductHomeError);
    assert.equal((failure as FocusedProductHomeError).reason, "unmarked-non-empty");

    assert.deepEqual(NodeFS.readdirSync(baseDir), before);
    assert.equal(NodeFS.readFileSync(legacyPath, "utf8"), "legacy");
  });

  it("rejects an invalid marker without changing it", () => {
    const baseDir = makeTempDirectory();
    const markerPath = NodePath.join(baseDir, FOCUSED_PRODUCT_HOME_MARKER);
    NodeFS.writeFileSync(markerPath, "wrong-product\n");

    let failure: unknown;
    try {
      ensureFocusedProductHomeSync(baseDir);
    } catch (error) {
      failure = error;
    }
    assert.instanceOf(failure, FocusedProductHomeError);
    assert.equal((failure as FocusedProductHomeError).reason, "invalid-marker");
    assert.equal(NodeFS.readFileSync(markerPath, "utf8"), "wrong-product\n");
  });
});
