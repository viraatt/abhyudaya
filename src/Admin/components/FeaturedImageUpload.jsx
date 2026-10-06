import { useState, useRef } from "react";
import PropTypes from "prop-types";
import {
  FaCloudUploadAlt,
  FaImages,
  FaTrash,
  FaSpinner,
  FaExchangeAlt,
} from "react-icons/fa";
import "./FeaturedImageUpload.css";

export default function FeaturedImageUpload({
  imageUrl,
  onImageChange,
  onRemove,
  onOpenMediaLibrary,
  uploading = false,
  disabled = false,
}) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || uploading) return;
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (disabled || uploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        onImageChange(file);
      }
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      onImageChange(file);
      // Reset input value so re-selecting same file triggers change
      e.target.value = "";
    }
  };

  const triggerBrowse = () => {
    if (disabled || uploading) return;
    fileInputRef.current?.click();
  };

  return (
    <div className="featured-image-uploader">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp, image/gif"
        onChange={handleFileSelect}
        style={{ display: "none" }}
        disabled={disabled || uploading}
        aria-label="Upload featured image file"
      />

      {uploading ? (
        <div className="fiu-uploading-card">
          <FaSpinner className="fiu-spinner" />
          <div className="fiu-uploading-text">Uploading image to cloud...</div>
          <div className="fiu-uploading-subtext">Optimizing and generating secure preview</div>
        </div>
      ) : imageUrl ? (
        <div className="fiu-preview-card">
          <div className="fiu-image-wrapper">
            <img src={imageUrl} alt="Featured article visual" loading="lazy" />
            <div className="fiu-live-badge">
              <span className="fiu-live-badge-dot" />
              <span>Featured Image</span>
            </div>
          </div>

          {!disabled && (
            <div className="fiu-actions-bar">
              <div className="fiu-replace-group">
                <button
                  type="button"
                  className="fiu-action-btn replace-upload"
                  onClick={triggerBrowse}
                  title="Upload another image from device"
                >
                  <FaExchangeAlt /> Replace
                </button>

                {onOpenMediaLibrary && (
                  <button
                    type="button"
                    className="fiu-action-btn replace-library"
                    onClick={onOpenMediaLibrary}
                    title="Pick an image from Media Library"
                  >
                    <FaImages /> Library
                  </button>
                )}
              </div>

              {onRemove && (
                <button
                  type="button"
                  className="fiu-action-btn btn-remove"
                  onClick={onRemove}
                  title="Remove featured image"
                >
                  <FaTrash /> Remove
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          <div
            className={`fiu-dropzone ${dragActive ? "drag-active" : ""} ${
              disabled ? "disabled" : ""
            }`}
            onClick={triggerBrowse}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                triggerBrowse();
              }
            }}
            aria-label="Upload featured image dropzone"
          >
            <div className="fiu-icon-circle">
              <FaCloudUploadAlt />
            </div>

            <div className="fiu-title">
              <span>Click to browse</span> or drag and drop
            </div>

            <div className="fiu-subtitle">
              High resolution photo recommended (16:9 ratio)
            </div>

            <span className="fiu-meta-badge">PNG, JPG, WebP up to 5MB</span>
          </div>

          {onOpenMediaLibrary && !disabled && (
            <>
              <div className="fiu-divider">
                <span>or</span>
              </div>

              <button
                type="button"
                className="fiu-library-btn"
                onClick={onOpenMediaLibrary}
              >
                <FaImages /> Choose from Media Library
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}

FeaturedImageUpload.propTypes = {
  imageUrl: PropTypes.string,
  onImageChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func,
  onOpenMediaLibrary: PropTypes.func,
  uploading: PropTypes.bool,
  disabled: PropTypes.bool,
};
