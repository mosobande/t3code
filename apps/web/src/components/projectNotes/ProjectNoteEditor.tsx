import { LexicalComposer, type InitialConfigType } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $convertFromMarkdownString, $convertToMarkdownString } from "@lexical/markdown";
import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { LinkNode } from "@lexical/link";
import {
  INSERT_CHECK_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListItemNode,
  ListNode,
} from "@lexical/list";
import { $createHeadingNode, HeadingNode, QuoteNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  type EditorThemeClasses,
  type LexicalEditor,
} from "lexical";
import {
  BoldIcon,
  CheckSquareIcon,
  CodeIcon,
  Heading2Icon,
  ItalicIcon,
  ListIcon,
  RemoveFormattingIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { PROJECT_NOTE_MARKDOWN_TRANSFORMERS } from "~/projectNoteMarkdown";
import { isSafeProjectNoteLinkUrl } from "./projectNoteLinks";
import { resolveProjectNoteSelectionActions } from "./projectNoteToolbarState";

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
  disabled = false,
  onClick,
  children,
}: {
  readonly label: string;
  readonly disabled?: boolean;
  readonly onClick: () => void;
  readonly children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
          >
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
  const [selectionActions, setSelectionActions] = useState(() =>
    resolveProjectNoteSelectionActions({
      hasExpandedSelection: false,
    }),
  );
  const updateSelectionActions = useCallback(() => {
    const selection = $getSelection();
    const hasExpandedSelection = $isRangeSelection(selection) && !selection.isCollapsed();
    setSelectionActions(
      resolveProjectNoteSelectionActions({
        hasExpandedSelection,
      }),
    );
  }, []);
  useEffect(() => {
    const unregisterUpdate = editor.registerUpdateListener(({ editorState }) => {
      editorState.read(updateSelectionActions);
    });
    const unregisterSelectionChange = editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        updateSelectionActions();
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
    return () => {
      unregisterSelectionChange();
      unregisterUpdate();
    };
  }, [editor, updateSelectionActions]);
  const format = (kind: "bold" | "italic" | "code") =>
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, kind);
  const heading = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createHeadingNode("h2"));
      }
    });
  };
  const clearFormatting = () => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection) || selection.isCollapsed()) return;
      $setBlocksType(selection, () => $createParagraphNode());
      selection.extract().forEach((node) => {
        if (!$isTextNode(node)) return;
        node.setFormat(0);
        node.setStyle("");
      });
    });
  };

  return (
    <div
      className="flex shrink-0 items-center gap-0.5 border-b border-border/70 px-2 py-1"
      aria-label="Note formatting"
      role="group"
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
      <ToolbarButton
        label="Clear formatting"
        disabled={!selectionActions.canClearFormatting}
        onClick={clearFormatting}
      >
        <RemoveFormattingIcon />
      </ToolbarButton>
    </div>
  );
}

function markdownFromEditor(editor: LexicalEditor): string {
  return editor
    .getEditorState()
    .read(() => $convertToMarkdownString(PROJECT_NOTE_MARKDOWN_TRANSFORMERS));
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
      $convertFromMarkdownString(initialMarkdown, PROJECT_NOTE_MARKDOWN_TRANSFORMERS);
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
          <CheckListPlugin />
          <LinkPlugin validateUrl={isSafeProjectNoteLinkUrl} />
          <MarkdownShortcutPlugin transformers={PROJECT_NOTE_MARKDOWN_TRANSFORMERS} />
          <OnChangePlugin
            ignoreSelectionChange
            onChange={(_editorState, editor) => onChange(markdownFromEditor(editor))}
          />
        </div>
      </div>
    </LexicalComposer>
  );
}
