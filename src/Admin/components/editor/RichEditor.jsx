import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import { useEffect } from "react";

import Toolbar from "./Toolbar";
import "./Editor.css";

export default function RichEditor({
  value = null,
  onChange,
  placeholder = "Write your story here...",
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          class: "editor-link",
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Placeholder.configure({
        placeholder,
      }),
      Image.configure({
        HTMLAttributes: {
          class: "editor-inline-image",
        },
      }),
    ],
    content: value
      ? typeof value === "string"
        ? (value.startsWith("{") ? JSON.parse(value) : value)
        : value
      : "",
    onUpdate: ({ editor }) => {
      if (onChange) {
        // Pass JSON object as primary value, plus html & text helpers
        const json = editor.getJSON();
        const html = editor.getHTML();
        const text = editor.getText();
        onChange(json, html, text);
      }
    },
  });

  // Sync value if updated externally (e.g., when editing an existing post loaded asynchronously)
  useEffect(() => {
    if (!editor || !value) return;

    const currentJSON = JSON.stringify(editor.getJSON());
    const incomingJSON =
      typeof value === "object"
        ? JSON.stringify(value)
        : typeof value === "string" && value.startsWith("{")
        ? value
        : null;

    if (incomingJSON && currentJSON !== incomingJSON) {
      try {
        editor.commands.setContent(typeof value === "string" ? JSON.parse(value) : value);
      } catch (err) {
        console.error("Failed to parse incoming Tiptap JSON content", err);
      }
    } else if (typeof value === "string" && !value.startsWith("{") && editor.getHTML() !== value) {
      // Fallback if legacy HTML string is passed to Edit mode
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  return (
    <div className="rich-editor">
      <Toolbar editor={editor} />
      <div className="rich-editor-canvas">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
