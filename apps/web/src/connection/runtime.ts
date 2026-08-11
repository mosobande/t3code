import { Connection, type ConnectionTarget } from "@t3tools/client-runtime/connection";
import { shellSnapshotLoaderLayer } from "@t3tools/client-runtime/state/shell";
import { threadSnapshotLoaderLayer } from "@t3tools/client-runtime/state/threads";
import { productProfile } from "@t3tools/shared/productProfile";
import { pullRequestDiffLoaderLayer } from "@t3tools/client-runtime/state/pull-requests";
import * as Layer from "effect/Layer";
import { Atom } from "effect/unstable/reactivity";

import { runtimeContextLayer } from "../lib/runtime";
import {
  backgroundActivityObserverLayer,
  backgroundActivityReporterLayer,
} from "../lib/backgroundActivityReporter";
import { connectionPlatformLayer } from "./platform";

const providedConnectionPlatformLayer = connectionPlatformLayer.pipe(
  Layer.provide(runtimeContextLayer),
);

export const allowsTarget = (target: ConnectionTarget) => {
  switch (target._tag) {
    case "PrimaryConnectionTarget":
      return true;
    case "BearerConnectionTarget":
    case "SshConnectionTarget":
      return productProfile.capabilities.remoteEnvironments;
    case "RelayConnectionTarget":
      return productProfile.capabilities.inheritedRemoteIntegrations;
  }
};

const snapshotLoaderLayer = Layer.mergeAll(
  threadSnapshotLoaderLayer,
  shellSnapshotLoaderLayer,
  pullRequestDiffLoaderLayer,
);

export const connectionRuntimeOptions = {
  allowsTarget,
  remoteEnabled: productProfile.capabilities.remoteEnvironments,
  relayDiscoveryEnabled: productProfile.capabilities.inheritedRemoteIntegrations,
};

const connectionRuntimeLayer: typeof Connection.layer =
  Connection.makeLayer(connectionRuntimeOptions);

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
