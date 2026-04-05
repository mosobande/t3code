import { Effect } from "effect";
import * as Schema from "effect/Schema";
import * as SchemaTransformation from "effect/SchemaTransformation";
import { IsoDateTime, TrimmedNonEmptyString, TrimmedString } from "./baseSchemas";
// Re-export for external consumers
export { TrimmedNonEmptyString, TrimmedString } from "./baseSchemas";
import {
  ClaudeModelOptions,
  CodexModelOptions,
  DEFAULT_GIT_TEXT_GENERATION_MODEL_BY_PROVIDER,
} from "./model";
import { ModelSelection, ProviderKind } from "./orchestration";

// ── Client Settings (local-only) ───────────────────────────────

export const TimestampFormat = Schema.Literals(["locale", "12-hour", "24-hour"]);
export type TimestampFormat = typeof TimestampFormat.Type;
export const DEFAULT_TIMESTAMP_FORMAT: TimestampFormat = "locale";

export const SidebarProjectSortOrder = Schema.Literals(["updated_at", "created_at", "manual"]);
export type SidebarProjectSortOrder = typeof SidebarProjectSortOrder.Type;
export const DEFAULT_SIDEBAR_PROJECT_SORT_ORDER: SidebarProjectSortOrder = "updated_at";

export const SidebarThreadSortOrder = Schema.Literals(["updated_at", "created_at"]);
export type SidebarThreadSortOrder = typeof SidebarThreadSortOrder.Type;
export const DEFAULT_SIDEBAR_THREAD_SORT_ORDER: SidebarThreadSortOrder = "updated_at";

export const ClientSettingsSchema = Schema.Struct({
  confirmThreadArchive: Schema.Boolean.pipe(Schema.withDecodingDefault(() => false)),
  confirmThreadDelete: Schema.Boolean.pipe(Schema.withDecodingDefault(() => true)),
  diffWordWrap: Schema.Boolean.pipe(Schema.withDecodingDefault(() => false)),
  sidebarProjectSortOrder: SidebarProjectSortOrder.pipe(
    Schema.withDecodingDefault(() => DEFAULT_SIDEBAR_PROJECT_SORT_ORDER),
  ),
  sidebarThreadSortOrder: SidebarThreadSortOrder.pipe(
    Schema.withDecodingDefault(() => DEFAULT_SIDEBAR_THREAD_SORT_ORDER),
  ),
  timestampFormat: TimestampFormat.pipe(Schema.withDecodingDefault(() => DEFAULT_TIMESTAMP_FORMAT)),
});
export type ClientSettings = typeof ClientSettingsSchema.Type;

export const DEFAULT_CLIENT_SETTINGS: ClientSettings = Schema.decodeSync(ClientSettingsSchema)({});

// ── Server Settings (server-authoritative) ────────────────────

export const ThreadEnvMode = Schema.Literals(["local", "worktree"]);
export type ThreadEnvMode = typeof ThreadEnvMode.Type;

const makeBinaryPathSetting = (fallback: string) =>
  TrimmedString.pipe(
    Schema.decodeTo(
      Schema.String,
      SchemaTransformation.transformOrFail({
        decode: (value) => Effect.succeed(value || fallback),
        encode: (value) => Effect.succeed(value),
      }),
    ),
    Schema.withDecodingDefault(() => fallback),
  );

export const CodexSettings = Schema.Struct({
  enabled: Schema.Boolean.pipe(Schema.withDecodingDefault(() => true)),
  binaryPath: makeBinaryPathSetting("codex"),
  homePath: TrimmedString.pipe(Schema.withDecodingDefault(() => "")),
  customModels: Schema.Array(Schema.String).pipe(Schema.withDecodingDefault(() => [])),
});
export type CodexSettings = typeof CodexSettings.Type;

export const ClaudeSettings = Schema.Struct({
  enabled: Schema.Boolean.pipe(Schema.withDecodingDefault(() => true)),
  binaryPath: makeBinaryPathSetting("claude"),
  customModels: Schema.Array(Schema.String).pipe(Schema.withDecodingDefault(() => [])),
});
export type ClaudeSettings = typeof ClaudeSettings.Type;

export const ObservabilitySettings = Schema.Struct({
  otlpTracesUrl: TrimmedString.pipe(Schema.withDecodingDefault(() => "")),
  otlpMetricsUrl: TrimmedString.pipe(Schema.withDecodingDefault(() => "")),
});
export type ObservabilitySettings = typeof ObservabilitySettings.Type;

// ── Provider Profiles ──────────────────────────────────────────────

// ULID-based profile identifier
export const ProviderProfileId = TrimmedNonEmptyString;
export type ProviderProfileId = typeof ProviderProfileId.Type;

// Custom endpoint config (null = no custom endpoint)
export const CustomEndpointConfig = Schema.Struct({
  baseUrl: TrimmedNonEmptyString,
  apiKey: TrimmedNonEmptyString,
});
export type CustomEndpointConfig = typeof CustomEndpointConfig.Type;

// Migration version marker
export const ProviderProfilesMigration = Schema.Struct({
  version: Schema.Literal(1),
  performedAt: IsoDateTime,
});
export type ProviderProfilesMigration = typeof ProviderProfilesMigration.Type;

// Provider profile schema
export const CodexProfileOptions = Schema.Struct({
  provider: Schema.Literal("codex"),
  codex: CodexModelOptions,
});
export const ClaudeProfileOptions = Schema.Struct({
  provider: Schema.Literal("claudeAgent"),
  claudeAgent: ClaudeModelOptions,
});

export const ProviderProfile = Schema.Struct({
  id: ProviderProfileId,
  name: TrimmedNonEmptyString,
  provider: ProviderKind,
  model: TrimmedNonEmptyString,
  options: Schema.Union([CodexProfileOptions, ClaudeProfileOptions]),
  customEndpoint: Schema.NullOr(CustomEndpointConfig),
  isDefault: Schema.Boolean.pipe(Schema.withDecodingDefault(() => false)),
  description: Schema.optional(TrimmedString.pipe(Schema.withDecodingDefault(() => ""))),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type ProviderProfile = typeof ProviderProfile.Type;

// Input for profile creation — all ProviderProfile fields except auto-generated ones
export const ProviderProfileCreateInput = Schema.Struct({
  name: TrimmedNonEmptyString,
  provider: ProviderKind,
  model: TrimmedNonEmptyString,
  options: Schema.Union([CodexProfileOptions, ClaudeProfileOptions]),
  customEndpoint: Schema.NullOr(CustomEndpointConfig),
  isDefault: Schema.optional(Schema.Boolean),
  description: Schema.optional(TrimmedString),
});

// Provider profile patch schema
const CodexProfileOptionsPatch = Schema.Struct({
  provider: Schema.Literal("codex"),
  codex: Schema.optional(CodexModelOptions),
});
const ClaudeProfileOptionsPatch = Schema.Struct({
  provider: Schema.Literal("claudeAgent"),
  claudeAgent: Schema.optional(ClaudeModelOptions),
});

const CustomEndpointConfigPatch = Schema.Struct({
  baseUrl: Schema.optionalKey(TrimmedString),
  apiKey: Schema.optionalKey(TrimmedString),
});

export const ProviderProfilePatch = Schema.Struct({
  name: Schema.optionalKey(TrimmedNonEmptyString),
  model: Schema.optionalKey(TrimmedNonEmptyString),
  options: Schema.optionalKey(Schema.Union([CodexProfileOptionsPatch, ClaudeProfileOptionsPatch])),
  customEndpoint: Schema.optionalKey(Schema.NullOr(CustomEndpointConfigPatch)),
  isDefault: Schema.optionalKey(Schema.Boolean),
  description: Schema.optionalKey(TrimmedString),
});
export type ProviderProfilePatch = typeof ProviderProfilePatch.Type;

export const ServerSettings = Schema.Struct({
  enableAssistantStreaming: Schema.Boolean.pipe(Schema.withDecodingDefault(() => false)),
  defaultThreadEnvMode: ThreadEnvMode.pipe(
    Schema.withDecodingDefault(() => "local" as const satisfies ThreadEnvMode),
  ),
  textGenerationModelSelection: ModelSelection.pipe(
    Schema.withDecodingDefault(() => ({
      provider: "codex" as const,
      model: DEFAULT_GIT_TEXT_GENERATION_MODEL_BY_PROVIDER.codex,
    })),
  ),

  // Provider specific settings
  providers: Schema.Struct({
    codex: CodexSettings.pipe(Schema.withDecodingDefault(() => ({}))),
    claudeAgent: ClaudeSettings.pipe(Schema.withDecodingDefault(() => ({}))),
  }).pipe(Schema.withDecodingDefault(() => ({}))),
  observability: ObservabilitySettings.pipe(Schema.withDecodingDefault(() => ({}))),

  // Provider profiles
  providerProfiles: Schema.Array(ProviderProfile).pipe(
    Schema.withDecodingDefault(() => []),
  ),
  _providerProfilesMigration: Schema.optional(ProviderProfilesMigration),
});
export type ServerSettings = typeof ServerSettings.Type;

export const DEFAULT_SERVER_SETTINGS: ServerSettings = Schema.decodeSync(ServerSettings)({});

export class ServerSettingsError extends Schema.TaggedErrorClass<ServerSettingsError>()(
  "ServerSettingsError",
  {
    settingsPath: Schema.String,
    detail: Schema.String,
    cause: Schema.optional(Schema.Defect),
  },
) {
  override get message(): string {
    return `Server settings error at ${this.settingsPath}: ${this.detail}`;
  }
}

// ── Unified type ─────────────────────────────────────────────────────

export type UnifiedSettings = ServerSettings & ClientSettings;
export const DEFAULT_UNIFIED_SETTINGS: UnifiedSettings = {
  ...DEFAULT_SERVER_SETTINGS,
  ...DEFAULT_CLIENT_SETTINGS,
};

// ── Server Settings Patch (replace with a Schema.deepPartial if available) ──────────────────────────────────────────

const CodexModelOptionsPatch = Schema.Struct({
  reasoningEffort: Schema.optionalKey(CodexModelOptions.fields.reasoningEffort),
  fastMode: Schema.optionalKey(CodexModelOptions.fields.fastMode),
});

const ClaudeModelOptionsPatch = Schema.Struct({
  thinking: Schema.optionalKey(ClaudeModelOptions.fields.thinking),
  effort: Schema.optionalKey(ClaudeModelOptions.fields.effort),
  fastMode: Schema.optionalKey(ClaudeModelOptions.fields.fastMode),
  contextWindow: Schema.optionalKey(ClaudeModelOptions.fields.contextWindow),
});

const ModelSelectionPatch = Schema.Union([
  Schema.Struct({
    provider: Schema.optionalKey(Schema.Literal("codex")),
    model: Schema.optionalKey(TrimmedNonEmptyString),
    options: Schema.optionalKey(CodexModelOptionsPatch),
  }),
  Schema.Struct({
    provider: Schema.optionalKey(Schema.Literal("claudeAgent")),
    model: Schema.optionalKey(TrimmedNonEmptyString),
    options: Schema.optionalKey(ClaudeModelOptionsPatch),
  }),
]);

const CodexSettingsPatch = Schema.Struct({
  enabled: Schema.optionalKey(Schema.Boolean),
  binaryPath: Schema.optionalKey(Schema.String),
  homePath: Schema.optionalKey(Schema.String),
  customModels: Schema.optionalKey(Schema.Array(Schema.String)),
});

const ClaudeSettingsPatch = Schema.Struct({
  enabled: Schema.optionalKey(Schema.Boolean),
  binaryPath: Schema.optionalKey(Schema.String),
  customModels: Schema.optionalKey(Schema.Array(Schema.String)),
});

export const ServerSettingsPatch = Schema.Struct({
  enableAssistantStreaming: Schema.optionalKey(Schema.Boolean),
  defaultThreadEnvMode: Schema.optionalKey(ThreadEnvMode),
  textGenerationModelSelection: Schema.optionalKey(ModelSelectionPatch),
  observability: Schema.optionalKey(
    Schema.Struct({
      otlpTracesUrl: Schema.optionalKey(Schema.String),
      otlpMetricsUrl: Schema.optionalKey(Schema.String),
    }),
  ),
  providers: Schema.optionalKey(
    Schema.Struct({
      codex: Schema.optionalKey(CodexSettingsPatch),
      claudeAgent: Schema.optionalKey(ClaudeSettingsPatch),
    }),
  ),
  providerProfiles: Schema.optionalKey(Schema.Array(ProviderProfile)),
});
export type ServerSettingsPatch = typeof ServerSettingsPatch.Type;
