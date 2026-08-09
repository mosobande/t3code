import type { APIRoute } from "astro";

import { buildT3ProjectFileJsonSchema } from "@t3tools/shared/t3ProjectFile";

// A public $id is emitted only after G3B supplies an authorized SIGIDI URL.
export const GET: APIRoute = () =>
  new Response(
    `${JSON.stringify(buildT3ProjectFileJsonSchema({ id: import.meta.env.SIGIDI_PROJECT_FILE_SCHEMA_URL }), null, 2)}\n`,
    {
      headers: { "Content-Type": "application/json" },
    },
  );
