import { CHECK_LIST, TRANSFORMERS, type Transformer } from "@lexical/markdown";

export const PROJECT_NOTE_MARKDOWN_TRANSFORMERS: Transformer[] = [CHECK_LIST, ...TRANSFORMERS];
