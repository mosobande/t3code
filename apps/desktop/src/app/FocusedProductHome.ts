// @effect-diagnostics nodeBuiltinImport:off - this gate must run synchronously before Electron is ready.
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";

export const FOCUSED_PRODUCT_HOME_MARKER = ".sigidi-local-desktop.json";
export const FOCUSED_PRODUCT_HOME_MARKER_CONTENTS = `${JSON.stringify({
  product: "sigidi",
  profile: "local-desktop",
  version: 1,
})}\n`;

export type FocusedProductHomeFailureReason =
  | "unmarked-non-empty"
  | "invalid-marker"
  | "filesystem";

export class FocusedProductHomeError extends Error {
  override readonly name = "FocusedProductHomeError";
  readonly baseDir: string;
  readonly reason: FocusedProductHomeFailureReason;

  constructor(baseDir: string, reason: FocusedProductHomeFailureReason, options?: ErrorOptions) {
    const message =
      reason === "unmarked-non-empty"
        ? `SIGIDI cannot use the non-empty unmarked data home at ${baseDir}. Archive the old runtime data before starting the local desktop app.`
        : reason === "invalid-marker"
          ? `SIGIDI cannot use the data home at ${baseDir} because its local-desktop marker is invalid.`
          : `SIGIDI could not validate the local-desktop data home at ${baseDir}.`;
    super(message, options);
    this.baseDir = baseDir;
    this.reason = reason;
  }
}

function validateMarker(baseDir: string, markerPath: string): void {
  let contents: string;
  try {
    contents = NodeFS.readFileSync(markerPath, "utf8");
  } catch (cause) {
    throw new FocusedProductHomeError(baseDir, "filesystem", { cause });
  }
  if (contents !== FOCUSED_PRODUCT_HOME_MARKER_CONTENTS) {
    throw new FocusedProductHomeError(baseDir, "invalid-marker");
  }
}

export function ensureFocusedProductHomeSync(baseDir: string): void {
  try {
    NodeFS.mkdirSync(baseDir, { recursive: true });
    const entries = NodeFS.readdirSync(baseDir);
    const markerPath = NodePath.join(baseDir, FOCUSED_PRODUCT_HOME_MARKER);

    if (entries.includes(FOCUSED_PRODUCT_HOME_MARKER)) {
      validateMarker(baseDir, markerPath);
      return;
    }
    if (entries.length > 0) {
      throw new FocusedProductHomeError(baseDir, "unmarked-non-empty");
    }

    try {
      NodeFS.writeFileSync(markerPath, FOCUSED_PRODUCT_HOME_MARKER_CONTENTS, {
        encoding: "utf8",
        flag: "wx",
      });
    } catch (cause) {
      if ((cause as NodeJS.ErrnoException).code === "EEXIST") {
        validateMarker(baseDir, markerPath);
        return;
      }
      throw cause;
    }
  } catch (cause) {
    if (cause instanceof FocusedProductHomeError) {
      throw cause;
    }
    throw new FocusedProductHomeError(baseDir, "filesystem", { cause });
  }
}
