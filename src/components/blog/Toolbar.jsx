import { useRef, useState } from "react";
import "./Toolbar.css";
import {
  FaBold,
  FaItalic,
  FaUnderline,
  FaStrikethrough,
  FaListUl,
  FaListOl,
  FaQuoteRight,
  FaCode,
  FaUndo,
  FaRedo,
  FaLink,
  FaImage,
  FaTable,
  FaMinus,
  FaSpinner,
} from "react-icons/fa";

// Reuses the existing Cloudinary upload helper — no new upload logic created.
// NOTE: adjust this path if your imageUpload.js lives somewhere else.
import { uploadImage } from "../../Admin/pages/services/imageUpload";

function Toolbar({ editor }) {

  // Hidden <input type="file"> used to open the OS file picker
  const fileInputRef = useRef(null);

  // Tracks upload-in-progress state so we can disable the button + show a spinner
  const [uploadingImage, setUploadingImage] = useState(false);

  if (!editor) return null;

  // Triggered when the "Insert Image" toolbar button is clicked.
  // Opens the native file picker.
  const handleInsertImageClick = () => {
    if (uploadingImage) return;
    fileInputRef.current?.click();
  };

  // Triggered when the admin selects a file from the picker.
  // Uploads it to Cloudinary, then inserts it at the current cursor position.
  const handleFileChange = async (e) => {

    const file = e.target.files[0];

    if (!file) return;

    try {

      setUploadingImage(true);

      // Reuse the existing Cloudinary upload function
      const url = await uploadImage(file);

      if (!url) {
        alert("Image upload failed. Please try again.");
        return;
      }

      // Insert the uploaded image into the editor at the cursor position,
      // then keep focus in the editor so the admin can continue typing below it.
      editor
        .chain()
        .focus()
        .setImage({ src: url, alt: "Blog image" })
        .run();

    } catch (error) {

      console.error(error);

      alert("Image upload failed. Please try again.");

    } finally {

      setUploadingImage(false);

      // Reset the input so selecting the same file again still fires onChange
      e.target.value = "";

    }

  };

  return (
    <div className="toolbar">

      {/* Text Style */}
      <button
        className={editor.isActive("bold") ? "active" : ""}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold"
      >
        <FaBold />
      </button>

      <button
        className={editor.isActive("italic") ? "active" : ""}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic"
      >
        <FaItalic />
      </button>

      <button
        title="Underline"
        disabled
      >
        <FaUnderline />
      </button>

      <button
        title="Strike"
        className={editor.isActive("strike") ? "active" : ""}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <FaStrikethrough />
      </button>

      <span className="divider"></span>

      {/* Headings */}

      <button
        className={
          editor.isActive("heading", { level: 1 })
            ? "active"
            : ""
        }
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 1 }).run()
        }
      >
        H1
      </button>

      <button
        className={
          editor.isActive("heading", { level: 2 })
            ? "active"
            : ""
        }
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
      >
        H2
      </button>

      <button
        className={
          editor.isActive("heading", { level: 3 })
            ? "active"
            : ""
        }
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }
      >
        H3
      </button>

      <span className="divider"></span>

      {/* Lists */}

      <button
        className={editor.isActive("bulletList") ? "active" : ""}
        onClick={() =>
          editor.chain().focus().toggleBulletList().run()
        }
      >
        <FaListUl />
      </button>

      <button
        className={editor.isActive("orderedList") ? "active" : ""}
        onClick={() =>
          editor.chain().focus().toggleOrderedList().run()
        }
      >
        <FaListOl />
      </button>

      <span className="divider"></span>

      {/* Quote */}

      <button
        className={editor.isActive("blockquote") ? "active" : ""}
        onClick={() =>
          editor.chain().focus().toggleBlockquote().run()
        }
      >
        <FaQuoteRight />
      </button>

      {/* Code Block */}

      <button
        className={editor.isActive("codeBlock") ? "active" : ""}
        onClick={() =>
          editor.chain().focus().toggleCodeBlock().run()
        }
      >
        <FaCode />
      </button>

      {/* Horizontal Rule */}

      <button
        onClick={() =>
          editor.chain().focus().setHorizontalRule().run()
        }
      >
        <FaMinus />
      </button>

      <span className="divider"></span>

      {/* Placeholder buttons for future features */}

      <button title="Insert Link">
        <FaLink />
      </button>

      {/* Insert Image — now fully wired up */}
      <button
        title={uploadingImage ? "Uploading..." : "Insert Image"}
        onClick={handleInsertImageClick}
        disabled={uploadingImage}
        className={uploadingImage ? "uploading" : ""}
      >
        {uploadingImage ? <FaSpinner className="spin" /> : <FaImage />}
      </button>

      {/* Hidden file input used by the Insert Image button */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      <button title="Insert Table">
        <FaTable />
      </button>

      <span className="divider"></span>

      {/* History */}

      <button
        onClick={() => editor.chain().focus().undo().run()}
      >
        <FaUndo />
      </button>

      <button
        onClick={() => editor.chain().focus().redo().run()}
      >
        <FaRedo />
      </button>

    </div>
  );
}

export default Toolbar;