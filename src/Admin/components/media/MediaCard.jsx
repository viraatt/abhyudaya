import { useState } from "react";
import { FaCopy, FaEye, FaTrash, FaCheck, FaExternalLinkAlt } from "react-icons/fa";
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
    e.stopPropagation();
    if (onSelectImage) {
      onSelectImage(item);
    }
  };

  const handlePreview = (e) => {
    e.stopPropagation();
    if (onPreviewImage) {
      onPreviewImage(item);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDeleteImage) {
      onDeleteImage(item);
    }
  };

  return (
    <div
      className="media-card-item"
      onClick={() => (isSelectable ? handleSelect : handlePreview)()}
    >
      <div className="media-card-thumb">
        <img src={item.url} alt={item.name || "Media"} loading="lazy" />

        {/* Hover Action Overlay */}
        <div className="media-card-overlay">
          <div className="overlay-actions">
            {onSelectImage && (
              <button
                type="button"
                className="media-action-btn select-btn"
                onClick={handleSelect}
                title="Use / Insert this image"
              >
                Insert
              </button>
            )}

            <button
              type="button"
              className="media-action-btn"
              onClick={handlePreview}
              title="Preview Image"
            >
              <FaEye />
            </button>

            <button
              type="button"
              className="media-action-btn"
              onClick={handleCopyUrl}
              title="Copy Image URL"
            >
              {copied ? <FaCheck style={{ color: "#22c55e" }} /> : <FaCopy />}
            </button>

            <button
              type="button"
              className="media-action-btn danger-btn"
              onClick={handleDelete}
              title="Delete from Media Library"
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
            {item.width} × {item.height}
          </span>
        )}
      </div>
    </div>
  );
}
