import { useState } from "react";
import { FaCopy, FaEye, FaTrash, FaCheck } from "react-icons/fa";
import { useToast } from "../Toast";

export default function MediaCard({
  item,
  onSelectImage,
  onPreviewImage,
  onDeleteImage,
  isSelectable = false,
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopyUrl = (e) => {
    e.stopPropagation();
    if (item.url) {
      navigator.clipboard.writeText(item.url);
      setCopied(true);
      toast.success("Image URL copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSelect = (e) => {
    if (e) e.stopPropagation();
    if (onSelectImage) {
      onSelectImage(item);
    }
  };

  const handlePreview = (e) => {
    if (e) e.stopPropagation();
    if (onPreviewImage) {
      onPreviewImage(item);
    }
  };

  const handleDelete = (e) => {
    if (e) e.stopPropagation();
    if (onDeleteImage) {
      onDeleteImage(item);
    }
  };

  const handleClick = () => {
    if (isSelectable) {
      handleSelect();
    } else {
      handlePreview();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      className="media-card-item"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`${isSelectable ? "Select" : "Preview"} image: ${item.name || "Untitled Image"}`}
    >
      <div className="media-card-thumb">
        <img src={item.url} alt={item.name || "Media thumbnail"} loading="lazy" />

        {/* Hover Action Overlay */}
        <div className="media-card-overlay">
          <div className="overlay-actions">
            {onSelectImage && (
              <button
                type="button"
                className="media-action-btn select-btn"
                onClick={handleSelect}
                title="Use / Insert this image"
                aria-label={`Insert ${item.name || "image"}`}
              >
                Insert
              </button>
            )}

            <button
              type="button"
              className="media-action-btn"
              onClick={handlePreview}
              title="Preview Image"
              aria-label={`Preview ${item.name || "image"}`}
            >
              <FaEye />
            </button>

            <button
              type="button"
              className="media-action-btn"
              onClick={handleCopyUrl}
              title="Copy Image URL"
              aria-label={`Copy URL for ${item.name || "image"}`}
            >
              {copied ? <FaCheck style={{ color: "#22c55e" }} /> : <FaCopy />}
            </button>

            <button
              type="button"
              className="media-action-btn danger-btn"
              onClick={handleDelete}
              title="Delete from Media Library"
              aria-label={`Delete ${item.name || "image"}`}
            >
              <FaTrash />
            </button>
          </div>
        </div>
      </div>

      <div className="media-card-meta">
        <span className="media-card-title">{item.name || "Image"}</span>
        {item.width && item.height && (
          <span className="media-card-dims">
            {item.width} × {item.height} px
          </span>
        )}
      </div>
    </div>
  );
}
