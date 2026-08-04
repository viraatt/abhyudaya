import { useState } from "react";
import {
  FaBold,
  FaItalic,
  FaUnderline,
  FaStrikethrough,
  FaListUl,
  FaListOl,
  FaQuoteRight,
  FaCode,
  FaMinus,
  FaAlignLeft,
  FaAlignCenter,
  FaAlignRight,
  FaAlignJustify,
  FaLink,
  FaUnlink,
  FaUndo,
  FaRedo,
  FaImage,
} from "react-icons/fa";

export default function Toolbar({ editor }) {
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [imageUrl, setImageUrl] = useState("");

  if (!editor) {
    return null;
  }

  // Handle Link Popup
  const openLinkDialog = () => {
    const previousUrl = editor.getAttributes("link").href || "";
    setLinkUrl(previousUrl);
    setShowLinkDialog(true);
  };

  const handleSetLink = (e) => {
    e.preventDefault();
    if (!linkUrl.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      let finalUrl = linkUrl.trim();
      if (!/^https?:\/\//i.test(finalUrl) && !finalUrl.startsWith("mailto:") && !finalUrl.startsWith("/")) {
        finalUrl = `https://${finalUrl}`;
      }
      editor.chain().focus().extendMarkRange("link").setLink({ href: finalUrl }).run();
    }
    setShowLinkDialog(false);
    setLinkUrl("");
  };

  const handleUnsetLink = () => {
    editor.chain().focus().unsetLink().run();
    setShowLinkDialog(false);
    setLinkUrl("");
  };

  // Handle Image Popup
  const handleInsertImage = (e) => {
    e.preventDefault();
    if (imageUrl.trim()) {
      editor.chain().focus().setImage({ src: imageUrl.trim() }).run();
    }
    setShowImageDialog(false);
    setImageUrl("");
  };

  return (
    <div className="rich-toolbar-wrapper">
      <div className="rich-toolbar">

        {/* --- Undo / Redo --- */}
        <div className="toolbar-group">
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo (Ctrl+Z)"
          >
            <FaUndo />
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo (Ctrl+Y)"
          >
            <FaRedo />
          </button>
        </div>

        <span className="toolbar-divider" />

        {/* --- Text Formatting --- */}
        <div className="toolbar-group">
          <button
            type="button"
            className={`toolbar-btn ${editor.isActive("bold") ? "is-active" : ""}`}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold (Ctrl+B)"
          >
            <FaBold />
          </button>

          <button
            type="button"
            className={`toolbar-btn ${editor.isActive("italic") ? "is-active" : ""}`}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic (Ctrl+I)"
          >
            <FaItalic />
          </button>

          <button
            type="button"
            className={`toolbar-btn ${editor.isActive("underline") ? "is-active" : ""}`}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="Underline (Ctrl+U)"
          >
            <FaUnderline />
          </button>

          <button
            type="button"
            className={`toolbar-btn ${editor.isActive("strike") ? "is-active" : ""}`}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Strikethrough"
          >
            <FaStrikethrough />
          </button>
        </div>

        <span className="toolbar-divider" />

        {/* --- Headings & Paragraph --- */}
        <div className="toolbar-group">
          <button
            type="button"
            className={`toolbar-btn ${editor.isActive("heading", { level: 1 }) ? "is-active" : ""}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            title="Heading 1"
          >
            H1
          </button>

          <button
            type="button"
            className={`toolbar-btn ${editor.isActive("heading", { level: 2 }) ? "is-active" : ""}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Heading 2"
          >
            H2
          </button>

          <button
            type="button"
            className={`toolbar-btn ${editor.isActive("heading", { level: 3 }) ? "is-active" : ""}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            title="Heading 3"
          >
            H3
          </button>

          <button
            type="button"
            className={`toolbar-btn ${editor.isActive("paragraph") ? "is-active" : ""}`}
            onClick={() => editor.chain().focus().setParagraph().run()}
            title="Normal Paragraph"
          >
            P
          </button>
        </div>

        <span className="toolbar-divider" />

        {/* --- Lists --- */}
        <div className="toolbar-group">
          <button
            type="button"
            className={`toolbar-btn ${editor.isActive("bulletList") ? "is-active" : ""}`}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet List"
          >
            <FaListUl />
          </button>

          <button
            type="button"
            className={`toolbar-btn ${editor.isActive("orderedList") ? "is-active" : ""}`}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Numbered List"
          >
            <FaListOl />
          </button>
        </div>

        <span className="toolbar-divider" />

        {/* --- Alignment --- */}
        <div className="toolbar-group">
          <button
            type="button"
            className={`toolbar-btn ${editor.isActive({ textAlign: "left" }) ? "is-active" : ""}`}
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            title="Align Left"
          >
            <FaAlignLeft />
          </button>

          <button
            type="button"
            className={`toolbar-btn ${editor.isActive({ textAlign: "center" }) ? "is-active" : ""}`}
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            title="Align Center"
          >
            <FaAlignCenter />
          </button>

          <button
            type="button"
            className={`toolbar-btn ${editor.isActive({ textAlign: "right" }) ? "is-active" : ""}`}
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            title="Align Right"
          >
            <FaAlignRight />
          </button>

          <button
            type="button"
            className={`toolbar-btn ${editor.isActive({ textAlign: "justify" }) ? "is-active" : ""}`}
            onClick={() => editor.chain().focus().setTextAlign("justify").run()}
            title="Justify"
          >
            <FaAlignJustify />
          </button>
        </div>

        <span className="toolbar-divider" />

        {/* --- Blocks & Rules --- */}
        <div className="toolbar-group">
          <button
            type="button"
            className={`toolbar-btn ${editor.isActive("blockquote") ? "is-active" : ""}`}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Blockquote"
          >
            <FaQuoteRight />
          </button>

          <button
            type="button"
            className={`toolbar-btn ${editor.isActive("codeBlock") ? "is-active" : ""}`}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            title="Code Block"
          >
            <FaCode />
          </button>

          <button
            type="button"
            className="toolbar-btn"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Horizontal Line"
          >
            <FaMinus />
          </button>
        </div>

        <span className="toolbar-divider" />

        {/* --- Insert Link & Image --- */}
        <div className="toolbar-group">
          <button
            type="button"
            className={`toolbar-btn ${editor.isActive("link") ? "is-active" : ""}`}
            onClick={openLinkDialog}
            title="Insert Link"
          >
            <FaLink />
          </button>

          {editor.isActive("link") && (
            <button
              type="button"
              className="toolbar-btn"
              onClick={handleUnsetLink}
              title="Remove Link"
            >
              <FaUnlink />
            </button>
          )}

          <button
            type="button"
            className="toolbar-btn"
            onClick={() => setShowImageDialog(true)}
            title="Insert Inline Image URL"
          >
            <FaImage />
          </button>
        </div>

      </div>

      {/* --- Link Popover Dialog --- */}
      {showLinkDialog && (
        <form className="link-dialog" onSubmit={handleSetLink}>
          <input
            type="text"
            placeholder="Paste or type URL..."
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            autoFocus
          />
          <div className="link-dialog-btns">
            <button type="submit" className="link-set-btn">
              Apply
            </button>
            {editor.isActive("link") && (
              <button
                type="button"
                className="link-remove-btn"
                onClick={handleUnsetLink}
              >
                Remove
              </button>
            )}
            <button
              type="button"
              className="link-remove-btn"
              style={{ background: "#f1f5f9", color: "#64748b" }}
              onClick={() => setShowLinkDialog(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* --- Image Popover Dialog --- */}
      {showImageDialog && (
        <form className="link-dialog" onSubmit={handleInsertImage}>
          <input
            type="url"
            placeholder="Paste image URL (Cloudinary / Unsplash)..."
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            autoFocus
          />
          <div className="link-dialog-btns">
            <button type="submit" className="link-set-btn">
              Insert Image
            </button>
            <button
              type="button"
              className="link-remove-btn"
              style={{ background: "#f1f5f9", color: "#64748b" }}
              onClick={() => setShowImageDialog(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
