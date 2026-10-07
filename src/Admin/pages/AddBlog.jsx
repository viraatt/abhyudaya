import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaSpinner } from "react-icons/fa";
import {
  FiSave,
  FiSend,
  FiUploadCloud,
  FiFeather,
  FiClock,
  FiTag,
  FiFolder,
  FiFileText,
  FiImage,
  FiCompass,
  FiShield,
} from "react-icons/fi";
import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import RichEditor from "../components/editor/RichEditor";
import SlugInput from "../components/SlugInput";
import AutosaveIndicator from "../components/AutosaveIndicator";
import MediaLibrary from "../components/media/MediaLibrary";
import ErrorBoundary from "../components/ErrorBoundary";
import FeaturedImageUpload from "../components/FeaturedImageUpload";
import { useToast } from "../components/Toast";
import { useAutosave } from "../hooks/useAutosave";
import { useAuth } from "../../context/AuthContext";
import { ROLES, normalizeRole } from "../config/roles";
import {
  saveAlumniArticleDraft,
  submitAlumniArticleForApproval,
  ALUMNI_CATEGORIES,
} from "../../Firebase/alumniArticleService";
import { auth, db } from "../../Firebase/firebase";

import "./style/admin.css";
import "./addBlog.css";

import { publishBlog, updateBlogService } from "./services/blogService";
import { uploadImage } from "./services/imageUpload";


function AddBlog() {
  const navigate = useNavigate();
  const toast = useToast();
  const { currentUser } = useAuth();
  const isAlumniUser = normalizeRole(currentUser?.role) === ROLES.ALUMNI;

  // â”€â”€ Alumni profile fetched live from Firestore â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // null = loading, false = error, object = loaded profile
  const [alumniProfile, setAlumniProfile] = useState(null);

  const cleanAuthorName = (value) => {
    if (typeof value !== "string") return "";
    const name = value.trim();
    if (!name || name.includes("@")) return "";
    const generic = [
      "admin", "alumni", "abhyudaya alumni", "anonymous",
      "unknown", "user", "name not found", "name not set"
    ];
    return generic.includes(name.toLowerCase()) ? "" : name;
  };

  const profileText = (value, depth = 0) => {
    if (depth > 3 || value == null) return "";
    if (typeof value === "string") return value.trim();
    if (typeof value === "number") return String(value);
    if (Array.isArray(value)) {
      return value.map((item) => profileText(item, depth + 1)).filter(Boolean).join(", ");
    }
    if (typeof value === "object") {
      for (const key of ["name", "displayName", "fullName", "label", "title", "value", "url"]) {
        const text = profileText(value[key], depth + 1);
        if (text) return text;
      }
    }
    return "";
  };

  const findAuthorName = (source, depth = 0) => {
    if (!source || depth > 5) return "";
    if (typeof source === "string") return cleanAuthorName(source);
    if (typeof source !== "object") return "";

    for (const field of [
      "name", "fullName", "displayName", "authorName", "alumniName",
      "writerName", "realName", "studentName", "contributorName", "profileName",
      "value", "label"
    ]) {
      const value = cleanAuthorName(source[field]);
      if (value) return value;
    }

    const first = cleanAuthorName(source.firstName || source.first_name);
    const last = cleanAuthorName(source.lastName || source.last_name);
    if (first && last) return `${first} ${last}`;
    if (first) return first;

    for (const field of [
      "name", "author", "alumniAuthor", "profile", "user", "alumni",
      "authorProfile", "userProfile", "personalInfo"
    ]) {
      const value = findAuthorName(source[field], depth + 1);
      if (value) return value;
    }
    return "";
  };

  useEffect(() => {
    if (!isAlumniUser || !currentUser?.uid) return;

    let cancelled = false;

    const loadAuthor = async () => {
      try {
        const uid = currentUser.uid;
        let userData = {};
        let resolvedName =
          findAuthorName(currentUser) || findAuthorName(auth.currentUser);

        setAlumniProfile({
          uid,
          name: resolvedName,
          email: currentUser.email || auth.currentUser?.email || "",
          graduationYear: profileText(currentUser.graduationYear || currentUser.passingYear),
          branch: profileText(currentUser.branch || currentUser.department || currentUser.course || currentUser.program),
          organization: profileText(currentUser.organization || currentUser.company),
          designation: profileText(currentUser.designation || currentUser.jobTitle),
          linkedin: profileText(currentUser.linkedin || currentUser.linkedinUrl),
          profilePhoto: profileText(currentUser.profilePhoto || currentUser.photoURL || auth.currentUser?.photoURL),
        });

        // First source: users/{uid}
        try {
          const userSnap = await getDoc(doc(db, "users", uid));
          if (userSnap.exists()) {
            userData = userSnap.data() || {};
            resolvedName = findAuthorName(userData) || resolvedName;
            console.log("[AddBlog] users/{uid}:", userData);
          }
        } catch (error) {
          console.warn("[AddBlog] users lookup failed:", error);
        }

        // Second source: an existing alumni submission.
        if (!resolvedName) {
          try {
            const submissions = collection(db, "alumniSubmissions");
            const queries = [
              query(submissions, where("authorUid", "==", uid), limit(5)),
              query(submissions, where("authorId", "==", uid), limit(5)),
            ];

            for (const submissionQuery of queries) {
              try {
                const snapshot = await getDocs(submissionQuery);
                for (const submissionDoc of snapshot.docs) {
                  const submission = submissionDoc.data() || {};
                  const name = findAuthorName(submission);
                  if (name) {
                    resolvedName = name;
                    console.log("[AddBlog] Name resolved from alumni submission:", name);
                    break;
                  }
                }
                if (resolvedName) break;
              } catch (error) {
                console.warn("[AddBlog] submission lookup failed:", error);
              }
            }
          } catch (error) {
            console.warn("[AddBlog] alumniSubmissions lookup failed:", error);
          }
        }

        if (cancelled) return;

        setAlumniProfile({
          uid,
          name: resolvedName,
          email: currentUser.email || auth.currentUser?.email || userData.email || "",
          graduationYear: profileText(
            userData.graduationYear || userData.passingYear || userData.batchYear ||
            currentUser.graduationYear || currentUser.passingYear
          ),
          branch: profileText(
            userData.branch || userData.department || userData.course || userData.program ||
            currentUser.branch || currentUser.department
          ),
          organization: profileText(
            userData.organization || userData.company || currentUser.organization || currentUser.company
          ),
          designation: profileText(
            userData.designation || userData.jobTitle || currentUser.designation || currentUser.jobTitle
          ),
          linkedin: profileText(
            userData.linkedin || userData.linkedinUrl || currentUser.linkedin || currentUser.linkedinUrl
          ),
          profilePhoto: profileText(
            userData.profilePhoto || userData.photoURL || currentUser.profilePhoto ||
            currentUser.photoURL || auth.currentUser?.photoURL
          ),
        });

        console.log("[AddBlog] FINAL AUTHOR NAME:", resolvedName);
      } catch (error) {
        console.error("[AddBlog] Author resolution failed:", error);
      }
    };

    loadAuthor();
    return () => { cancelled = true; };
  }, [isAlumniUser, currentUser?.uid]);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(isAlumniUser ? "Alumni Stories" : "Club News");
  const categoryValue = isAlumniUser && category === "Club News" ? "Alumni Stories" : category;
  const [tags, setTags] = useState("");
  const [slug, setSlug] = useState("");
  const [seo, setSeo] = useState("");
  const [publishDate, setPublishDate] = useState("");
  const [status, setStatus] = useState("Draft");

  // Rich Text Editor State
  const [contentJson, setContentJson] = useState(null);
  const [contentExcerpt, setContentExcerpt] = useState("");

  // Featured Image
  const [featuredImage, setFeaturedImage] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);

  // Draft / Publish Action Loading States
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [submittingApproval, setSubmittingApproval] = useState(false);

  // Created Doc Ref for Autosave & Manual Saves
  const createdDocIdRef = useRef(null);

  // Callback to compute blog data payload for autosave hook
  const getAutosaveData = useCallback(() => {
    return {
      title: title.trim(),
      category: categoryValue,
      featuredImage,
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      slug: slug.trim(),
      seo,
      publishDate: publishDate || new Date().toISOString().split("T")[0],
      status: "Draft",
      author: isAlumniUser
        ? (alumniProfile && alumniProfile !== false
          ? (alumniProfile.name || currentUser?.name || currentUser?.fullName || currentUser?.displayName || "")
          : (currentUser?.name || currentUser?.fullName || currentUser?.displayName || ""))
        : "Admin",
      excerpt: contentExcerpt.trim().substring(0, 180),
      content: contentJson,
    };
  }, [title, categoryValue, featuredImage, tags, slug, seo, publishDate, contentExcerpt, contentJson, isAlumniUser, alumniProfile, currentUser]);

  // Handle autosave callback from custom hook
  const handleAutosave = useCallback(async (blogData) => {
    if (isAlumniUser) {
      // Use the dynamically loaded profile; fall back to currentUser if still loading
      const authorUser = (alumniProfile && alumniProfile !== false) ? alumniProfile : currentUser;
      const res = await saveAlumniArticleDraft(createdDocIdRef.current, {
        title,
        category: categoryValue,
        featuredImage,
        tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        slug,
        seo,
        excerpt: contentExcerpt.trim().substring(0, 180),
        content: contentJson,
        // Top-level author fields attached to the article document
        authorId: currentUser?.uid || null,
        authorEmail: currentUser?.email || "",
        authorProfilePhoto: authorUser?.profilePhoto || "",
      }, authorUser);
      createdDocIdRef.current = res.id;
      return res.id;
    } else {
      if (createdDocIdRef.current) {
        await updateBlogService(createdDocIdRef.current, blogData);
        return createdDocIdRef.current;
      } else {
        const result = await publishBlog(blogData);
        createdDocIdRef.current = result.id;
        return result.id;
      }
    }
  }, [isAlumniUser, title, categoryValue, featuredImage, tags, slug, seo, contentExcerpt, contentJson, currentUser, alumniProfile]);

  // Use Autosave Hook (30 sec interval)
  // NOTE: useAutosave expects a single options object {data, onSave, interval, enabled}
  const {
    status: autosaveStatus,
    lastSavedTime,
    errorMessage: autosaveError,
    hasUnsavedChanges,
    retrySave,
  } = useAutosave({
    data: getAutosaveData(),
    onSave: handleAutosave,
    enabled: true,
    interval: 30000,
  });

  // Handle Editor Changes
  const handleEditorChange = useCallback(({ json, text }) => {
    setContentJson(json);
    setContentExcerpt(text || "");
  }, []);

  // Upload Featured Image from device
  const handleImageUpload = async (fileOrEvent) => {
    const file = fileOrEvent?.target?.files
      ? fileOrEvent.target.files[0]
      : fileOrEvent;
    if (!file) return;

    try {
      setUploadingImage(true);
      const url = await uploadImage(file);
      setFeaturedImage(url);
      toast.success("Featured image uploaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to upload image.");
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    setFeaturedImage("");
    toast.info("Featured image removed.");
  };

  const handleSelectMediaImage = (mediaItem) => {
    if (mediaItem && mediaItem.url) {
      setFeaturedImage(mediaItem.url);
      setShowMediaModal(false);
      toast.success("Featured image selected from Media Library!");
    }
  };

  // --- Save Draft (Manual) ---
  const handleSaveDraft = async () => {
    try {
      setSavingDraft(true);
      if (isAlumniUser) {
        // Use the dynamically loaded Firestore profile as source of truth      
        const authorUser = (alumniProfile && alumniProfile !== false) ? alumniProfile : currentUser;
        const articleData = {
          title: title.trim(),
          category: categoryValue,
          featuredImage,
          tags: tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          slug: slug.trim(),
          seo,
          excerpt: contentExcerpt.trim().substring(0, 180),
          content: contentJson,
          author: authorUser,
          authorUid: currentUser?.uid || null,
          authorId: currentUser?.uid || null,
          authorEmail: currentUser?.email || "",
          authorProfilePhoto: authorUser?.profilePhoto || "",
        };
        const result = await saveAlumniArticleDraft(createdDocIdRef.current, articleData, authorUser);
        createdDocIdRef.current = result.id;
        toast.success("Draft saved successfully!");
        navigate(`/admin/blogs/edit/${result.id}`);
      } else {
        const blogData = {
          title: title.trim(),
          category: categoryValue,
          featuredImage,
          tags: tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          slug: slug.trim(),
          seo,
          publishDate,
          status: "Draft",
          author: "Admin",
          excerpt: contentExcerpt.trim().substring(0, 180),
          content: contentJson,
        };

        if (createdDocIdRef.current) {
          await updateBlogService(createdDocIdRef.current, blogData);
          toast.success("Draft saved successfully!");
          navigate(`/admin/blogs/edit/${createdDocIdRef.current}`);
        } else {
          const result = await publishBlog(blogData);
          toast.success("Draft saved successfully!");
          navigate(`/admin/blogs/edit/${result.id}`);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to save draft.");
    } finally {
      setSavingDraft(false);
    }
  };

  // --- Submit for Approval (Alumni Only) ---
  const handleSubmitForApproval = async () => {
    if (!title.trim()) {
      toast.error("Please enter a title for your article.");
      return;
    }
    if (!contentExcerpt.trim() && !contentJson) {
      toast.error("Please write your article content before submitting.");
      return;
    }

    try {
      setSubmittingApproval(true);
      // Use the dynamically loaded Firestore profile as source of truth        
      const authorUser = (alumniProfile && alumniProfile !== false) ? alumniProfile : currentUser;
      const articleData = {
        title: title.trim(),
        category: categoryValue,
        featuredImage,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        slug: slug.trim(),
        seo,
        excerpt: contentExcerpt.trim().substring(0, 180),
        content: contentJson,
        author: authorUser,
        authorUid: currentUser?.uid || null,
        authorId: currentUser?.uid || null,
        authorEmail: currentUser?.email || "",
        authorProfilePhoto: authorUser?.profilePhoto || "",
      };

      await submitAlumniArticleForApproval(createdDocIdRef.current, articleData, authorUser);
      toast.success("Article submitted for approval! Super Admin will review it.");
      navigate("/admin/blogs");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to submit article for approval.");
    } finally {
      setSubmittingApproval(false);
    }
  };

  // --- Publish Blog (Admins Only - Alumni NEVER can call this) ---
  const handlePublish = async () => {
    if (isAlumniUser) {
      toast.error("Alumni contributors cannot publish articles directly. Please click 'Submit for Approval'.");
      return;
    }

    try {
      setPublishing(true);
      const targetStatus = status === "Archived" ? "Archived" : "Published";
      const blogData = {
        title: title.trim(),
        category: categoryValue,
        featuredImage,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        slug: slug.trim(),
        seo,
        publishDate: publishDate || new Date().toISOString().split("T")[0],
        status: targetStatus,
        author: "Admin",
        excerpt: contentExcerpt.trim().substring(0, 180),
        content: contentJson,
      };

      if (createdDocIdRef.current) {
        await updateBlogService(createdDocIdRef.current, blogData);
      } else {
        await publishBlog(blogData);
      }

      toast.success(
        targetStatus === "Published"
          ? "Blog published successfully!"
          : "Blog post saved!"
      );
      navigate("/admin/blogs");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to publish blog.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main">
        <Topbar />

        <div className="dashboard-content">
          <div className="create-post">
            <div className="create-header">
              <div className="header-left">
                <div className="editorial-badge-row">
                  <span className="editorial-eyebrow">
                    <FiFeather className="eyebrow-icon" />
                    <span>{isAlumniUser ? "Alumni Editorial" : "Club Editorial"}</span>
                  </span>
                  <AutosaveIndicator
                    status={autosaveStatus}
                    lastSavedTime={lastSavedTime}
                    errorMessage={autosaveError}
                    hasUnsavedChanges={hasUnsavedChanges}
                    onRetry={retrySave}
                  />
                </div>
                <h1 className="editorial-main-title">
                  {isAlumniUser ? "Write Article" : "Create Blog"}
                </h1>
                <p className="editorial-subtitle">
                  {isAlumniUser
                    ? "Share your experience, knowledge and journey with the Abhyudaya community."
                    : "Write and manage blog posts for Abhyudaya Club."}
                </p>
              </div>

              <div className="header-buttons">
                <button
                  type="button"
                  className="editorial-draft-btn"
                  onClick={handleSaveDraft}
                  disabled={savingDraft || publishing || submittingApproval}
                  title="Save your progress as a draft"
                >
                  {savingDraft ? (
                    <>
                      <FaSpinner className="spin" />
                      <span>Saving Draft...</span>
                    </>
                  ) : (
                    <>
                      <FiSave />
                      <span>Save Draft</span>
                    </>
                  )}
                </button>

                {isAlumniUser ? (
                  <button
                    type="button"
                    className="editorial-submit-btn"
                    onClick={handleSubmitForApproval}
                    disabled={submittingApproval || savingDraft}
                    title="Submit this article for Super Admin review"
                  >
                    {submittingApproval ? (
                      <>
                        <FaSpinner className="spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <FiSend />
                        <span>Submit for Approval</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="editorial-publish-btn"
                    onClick={handlePublish}
                    disabled={publishing || savingDraft}
                    title="Publish directly to public blog"
                  >
                    {publishing ? (
                      <>
                        <FaSpinner className="spin" />
                        <span>Publishing...</span>
                      </>
                    ) : (
                      <>
                        <FiUploadCloud />
                        <span>Publish Post</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="editor-layout">
              <section className="editor-section">
                <div className="title-input-wrapper">
                  <input
                    type="text"
                    className="title-input"
                    placeholder="Article title..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    aria-label="Article title"
                  />
                </div>

                <div className="rich-editor-wrapper">
                  <ErrorBoundary>
                    <RichEditor
                      value={contentJson}
                      onChange={handleEditorChange}
                      placeholder="Write your story here with rich formatting..."
                    />
                  </ErrorBoundary>
                </div>
              </section>

              <aside className="blog-sidebar" aria-label="Article settings">
                {/* 1. Workflow / Publishing Status Card */}
                {isAlumniUser ? (
                  <div className="card workflow-card">
                    <div className="card-header-row">
                      <div className="card-title-wrap">
                        <FiShield className="card-icon" />
                        <h3>Approval Workflow</h3>
                      </div>
                      <span className="workflow-badge">Review Required</span>
                    </div>
                    <p className="workflow-description">
                      Your article will be saved as <strong>Draft</strong> or submitted to Super Admin for editorial review and approval before being published.
                    </p>
                  </div>
                ) : (
                  <div className="card">
                    <div className="card-header-row">
                      <div className="card-title-wrap">
                        <FiCompass className="card-icon" />
                        <h3>Publish Status</h3>
                      </div>
                    </div>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      aria-label="Post Status"
                    >
                      <option value="Draft">Draft</option>
                      <option value="Published">Published</option>
                      <option value="Archived">Archived</option>
                    </select>
                  </div>
                )}

                {/* Featured Image */}
                <div className="card">
                  <div className="card-header-row">
                    <div className="card-title-wrap">
                      <FiImage className="card-icon" />
                      <h3>Featured Image</h3>
                    </div>
                  </div>

                  <FeaturedImageUpload
                    imageUrl={featuredImage}
                    onImageChange={handleImageUpload}
                    onRemove={removeImage}
                    onOpenMediaLibrary={() => setShowMediaModal(true)}
                    uploading={uploadingImage}
                  />
                </div>

                {/* Category */}
                <div className="card">
                  <div className="card-header-row">
                    <div className="card-title-wrap">
                      <FiFolder className="card-icon" />
                      <h3>Category</h3>
                    </div>
                  </div>

                  <select
                    value={categoryValue}
                    onChange={(e) => setCategory(e.target.value)}
                    aria-label="Category"
                  >
                    {isAlumniUser ? (
                      ALUMNI_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))
                    ) : (
                      <>
                        <option>Club News</option>
                        <option>Workshop</option>
                        <option>Technology</option>
                        <option>Events</option>
                        <option>Achievement</option>
                        <option>Alumni Stories</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Tags */}
                <div className="card">
                  <div className="card-header-row">
                    <div className="card-title-wrap">
                      <FiTag className="card-icon" />
                      <h3>Tags</h3>
                    </div>
                  </div>

                  <input
                    type="text"
                    placeholder="Career, Industry, Placement"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    aria-label="Tags separated by comma"
                  />
                  <span className="card-input-help">Separate keywords with commas</span>
                </div>

                {/* Slug / Permalink */}
                <div className="card">
                  <div className="card-header-row">
                    <div className="card-title-wrap">
                      <FiCompass className="card-icon" />
                      <h3>Permalink</h3>
                    </div>
                  </div>

                  <SlugInput
                    title={title}
                    slug={slug}
                    onSlugChange={setSlug}
                  />
                </div>

                {/* Short Excerpt */}
                <div className="card">
                  <div className="card-header-row">
                    <div className="card-title-wrap">
                      <FiFileText className="card-icon" />
                      <h3>Short Excerpt</h3>
                    </div>
                  </div>

                  <textarea
                    rows="3"
                    placeholder="Brief description for article card..."
                    value={contentExcerpt}
                    onChange={(e) => setContentExcerpt(e.target.value)}
                    aria-label="Article excerpt"
                  />
                  <span className="card-input-help">Summarize your article in 1–2 sentences</span>
                </div>

                {/* SEO Description */}
                <div className="card">
                  <div className="card-header-row">
                    <div className="card-title-wrap">
                      <FiCompass className="card-icon" />
                      <h3>SEO Meta</h3>
                    </div>
                  </div>

                  <textarea
                    rows="3"
                    placeholder="Write SEO description..."
                    value={seo}
                    onChange={(e) => setSeo(e.target.value)}
                    aria-label="SEO meta description"
                  />
                </div>

                {/* Publish Date (admin only) */}
                {!isAlumniUser && (
                  <div className="card">
                    <div className="card-header-row">
                      <div className="card-title-wrap">
                        <FiClock className="card-icon" />
                        <h3>Publish Date</h3>
                      </div>
                    </div>

                    <input
                      type="date"
                      value={publishDate}
                      onChange={(e) => setPublishDate(e.target.value)}
                      aria-label="Publish Date"
                    />
                  </div>
                )}
              </aside>
            </div>
          </div>
        </div>
      </div>

      {/* Media Library Picker Modal */}
      {showMediaModal && (
        <div className="media-modal-backdrop" onClick={() => setShowMediaModal(false)}>
          <div className="media-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <MediaLibrary
              isModalMode={true}
              onSelectImage={handleSelectMediaImage}
              onCloseModal={() => setShowMediaModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default AddBlog;
