import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Stream from "effect/Stream";

import * as ConnectionResolver from "./resolver.ts";
import * as ConnectionDriver from "./driver.ts";
import * as EnvironmentRegistry from "./registry.ts";
import * as ConnectionOnboarding from "./onboarding.ts";
import * as PlatformConnectionSource from "../platform/source.ts";
import * as RelayEnvironmentDiscovery from "../relay/discovery.ts";
import * as RemoteEnvironmentAuthorization from "../authorization/service.ts";
import * as RpcSession from "../rpc/session.ts";

import type { ConnectionTarget } from "./model.ts";

export interface ConnectionLayerOptions {
  readonly allowsTarget?: (target: ConnectionTarget) => boolean;
  readonly remoteEnabled?: boolean;
}

const allowAllConnectionTargets = () => true;

const buildLayer = ({
  allowsTarget = allowAllConnectionTargets,
  remoteEnabled = true,
}: ConnectionLayerOptions = {}) => {
  const resolverLayer = ConnectionResolver.layerWithTargetPolicy(allowsTarget).pipe(
    Layer.provide(RemoteEnvironmentAuthorization.layer),
  );

  const driverLayer = ConnectionDriver.layer.pipe(
    Layer.provide(Layer.mergeAll(resolverLayer, RpcSession.layer)),
  );

  const registryLayer = EnvironmentRegistry.layerWithTargetPolicy(allowsTarget).pipe(
    Layer.provide(driverLayer),
  );

  const onboardingLayer = ConnectionOnboarding.layerWithOptions({
    remoteEnabled,
  }).pipe(Layer.provide(registryLayer));

  const connectionServicesLayer = Layer.mergeAll(
    registryLayer,
    RelayEnvironmentDiscovery.layerWithOptions({ enabled: remoteEnabled }),
    onboardingLayer,
  );

  const connectionStartupLayer = Layer.effectDiscard(
    Effect.gen(function* () {
      const registry = yield* EnvironmentRegistry.EnvironmentRegistry;
      const platformSource = yield* PlatformConnectionSource.PlatformConnectionSource;
      yield* registry.start;
      yield* platformSource.registrations.pipe(
        Stream.runForEach(registry.reconcilePlatform),
        Effect.forkScoped,
      );
    }).pipe(Effect.withSpan("clientRuntime.connection.application.start")),
  );

  return connectionStartupLayer.pipe(Layer.provideMerge(connectionServicesLayer));
};

export const layer = buildLayer();

export const makeLayer = (options: ConnectionLayerOptions = {}): typeof layer =>
  buildLayer(options);
