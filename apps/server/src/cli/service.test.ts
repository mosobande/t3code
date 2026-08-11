import { assert, it } from "@effect/vitest";
import { productProfile, resolveCliPackageName } from "@t3tools/shared/productProfile";

import { formatServiceStatus } from "./service.ts";

const status = {
  supported: true,
  installed: true,
  current: true,
  unitPath: "/home/me/.config/systemd/user/t3code.service",
  logPath: "/home/me/.t3/userdata/logs/boot-service.log",
} as const;

it("reports the installed service version and host paths", () => {
  assert.equal(
    formatServiceStatus(status, "0.0.29"),
    [
      `${productProfile.productName} service`,
      "  Status: installed · version 0.0.29",
      "  Unit: /home/me/.config/systemd/user/t3code.service",
      "  Logs: /home/me/.t3/userdata/logs/boot-service.log",
    ].join("\n"),
  );
});

it("gives a direct repair command for a stale service", () => {
  assert.include(
    formatServiceStatus({ ...status, current: false }, "0.0.29"),
    `Next: Run \`npx ${resolveCliPackageName(productProfile)}@latest service update\`.`,
  );
});

it("gives a profile-owned install command", () => {
  assert.include(
    formatServiceStatus({ ...status, installed: false }, "0.0.29"),
    `Next: Run \`npx ${resolveCliPackageName(productProfile)}@latest service install\`.`,
  );
});

it("explains service availability without systemd", () => {
  assert.include(
    formatServiceStatus({ ...status, supported: false, installed: false }, "0.0.29"),
    "Supported on: Linux with systemd",
  );
});
