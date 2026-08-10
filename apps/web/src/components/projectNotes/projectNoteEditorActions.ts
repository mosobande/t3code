import { TOGGLE_LINK_COMMAND } from "@lexical/link";
import { $setBlocksType } from "@lexical/selection";
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  type LexicalEditor,
} from "lexical";

export function clearProjectNoteFormatting(editor: LexicalEditor): void {
  editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
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
}
