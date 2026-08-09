import { Connection, type ConnectionTarget } from "@t3tools/client-runtime/connection";
import { shellSnapshotLoaderLayer } from "@t3tools/client-runtime/state/shell";
import { threadSnapshotLoaderLayer } from "@t3tools/client-runtime/state/threads";
import { productProfile } from "@t3tools/shared/productProfile";
import * as Layer from "effect/Layer";
import { Atom } from "effect/unstable/reactivity";

import { runtimeContextLayer } from "../lib/runtime";
import {
  backgroundActivityObserverLayer,
  backgroundActivityReporterLayer,
} from "../lib/backgroundActivityReporter";
import { connectionPlatformLayer } from "./platform";

const snapshotLoaderLayer = Layer.merge(threadSnapshotLoaderLayer, shellSnapshotLoaderLayer);

const providedConnectionPlatformLayer = connectionPlatformLayer.pipe(
  Layer.provide(runtimeContextLayer),
);

const allowsTarget = (target: ConnectionTarget) =>
  productProfile.capabilities.inheritedRemoteIntegrations ||
  target._tag === "PrimaryConnectionTarget";

const connectionRuntimeLayer: typeof Connection.layer = Connection.makeLayer({
  allowsTarget,
  remoteEnabled: productProfile.capabilities.remoteEnvironments,
});

const providedClientConnectionLayer = Layer.merge(connectionRuntimeLayer, snapshotLoaderLayer).pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      runtimeContextLayer,
      providedConnectionPlatformLayer,
      backgroundActivityObserverLayer,
    ),
  ),
);

const connectionLayer = backgroundActivityReporterLayer.pipe(
  Layer.provideMerge(providedClientConnectionLayer),
);

type ConnectionLayerSource =
  | typeof connectionRuntimeLayer
  | typeof snapshotLoaderLayer
  | typeof runtimeContextLayer
  | typeof connectionPlatformLayer
  | typeof backgroundActivityObserverLayer
  | typeof backgroundActivityReporterLayer;

export const connectionAtomRuntime: Atom.AtomRuntime<
  Layer.Success<ConnectionLayerSource>,
  Layer.Error<ConnectionLayerSource>
> = Atom.runtime(connectionLayer);
