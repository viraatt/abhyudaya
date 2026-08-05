import { useState, useRef } from "react";
import { FaCloudUploadAlt, FaTimes, FaSpinner, FaFileImage } from "react-icons/fa";
import { uploadMediaFile } from "../../pages/services/mediaService";
import { useToast } from "../Toast";
import "./MediaLibrary.css";

export default function UploadModal({ isOpen, onClose, onUploadSuccess }) {
  const fileInputRef = useRef(null);
  const toast = useToast();

  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  if (!isOpen) return null;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = (file) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleStartUpload = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      setProgress(0);

      const savedItem = await uploadMediaFile(selectedFile, (percent) => {
        setProgress(percent);
      });

      toast.success("Image uploaded to Cloudinary successfully!");
      if (onUploadSuccess) {
        onUploadSuccess(savedItem);
      }
      handleClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to upload image.");
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  const handleClose = () => {
    if (isUploading) return;
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    onClose();
  };

  return (
    <div className="media-modal-backdrop" onClick={handleClose}>
      <div className="upload-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="media-modal-header">
          <h3>📤 Upload Media to Cloudinary</h3>
          <button type="button" className="media-close-btn" onClick={handleClose}>
            <FaTimes />
          </button>
        </div>

        <div className="upload-modal-body">
          {/* Hidden Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />

          {!selectedFile ? (
            <div
              className={`drag-drop-zone ${dragActive ? "is-drag-active" : ""}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <FaCloudUploadAlt className="upload-drop-icon" />
              <h4>Drag and drop image here</h4>
              <p>or click to browse from your device (Max size: 10MB)</p>
            </div>
          ) : (
            <div className="upload-preview-container">
              <div className="upload-image-box">
                <img src={previewUrl} alt="Upload preview" />
              </div>

              <div className="upload-file-details">
                <div className="file-info-row">
                  <FaFileImage className="file-icon" />
                  <div className="file-name-size">
                    <span className="file-name">{selectedFile.name}</span>
                    <span className="file-size">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                </div>

                {isUploading ? (
                  <div className="upload-progress-section">
                    <div className="progress-status-line">
                      <span>
                        <FaSpinner className="spin" /> Uploading to Cloudinary...
                      </span>
                      <span>{progress}%</span>
                    </div>
                    <div className="modal-progress-track">
                      <div
                        className="modal-progress-fill"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="upload-action-btns">
                    <button
                      type="button"
                      className="media-btn primary"
                      onClick={handleStartUpload}
                    >
                      🚀 Upload Now
                    </button>
                    <button
                      type="button"
                      className="media-btn secondary"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                      }}
                    >
                      Choose Different Image
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
