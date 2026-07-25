import { LexicalComposer, type InitialConfigType } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  TRANSFORMERS,
} from "@lexical/markdown";
import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { LinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import {
  INSERT_CHECK_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListItemNode,
  ListNode,
} from "@lexical/list";
import { $createHeadingNode, HeadingNode, QuoteNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  type EditorThemeClasses,
  type LexicalEditor,
} from "lexical";
import {
  BoldIcon,
  CheckSquareIcon,
  CodeIcon,
  Heading2Icon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
} from "lucide-react";
import { useCallback } from "react";

import { Button } from "../ui/button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";

interface ProjectNoteEditorProps {
  readonly initialMarkdown: string;
  readonly onChange: (markdown: string) => void;
}

const editorTheme: EditorThemeClasses = {
  paragraph: "mb-2 last:mb-0",
  heading: {
    h1: "mb-3 mt-4 text-xl font-semibold",
    h2: "mb-2 mt-4 text-lg font-semibold",
    h3: "mb-2 mt-3 text-base font-semibold",
  },
  list: {
    ul: "mb-2 list-disc pl-6",
    ol: "mb-2 list-decimal pl-6",
    listitem: "my-1",
    checklist: "mb-2 list-none pl-1",
    listitemChecked: "line-through text-muted-foreground",
    listitemUnchecked: "",
  },
  quote: "my-3 border-l border-border pl-3 text-muted-foreground",
  code: "rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]",
  link: "text-primary underline underline-offset-2",
  text: {
    bold: "font-semibold",
    italic: "italic",
    code: "rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]",
  },
};

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  readonly label: string;
  readonly onClick: () => void;
  readonly children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button type="button" variant="ghost" size="icon-sm" aria-label={label} onClick={onClick}>
            {children}
          </Button>
        }
      />
      <TooltipPopup>{label}</TooltipPopup>
    </Tooltip>
  );
}

function NotesToolbar() {
  const [editor] = useLexicalComposerContext();
  const format = useCallback(
    (kind: "bold" | "italic" | "code") => editor.dispatchCommand(FORMAT_TEXT_COMMAND, kind),
    [editor],
  );
  const heading = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createHeadingNode("h2"));
      }
    });
  }, [editor]);
  const addLink = useCallback(() => {
    const url = window.prompt("Link URL");
    if (url?.trim()) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, url.trim());
    }
  }, [editor]);

  return (
    <div
      className="flex shrink-0 items-center gap-0.5 border-b border-border/70 px-2 py-1"
      aria-label="Note formatting"
      role="toolbar"
    >
      <ToolbarButton label="Heading" onClick={heading}>
        <Heading2Icon />
      </ToolbarButton>
      <ToolbarButton label="Bold" onClick={() => format("bold")}>
        <BoldIcon />
      </ToolbarButton>
      <ToolbarButton label="Italic" onClick={() => format("italic")}>
        <ItalicIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Bullet list"
        onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}
      >
        <ListIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Checklist"
        onClick={() => editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined)}
      >
        <CheckSquareIcon />
      </ToolbarButton>
      <ToolbarButton label="Code" onClick={() => format("code")}>
        <CodeIcon />
      </ToolbarButton>
      <ToolbarButton label="Link" onClick={addLink}>
        <LinkIcon />
      </ToolbarButton>
    </div>
  );
}

function markdownFromEditor(editor: LexicalEditor): string {
  return editor.getEditorState().read(() => $convertToMarkdownString(TRANSFORMERS));
}

export function ProjectNoteEditor({ initialMarkdown, onChange }: ProjectNoteEditorProps) {
  const initialConfig: InitialConfigType = {
    namespace: "ProjectNoteEditor",
    theme: editorTheme,
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, CodeNode, CodeHighlightNode],
    onError: (error) => {
      throw error;
    },
    editorState: () => {
      $convertFromMarkdownString(initialMarkdown, TRANSFORMERS);
    },
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="flex min-h-0 flex-1 flex-col">
        <NotesToolbar />
        <div className="relative min-h-0 flex-1 overflow-auto">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                aria-label="Project note"
                className="min-h-full px-4 py-3 text-sm leading-6 outline-none"
              />
            }
            placeholder={
              <p className="pointer-events-none absolute left-4 top-3 text-sm text-muted-foreground">
                Keep decisions, ideas, and reminders here…
              </p>
            }
            ErrorBoundary={({ children }) => children}
          />
          <HistoryPlugin />
          <ListPlugin />
          <LinkPlugin />
          <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
          <OnChangePlugin
            ignoreSelectionChange
            onChange={(_editorState, editor) => onChange(markdownFromEditor(editor))}
          />
        </div>
      </div>
    </LexicalComposer>
  );
}
