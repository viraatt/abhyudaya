import { useState, useRef, useEffect, useCallback, memo } from "react";
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
  FaFolderOpen,
  FaUpload,
  FaExclamationTriangle,
  FaTimes,
} from "react-icons/fa";
import { uploadToCloudinary } from "../../../utils/cloudinary";
import MediaLibrary from "../media/MediaLibrary";

function Toolbar({ editor }) {
  const fileInputRef = useRef(null);

  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const [showImageDialog, setShowImageDialog] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState("");

  const [showMediaModal, setShowMediaModal] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);

  // Keyboard shortcut to close dialogs on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (showLinkDialog) setShowLinkDialog(false);
        if (showImageDialog) setShowImageDialog(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showLinkDialog, showImageDialog]);

  if (!editor) {
    return null;
  }

  // --- Link Handlers ---
  const openLinkDialog = () => {
    const previousUrl = editor.getAttributes("link").href || "";
    setLinkUrl(previousUrl);
    setShowLinkDialog((prev) => !prev);
    setShowImageDialog(false);
  };

  const handleSetLink = (e) => {
    e.preventDefault();
    if (!linkUrl.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      let finalUrl = linkUrl.trim();
      if (
        !/^https?:\/\//i.test(finalUrl) &&
        !finalUrl.startsWith("mailto:") &&
        !finalUrl.startsWith("/")
      ) {
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

  // --- Image Upload Handlers ---
  const triggerFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = "";

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      const result = await uploadToCloudinary(file, (percent) => {
        setUploadProgress(percent);
      });

      editor
        .chain()
        .focus()
        .setImage({
          src: result.secure_url,
          public_id: result.public_id,
          width: "100%",
          alignment: "center",
          caption: "",
          alt: file.name || "Uploaded Blog Image",
        })
        .run();

      setIsUploading(false);
      setUploadProgress(0);
    } catch (err) {
      console.error("Cloudinary upload error:", err);
      setIsUploading(false);
      setUploadError(err.message || "Failed to upload image. Please try again.");
    }
  };

  const handleInsertImageUrl = (e) => {
    e.preventDefault();
    if (imageUrlInput.trim()) {
      editor
        .chain()
        .focus()
        .setImage({
          src: imageUrlInput.trim(),
          width: "100%",
          alignment: "center",
          caption: "",
        })
        .run();
    }
    setShowImageDialog(false);
    setImageUrlInput("");
  };

  const handleSelectFromMediaLibrary = (mediaItem) => {
    if (mediaItem && mediaItem.url) {
      editor
        .chain()
        .focus()
        .setImage({
          src: mediaItem.url,
          public_id: mediaItem.public_id || "",
          width: "100%",
          alignment: "center",
          caption: "",
          alt: mediaItem.name || "Blog Image",
        })
        .run();
    }
    setShowMediaModal(false);
  };

  return (
    <div className="rich-toolbar-wrapper" role="toolbar" aria-label="Rich text editor toolbar">
      {/* Hidden File Picker Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: "none" }}
        aria-hidden="true"
      />

      {/* --- Upload Progress Overlay Banner --- */}
      {isUploading && (
        <div className="upload-progress-bar-wrapper" role="status" aria-live="polite">
          <div className="spinner" />
          <span>Uploading image to Cloudinary... {uploadProgress}%</span>
          <div className="upload-progress-track">
            <div
              className="upload-progress-fill"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* --- Error Notification Banner --- */}
      {uploadError && (
        <div className="upload-error-banner" role="alert">
          <FaExclamationTriangle />
          <span>{uploadError}</span>
          <button
            type="button"
            className="error-dismiss-btn"
            onClick={() => setUploadError(null)}
            title="Dismiss error"
            aria-label="Dismiss error notification"
          >
            <FaTimes />
          </button>
        </div>
      )}

      {/* --- Main Toolbar Buttons --- */}
      <div className="rich-toolbar">
        {/* --- Undo / Redo --- */}
        <div className="toolbar-group">
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
          >
            <FaUndo />
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo (Ctrl+Y)"
            aria-label="Redo"
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
            aria-label="Bold text"
          >
            <FaBold />
          </button>

          <button
            type="button"
            className={`toolbar-btn ${editor.isActive("italic") ? "is-active" : ""}`}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic (Ctrl+I)"
            aria-label="Italic text"
          >
            <FaItalic />
          </button>

          <button
            type="button"
            className={`toolbar-btn ${editor.isActive("underline") ? "is-active" : ""}`}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="Underline (Ctrl+U)"
            aria-label="Underline text"
          >
            <FaUnderline />
          </button>

          <button
            type="button"
            className={`toolbar-btn ${editor.isActive("strike") ? "is-active" : ""}`}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Strikethrough"
            aria-label="Strikethrough text"
          >
            <FaStrikethrough />
          </button>
        </div>

        <span className="toolbar-divider" />

        {/* --- Headings & Paragraph --- */}
        <div className="toolbar-group">
          <button
            type="button"
            className={`toolbar-btn ${
              editor.isActive("heading", { level: 1 }) ? "is-active" : ""
            }`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            title="Heading 1"
            aria-label="Heading level 1"
          >
            H1
          </button>

          <button
            type="button"
            className={`toolbar-btn ${
              editor.isActive("heading", { level: 2 }) ? "is-active" : ""
            }`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Heading 2"
            aria-label="Heading level 2"
          >
            H2
          </button>

          <button
            type="button"
            className={`toolbar-btn ${
              editor.isActive("heading", { level: 3 }) ? "is-active" : ""
            }`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            title="Heading 3"
            aria-label="Heading level 3"
          >
            H3
          </button>

          <button
            type="button"
            className={`toolbar-btn ${editor.isActive("paragraph") ? "is-active" : ""}`}
            onClick={() => editor.chain().focus().setParagraph().run()}
            title="Normal Paragraph"
            aria-label="Normal paragraph"
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
            aria-label="Bullet list"
          >
            <FaListUl />
          </button>

          <button
            type="button"
            className={`toolbar-btn ${editor.isActive("orderedList") ? "is-active" : ""}`}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Numbered List"
            aria-label="Numbered list"
          >
            <FaListOl />
          </button>
        </div>

        <span className="toolbar-divider" />

        {/* --- Alignment --- */}
        <div className="toolbar-group">
          <button
            type="button"
            className={`toolbar-btn ${
              editor.isActive({ textAlign: "left" }) ? "is-active" : ""
            }`}
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            title="Align Left"
            aria-label="Align text left"
          >
            <FaAlignLeft />
          </button>

          <button
            type="button"
            className={`toolbar-btn ${
              editor.isActive({ textAlign: "center" }) ? "is-active" : ""
            }`}
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            title="Align Center"
            aria-label="Align text center"
          >
            <FaAlignCenter />
          </button>

          <button
            type="button"
            className={`toolbar-btn ${
              editor.isActive({ textAlign: "right" }) ? "is-active" : ""
            }`}
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            title="Align Right"
            aria-label="Align text right"
          >
            <FaAlignRight />
          </button>

          <button
            type="button"
            className={`toolbar-btn ${
              editor.isActive({ textAlign: "justify" }) ? "is-active" : ""
            }`}
            onClick={() => editor.chain().focus().setTextAlign("justify").run()}
            title="Justify"
            aria-label="Justify text"
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
            aria-label="Blockquote"
          >
            <FaQuoteRight />
          </button>

          <button
            type="button"
            className={`toolbar-btn ${editor.isActive("codeBlock") ? "is-active" : ""}`}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            title="Code Block"
            aria-label="Code block"
          >
            <FaCode />
          </button>

          <button
            type="button"
            className="toolbar-btn"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Horizontal Line"
            aria-label="Horizontal rule"
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
            aria-label="Insert link"
          >
            <FaLink />
          </button>

          {editor.isActive("link") && (
            <button
              type="button"
              className="toolbar-btn"
              onClick={handleUnsetLink}
              title="Remove Link"
              aria-label="Remove link"
            >
              <FaUnlink />
            </button>
          )}

          {/* Direct File Picker Upload */}
          <button
            type="button"
            className="toolbar-btn"
            onClick={triggerFilePicker}
            disabled={isUploading}
            title="Upload Image from Computer (Cloudinary)"
            aria-label="Upload image file"
          >
            <FaImage />
          </button>

          {/* Open Media Library Modal */}
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => setShowMediaModal(true)}
            title="Select Image from Cloudinary Media Library"
            aria-label="Open media library"
          >
            <FaFolderOpen />
          </button>

          {/* URL Input Popup */}
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => {
              setShowImageDialog((prev) => !prev);
              setShowLinkDialog(false);
            }}
            title="Insert Image by URL"
            aria-label="Insert image from URL"
          >
            <FaUpload />
          </button>
        </div>
      </div>

      {/* --- Media Library Modal --- */}
      {showMediaModal && (
        <MediaLibrary
          isModalMode={true}
          onSelectImage={handleSelectFromMediaLibrary}
          onCloseModal={() => setShowMediaModal(false)}
        />
      )}

      {/* --- Link Popover Dialog --- */}
      {showLinkDialog && (
        <form
          className="link-dialog"
          onSubmit={handleSetLink}
          role="dialog"
          aria-label="Insert link dialog"
        >
          <input
            type="text"
            placeholder="Paste or type URL..."
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            autoFocus
            aria-label="Link URL"
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

      {/* --- Image URL Popover Dialog --- */}
      {showImageDialog && (
        <form
          className="link-dialog"
          onSubmit={handleInsertImageUrl}
          role="dialog"
          aria-label="Insert image from URL dialog"
        >
          <input
            type="url"
            placeholder="Paste image URL..."
            value={imageUrlInput}
            onChange={(e) => setImageUrlInput(e.target.value)}
            autoFocus
            aria-label="Image URL"
          />
          <div className="link-dialog-btns">
            <button type="submit" className="link-set-btn">
              Insert
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

export default memo(Toolbar);
