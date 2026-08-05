import { useState, useEffect } from "react";
import {
  FaSearch,
  FaPlus,
  FaCopy,
  FaTimes,
  FaCheck,
  FaCalendarAlt,
  FaExpand,
  FaChevronLeft,
  FaChevronRight,
  FaSync,
} from "react-icons/fa";
import MediaCard from "./MediaCard";
import UploadModal from "./UploadModal";
import { getMediaItems, deleteMediaItem } from "../../pages/services/mediaService";
import { useToast } from "../Toast";
import Sidebar from "../../pages/components/Sidebar";
import Topbar from "../../pages/components/Topbar";
import "./MediaLibrary.css";

const ITEMS_PER_PAGE = 12;

export default function MediaLibrary({
  isModalMode = false,
  onSelectImage,
  onCloseModal,
}) {
  const toast = useToast();
  const [mediaItems, setMediaItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'recent'

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedPreviewUrl, setCopiedPreviewUrl] = useState(false);

  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const items = await getMediaItems();
      setMediaItems(items);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load media library.");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = (newItem) => {
    setMediaItems((prev) => [newItem, ...prev]);
  };

  const handleDeleteItem = async (item) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${item.name}" from Media Library?`
    );
    if (!confirmDelete) return;

    try {
      await deleteMediaItem(item.id);
      setMediaItems((prev) => prev.filter((m) => m.id !== item.id));
      if (previewItem?.id === item.id) {
        setPreviewItem(null);
      }
      toast.success("Media item deleted successfully.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete media item.");
    }
  };

  const handleSelectMedia = (item) => {
    if (onSelectImage) {
      onSelectImage(item);
      if (onCloseModal) onCloseModal();
    }
  };

  // Filtering Logic
  const filteredItems = mediaItems.filter((item) => {
    const matchesSearch =
      !searchQuery.trim() ||
      (item.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.url || "").toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === "recent") {
      // Filter items created within last 7 days or top 10 items
      const isRecent =
        item.createdAt?.seconds &&
        Date.now() / 1000 - item.createdAt.seconds < 7 * 24 * 3600;
      return matchesSearch && isRecent;
    }

    return matchesSearch;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE) || 1;
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const mainContent = (
    <div className={`media-library-container ${isModalMode ? "modal-view" : ""}`}>
      {/* Header Actions & Search Bar */}
      <div className="media-library-header">
        <div className="media-header-left">
          <h2>Cloudinary Media Library</h2>
          <p>Manage, reuse, and upload images for blog posts & features.</p>
        </div>

        <div className="media-header-actions">
          <button
            type="button"
            className="media-btn secondary"
            onClick={fetchMedia}
            title="Refresh library"
          >
            <FaSync />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className="media-btn primary"
            onClick={() => setShowUploadModal(true)}
          >
            <FaPlus />
            <span>Upload New Image</span>
          </button>

          {isModalMode && (
            <button
              type="button"
              className="media-close-modal-btn"
              onClick={onCloseModal}
            >
              <FaTimes />
            </button>
          )}
        </div>
      </div>

      {/* Toolbar & Filter Tabs */}
      <div className="media-toolbar">
        <div className="media-tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === "all" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("all");
              setCurrentPage(1);
            }}
          >
            All Media ({mediaItems.length})
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "recent" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("recent");
              setCurrentPage(1);
            }}
          >
            Recently Uploaded
          </button>
        </div>

        <div className="media-search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search images by name or URL..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="media-empty-state">
          <p>Loading media library...</p>
        </div>
      ) : paginatedItems.length === 0 ? (
        <div className="media-empty-state">
          <p>No media files found matching your search.</p>
          <button
            type="button"
            className="media-btn primary"
            onClick={() => setShowUploadModal(true)}
          >
            Upload First Image
          </button>
        </div>
      ) : (
        <div className="media-grid">
          {paginatedItems.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              isSelectable={isModalMode}
              onSelectImage={handleSelectMedia}
              onPreviewImage={setPreviewItem}
              onDeleteImage={handleDeleteItem}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="media-pagination">
          <button
            type="button"
            className="pag-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          >
            <FaChevronLeft /> Previous
          </button>

          <span className="pag-info">
            Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
          </span>

          <button
            type="button"
            className="pag-btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          >
            Next <FaChevronRight />
          </button>
        </div>
      )}

      {/* Upload Modal */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      {/* Full Preview Lightbox Modal */}
      {previewItem && (
        <div
          className="media-modal-backdrop"
          onClick={() => setPreviewItem(null)}
        >
          <div
            className="preview-lightbox-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="lightbox-close-btn"
              onClick={() => setPreviewItem(null)}
            >
              <FaTimes />
            </button>

            <div className="lightbox-image-wrapper">
              <img src={previewItem.url} alt={previewItem.name || "Preview"} />
            </div>

            <div className="lightbox-details">
              <h4>{previewItem.name || "Image Details"}</h4>
              {previewItem.width && previewItem.height && (
                <p className="detail-line">
                  Dimensions: <strong>{previewItem.width} × {previewItem.height} px</strong>
                </p>
              )}

              <div className="lightbox-url-box">
                <input type="text" value={previewItem.url} readOnly />
                <button
                  type="button"
                  className="copy-url-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(previewItem.url);
                    setCopiedPreviewUrl(true);
                    toast.success("Image URL copied!");
                    setTimeout(() => setCopiedPreviewUrl(false), 2000);
                  }}
                >
                  {copiedPreviewUrl ? <FaCheck style={{ color: "#22c55e" }} /> : <FaCopy />}
                  <span>{copiedPreviewUrl ? "Copied!" : "Copy URL"}</span>
                </button>
              </div>

              <div className="lightbox-actions">
                {onSelectImage && (
                  <button
                    type="button"
                    className="media-btn primary"
                    onClick={() => handleSelectMedia(previewItem)}
                  >
                    Select & Insert Image
                  </button>
                )}

                <button
                  type="button"
                  className="media-btn danger"
                  onClick={() => handleDeleteItem(previewItem)}
                >
                  Delete Image
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // If used inside a Modal dialog overlay
  if (isModalMode) {
    return (
      <div className="media-modal-backdrop" onClick={onCloseModal}>
        <div className="media-modal-dialog" onClick={(e) => e.stopPropagation()}>
          {mainContent}
        </div>
      </div>
    );
  }

  // Standalone Admin Page view (/admin/media)
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-main">
        <Topbar />
        <div className="dashboard-content">{mainContent}</div>
      </div>
    </div>
  );
}
