/**
 * Upstream migration sources proven compatible with the SIGIDI migration lane.
 *
 * Each digest is SHA-256 over the exact committed Git blob bytes at
 * `testedUpstreamCommit`. Update this record only after the sync compatibility
 * checks and supported upgrade fixtures pass.
 */
export const sigidiUpstreamCompatibility = {
  testedUpstreamCommit: "2db08457f2f4eaaa713a067b2ea480ca2b583025",
  effectEngine: {
    version: "4.0.0-beta.103",
    patchHash: "af36b7948b6f9c56623074662b51dade5699880c1a7c71245de73e13c3185fb6",
  },
  migrations: [
    {
      id: 1,
      name: "OrchestrationEvents",
      sourcePath: "apps/server/src/persistence/Migrations/001_OrchestrationEvents.ts",
      sha256: "a16e23b67f93ffb158c3e69f0660bc13150b82a121e74029dd5f39203b889bfe",
    },
    {
      id: 2,
      name: "OrchestrationCommandReceipts",
      sourcePath: "apps/server/src/persistence/Migrations/002_OrchestrationCommandReceipts.ts",
      sha256: "3fb5ac84681f192144729b2c13d9826ee43a0d6329a42162922305bc784bcd21",
    },
    {
      id: 3,
      name: "CheckpointDiffBlobs",
      sourcePath: "apps/server/src/persistence/Migrations/003_CheckpointDiffBlobs.ts",
      sha256: "8d7ae95b77bb0d4c32970553e80af663b47568196cf12c45c69f7ecabba3c469",
    },
    {
      id: 4,
      name: "ProviderSessionRuntime",
      sourcePath: "apps/server/src/persistence/Migrations/004_ProviderSessionRuntime.ts",
      sha256: "481a1f88c6b369d4a472a3ff42e38b319e82c88b91196480b9d240eab566ea4c",
    },
    {
      id: 5,
      name: "Projections",
      sourcePath: "apps/server/src/persistence/Migrations/005_Projections.ts",
      sha256: "a05f48508910a4890f3adb49c16823d94085fc2770817b49c370eecafe26c920",
    },
    {
      id: 6,
      name: "ProjectionThreadSessionRuntimeModeColumns",
      sourcePath:
        "apps/server/src/persistence/Migrations/006_ProjectionThreadSessionRuntimeModeColumns.ts",
      sha256: "306869b3ce7c77171fcff34c3005a64893aa4e1273da5f0dbfb92be3248fc8c4",
    },
    {
      id: 7,
      name: "ProjectionThreadMessageAttachments",
      sourcePath:
        "apps/server/src/persistence/Migrations/007_ProjectionThreadMessageAttachments.ts",
      sha256: "70d9cf23829a0dc6907f729e4dc5750c4f8ee4b48c5785d8231342101c2aebdd",
    },
    {
      id: 8,
      name: "ProjectionThreadActivitySequence",
      sourcePath: "apps/server/src/persistence/Migrations/008_ProjectionThreadActivitySequence.ts",
      sha256: "b9d86b20b2f4664ca4b2afc4ff899eac3e252be095f2e54f7ffeff9079593bd8",
    },
    {
      id: 9,
      name: "ProviderSessionRuntimeMode",
      sourcePath: "apps/server/src/persistence/Migrations/009_ProviderSessionRuntimeMode.ts",
      sha256: "4a3bdeb4e7f01f233b1fcaeb324c9cbcb1873b914205aaa675f71fde3b419bba",
    },
    {
      id: 10,
      name: "ProjectionThreadsRuntimeMode",
      sourcePath: "apps/server/src/persistence/Migrations/010_ProjectionThreadsRuntimeMode.ts",
      sha256: "5fd32e890fc33d8709471d7e1d43ad76e322f4f58eaa0c57db6500887abb09d7",
    },
    {
      id: 11,
      name: "OrchestrationThreadCreatedRuntimeMode",
      sourcePath:
        "apps/server/src/persistence/Migrations/011_OrchestrationThreadCreatedRuntimeMode.ts",
      sha256: "ab6307dc6e461d9c1a7669d2256a6cfd5f746facf05f8d5d9fb32054856c15a3",
    },
    {
      id: 12,
      name: "ProjectionThreadsInteractionMode",
      sourcePath: "apps/server/src/persistence/Migrations/012_ProjectionThreadsInteractionMode.ts",
      sha256: "dd3be859c649d6f0d26805a192ac6bed39ccb40da350c25490eeaec0fa93c0b2",
    },
    {
      id: 13,
      name: "ProjectionThreadProposedPlans",
      sourcePath: "apps/server/src/persistence/Migrations/013_ProjectionThreadProposedPlans.ts",
      sha256: "ab8ff8fca03a370497eaca34ba79b0a98519b31921077b61c19fe0192668dfb6",
    },
    {
      id: 14,
      name: "ProjectionThreadProposedPlanImplementation",
      sourcePath:
        "apps/server/src/persistence/Migrations/014_ProjectionThreadProposedPlanImplementation.ts",
      sha256: "1f0549094e208cd9910e2fd00f01672203682d5848f3e1b4152129cecb1a103d",
    },
    {
      id: 15,
      name: "ProjectionTurnsSourceProposedPlan",
      sourcePath: "apps/server/src/persistence/Migrations/015_ProjectionTurnsSourceProposedPlan.ts",
      sha256: "24c271f2bbbe6a482519504d8108e174f624e022a2c72b68f5a729a96eb8af17",
    },
    {
      id: 16,
      name: "CanonicalizeModelSelections",
      sourcePath: "apps/server/src/persistence/Migrations/016_CanonicalizeModelSelections.ts",
      sha256: "88e8a5b6c4ef2d703f1b10435c6b47ca59f0999c3cbe7bb29e56a049094e6cd8",
    },
    {
      id: 17,
      name: "ProjectionThreadsArchivedAt",
      sourcePath: "apps/server/src/persistence/Migrations/017_ProjectionThreadsArchivedAt.ts",
      sha256: "a3d9b050499f5fd7653e6cad4e3e8f0080585cb2d2df904ec4616d4e857b34c4",
    },
    {
      id: 18,
      name: "ProjectionThreadsArchivedAtIndex",
      sourcePath: "apps/server/src/persistence/Migrations/018_ProjectionThreadsArchivedAtIndex.ts",
      sha256: "030b249ea2efdf3445385a77f744961810098a5887900c2975033c90c51062d7",
    },
    {
      id: 19,
      name: "ProjectionSnapshotLookupIndexes",
      sourcePath: "apps/server/src/persistence/Migrations/019_ProjectionSnapshotLookupIndexes.ts",
      sha256: "38957074db08f788eb01ab5b61b228394d51fc145c53663a9f774f7cdf392a5f",
    },
    {
      id: 20,
      name: "AuthAccessManagement",
      sourcePath: "apps/server/src/persistence/Migrations/020_AuthAccessManagement.ts",
      sha256: "b42e1c2459621fa173f0cda61ae8ffe0551fbbbf460122719c361965a8d7141b",
    },
    {
      id: 21,
      name: "AuthSessionClientMetadata",
      sourcePath: "apps/server/src/persistence/Migrations/021_AuthSessionClientMetadata.ts",
      sha256: "9c6fc3c660652997ef063f93856d9582480bb860079ef63008e6792cf9778e71",
    },
    {
      id: 22,
      name: "AuthSessionLastConnectedAt",
      sourcePath: "apps/server/src/persistence/Migrations/022_AuthSessionLastConnectedAt.ts",
      sha256: "a01600daa87f23de131eb8ee9b966af4dfe4687f1b598534344368f88fedac70",
    },
    {
      id: 23,
      name: "ProjectionThreadShellSummary",
      sourcePath: "apps/server/src/persistence/Migrations/023_ProjectionThreadShellSummary.ts",
      sha256: "59991a34f694eae662e2eafd2b132ee8ea97a50885626c6ae8ef79e56673c601",
    },
    {
      id: 24,
      name: "BackfillProjectionThreadShellSummary",
      sourcePath:
        "apps/server/src/persistence/Migrations/024_BackfillProjectionThreadShellSummary.ts",
      sha256: "39f211ff3dbbebc8437c9d277f36ee12e9c8ae455f3ee4333de8411e0c41a2c2",
    },
    {
      id: 25,
      name: "CleanupInvalidProjectionPendingApprovals",
      sourcePath:
        "apps/server/src/persistence/Migrations/025_CleanupInvalidProjectionPendingApprovals.ts",
      sha256: "12deed776074027de02ca69bc043f62ee435ad4822edcaaae6bd1c79373dc9b7",
    },
    {
      id: 26,
      name: "CanonicalizeModelSelectionOptions",
      sourcePath: "apps/server/src/persistence/Migrations/026_CanonicalizeModelSelectionOptions.ts",
      sha256: "da25de448121cc902744ba313d23e9bae234571e910cf703d6289a73312791be",
    },
    {
      id: 27,
      name: "ProviderSessionRuntimeInstanceId",
      sourcePath: "apps/server/src/persistence/Migrations/027_ProviderSessionRuntimeInstanceId.ts",
      sha256: "4a399e0130c795433e038880030a6b36822afc3aabf8b0cf873df06861576856",
    },
    {
      id: 28,
      name: "ProjectionThreadSessionInstanceId",
      sourcePath: "apps/server/src/persistence/Migrations/028_ProjectionThreadSessionInstanceId.ts",
      sha256: "d4affeb4813ccc8b9ee67a24aa26a8bb78074148fb4375704fd9388e00a221e8",
    },
    {
      id: 29,
      name: "ProjectionThreadDetailOrderingIndexes",
      sourcePath:
        "apps/server/src/persistence/Migrations/029_ProjectionThreadDetailOrderingIndexes.ts",
      sha256: "f852d5b27356f49fa8fc4f50e8ed4c5a5a8340e87d1ed9403c330d30519e9d68",
    },
    {
      id: 30,
      name: "ProjectionThreadShellArchiveIndexes",
      sourcePath:
        "apps/server/src/persistence/Migrations/030_ProjectionThreadShellArchiveIndexes.ts",
      sha256: "4ee1a43fb672738318c6adcbed90659ae4e7827ce4eab5d11494f6abaa7643aa",
    },
    {
      id: 31,
      name: "AuthAuthorizationScopes",
      sourcePath: "apps/server/src/persistence/Migrations/031_AuthAuthorizationScopes.ts",
      sha256: "73e6d069d7fea97f309bf1b9e34ff63761dc2b75b2bc523b520c82f981cea378",
    },
    {
      id: 32,
      name: "AuthPairingProofKeyThumbprint",
      sourcePath: "apps/server/src/persistence/Migrations/032_AuthPairingProofKeyThumbprint.ts",
      sha256: "1fd5faa96fe78d9c6751750c93714b471c96e6675591ee31846126258cd3d145",
    },
    {
      id: 33,
      name: "ProjectionThreadsSettled",
      sourcePath: "apps/server/src/persistence/Migrations/033_ProjectionThreadsSettled.ts",
      sha256: "a9060855f2bf267398adca6944f0e170dca14b04fb5ad5df9a2aa808f2a0164f",
    },
    {
      id: 34,
      name: "ProjectionThreadsSnoozed",
      sourcePath: "apps/server/src/persistence/Migrations/034_ProjectionThreadsSnoozed.ts",
      sha256: "6f3aec59ee6715d5e2eb13ac53515b02aa69be622fc446a582522544cab5e260",
    },
    {
      id: 35,
      name: "ProjectionThreadTitleRegeneration",
      sourcePath: "apps/server/src/persistence/Migrations/035_ProjectionThreadTitleRegeneration.ts",
      sha256: "cda98a290a3c3d3f503c3942779cf1f97ce71d18cacefe2ca8e71a2c4fda1506",
    },
    {
      id: 36,
      name: "ProjectionThreadsPinned",
      sourcePath: "apps/server/src/persistence/Migrations/036_ProjectionThreadsPinned.ts",
      sha256: "effd5f8f7f8ecd4348b306396ebee9dbb67688994c434c262c4d71aeb0157acb",
    },
    {
      id: 37,
      name: "ProjectionTurnsKeysetIndex",
      sourcePath: "apps/server/src/persistence/Migrations/037_ProjectionTurnsKeysetIndex.ts",
      sha256: "79e56b053aa6872fdf91aea3368d2c0a0a754c176256e6a9af852d949ba7cff5",
    },
    {
      id: 38,
      name: "ProjectionThreadsPinOrderKey",
      sourcePath: "apps/server/src/persistence/Migrations/038_ProjectionThreadsPinOrderKey.ts",
      sha256: "0b5bf37e0b75b6cb3cc95540e9342449b93790c4356772bdc97feea820f5266f",
    },
    {
      id: 39,
      name: "ProjectionProjectsDefaultThreadEnvMode",
      sourcePath:
        "apps/server/src/persistence/Migrations/039_ProjectionProjectsDefaultThreadEnvMode.ts",
      sha256: "bd48dddf9a31cdf028995f3d9f3030a00db85e6de9231c030115d92244b46a50",
    },
    {
      id: 40,
      name: "ProjectionProjectFaviconPath",
      sourcePath: "apps/server/src/persistence/Migrations/040_ProjectionProjectFaviconPath.ts",
      sha256: "6c439ab1e249f906e48cb552acafd3350e9b0e809b27557923da805a7c8e308a",
    },
  ],
} as const;
