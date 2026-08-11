import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { $convertFromMarkdownString, $convertToMarkdownString } from "@lexical/markdown";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { createEditor } from "lexical";
import { describe, expect, it } from "vite-plus/test";

import { PROJECT_NOTE_MARKDOWN_TRANSFORMERS } from "./projectNoteMarkdown";

describe("project note Markdown", () => {
  it("round-trips checked and unchecked checklist items", () => {
    const editor = createEditor({
      nodes: [
        HeadingNode,
        QuoteNode,
        ListNode,
        ListItemNode,
        LinkNode,
        CodeNode,
        CodeHighlightNode,
      ],
      onError: (error) => {
        throw error;
      },
    });

    editor.update(
      () => {
        $convertFromMarkdownString(
          "- [x] Finished\n- [ ] Follow up",
          PROJECT_NOTE_MARKDOWN_TRANSFORMERS,
        );
      },
      { discrete: true },
    );

    expect(
      editor
        .getEditorState()
        .read(() => $convertToMarkdownString(PROJECT_NOTE_MARKDOWN_TRANSFORMERS)),
    ).toBe("- [x] Finished\n- [ ] Follow up");
  });

  it("round-trips existing links after link authoring tools are removed", () => {
    const editor = createEditor({
      nodes: [
        HeadingNode,
        QuoteNode,
        ListNode,
        ListItemNode,
        LinkNode,
        CodeNode,
        CodeHighlightNode,
      ],
      onError: (error) => {
        throw error;
      },
    });

    editor.update(
      () => {
        $convertFromMarkdownString(
          "Read [the guide](https://example.com/guide).",
          PROJECT_NOTE_MARKDOWN_TRANSFORMERS,
        );
      },
      { discrete: true },
    );

    expect(editor.getEditorState().toJSON()).toMatchObject({
      root: {
        children: [
          {
            children: [
              { text: "Read ", type: "text" },
              {
                children: [{ text: "the guide", type: "text" }],
                type: "link",
                url: "https://example.com/guide",
              },
              { text: ".", type: "text" },
            ],
            type: "paragraph",
          },
        ],
      },
    });
    expect(
      editor
        .getEditorState()
        .read(() => $convertToMarkdownString(PROJECT_NOTE_MARKDOWN_TRANSFORMERS)),
    ).toBe("Read [the guide](https://example.com/guide).");
  });
});
