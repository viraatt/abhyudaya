import { EditorContent } from "@tiptap/react";
import "./EditorCanvas.css";

function EditorCanvas({ editor }) {
  if (!editor) return null;

  return (
    <div className="editor-wrapper">
      <EditorContent editor={editor} />
    </div>
  );
}

export default EditorCanvas;