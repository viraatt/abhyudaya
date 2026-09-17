import { Suspense, useEffect } from "react";
import {
  Navigate,
  Routes,
  Route,
  useLocation,
  useParams,
} from "react-router-dom";
import ReactGA from "react-ga4";

import Layout from "./components/Layout.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";
import PageLoader from "./components/PageLoader.jsx";
import { ToastProvider } from "./Admin/components/Toast.jsx";
import TimeCapsulePopup from "./components/TimeCapsulePopup.jsx";

import ProtectedRoute from "./Admin/pages/components/ProtectedRoute.jsx";
import ErrorBoundary from "./Admin/components/ErrorBoundary.jsx";
import { lazyWithRetry } from "./utils/lazyWithRetry.js";

import NProgress from "nprogress";
import "nprogress/nprogress.css";

// ─────────────────────────────────────────────────────────────
// Lazy Loaded Public Pages (with chunk 404 auto-retry recovery)
// ─────────────────────────────────────────────────────────────

const Home = lazyWithRetry(() => import("./pages/Home.jsx"), "Home");
const About = lazyWithRetry(() => import("./pages/About.jsx"), "About");
const Events = lazyWithRetry(() => import("./pages/Events.jsx"), "Events");
const EventDetails = lazyWithRetry(() => import("./pages/EventDetails.jsx"), "EventDetails");
const Team = lazyWithRetry(() => import("./pages/Team.jsx"), "Team");
const Gallery = lazyWithRetry(() => import("./pages/Gallery.jsx"), "Gallery");
const EventAlbum = lazyWithRetry(() => import("./pages/EventAlbum.jsx"), "EventAlbum");
const Blog = lazyWithRetry(() => import("./pages/Blog.jsx"), "Blog");
const BlogDetails = lazyWithRetry(() => import("./pages/BlogDetails.jsx"), "BlogDetails");
const Contact = lazyWithRetry(() => import("./pages/Contact.jsx"), "Contact");
const JoinClub = lazyWithRetry(() => import("./pages/JoinClub.jsx"), "JoinClub");
const Announcements = lazyWithRetry(() => import("./pages/Announcements.jsx"), "Announcements");
const Register = lazyWithRetry(() => import("./pages/Register.jsx"), "Register");
const RegisterEvent = lazyWithRetry(() => import("./pages/RegisterEvent.jsx"), "RegisterEvent");
const Certificate = lazyWithRetry(() => import("./pages/Certificate/Certificate.jsx"), "Certificate");
const VerifyCertificate = lazyWithRetry(
  () => import("./pages/VerifyCertificate/VerifyCertificate.jsx"),
  "VerifyCertificate"
);
const TimeCapsule = lazyWithRetry(() => import("./pages/TimeCapsule.jsx"), "TimeCapsule");
const TimeCapsuleOpen = lazyWithRetry(() => import("./pages/TimeCapsuleOpen.jsx"), "TimeCapsuleOpen");
const NotFound = lazyWithRetry(() => import("./pages/NotFound.jsx"), "NotFound");

// ─────────────────────────────────────────────────────────────
// Lazy Loaded Admin Pages (with chunk 404 auto-retry recovery)
// ─────────────────────────────────────────────────────────────

const Login = lazyWithRetry(() => import("./Admin/pages/login.jsx"), "Login");
const Dashboard = lazyWithRetry(() => import("./Admin/pages/dashboard.jsx"), "Dashboard");
const EventManager = lazyWithRetry(() => import("./Admin/pages/EventManager.jsx"), "EventManager");
const AddEvent = lazyWithRetry(() => import("./Admin/pages/AddEvent.jsx"), "AddEvent");
const EditEvent = lazyWithRetry(() => import("./Admin/pages/EditEvent.jsx"), "EditEvent");
const Users = lazyWithRetry(() => import("./Admin/pages/Users.jsx"), "Users");
const BlogManager = lazyWithRetry(() => import("./Admin/pages/BlogManager.jsx"), "BlogManager");
const AddBlog = lazyWithRetry(() => import("./Admin/pages/AddBlog.jsx"), "AddBlog");
const EditBlog = lazyWithRetry(() => import("./Admin/pages/EditBlog.jsx"), "EditBlog");
const AdminTeam = lazyWithRetry(() => import("./Admin/pages/Team.jsx"), "AdminTeam");
const AdminGallery = lazyWithRetry(() => import("./Admin/pages/Gallery.jsx"), "AdminGallery");
const AdminContact = lazyWithRetry(() => import("./Admin/pages/Contact.jsx"), "AdminContact");
const AdminReviews = lazyWithRetry(() => import("./Admin/pages/Reviews.jsx"), "AdminReviews");

const RegistrationOutreach = lazyWithRetry(
  () => import("./Admin/pages/RegistrationOutreach.jsx"),
  "RegistrationOutreach"
);
const Students = lazyWithRetry(() => import("./Admin/pages/Students.jsx"), "Students");
const AdminAnnouncements = lazyWithRetry(
  () => import("./Admin/pages/Announcements.jsx"),
  "AdminAnnouncements"
);
const AdminRegistrations = lazyWithRetry(
  () => import("./Admin/pages/Registrations.jsx"),
  "AdminRegistrations"
);
const MediaLibraryPage = lazyWithRetry(
  () => import("./Admin/components/media/MediaLibrary.jsx"),
  "MediaLibraryPage"
);
const Certificates = lazyWithRetry(
  () => import("./Admin/pages/Certificates/Certificates.jsx"),
  "Certificates"
);
const CreateCertificates = lazyWithRetry(
  () => import("./Admin/pages/Certificates/CreateCertificates.jsx"),
  "CreateCertificates"
);
const AddCertificate = lazyWithRetry(
  () => import("./Admin/pages/Certificates/AddCertificate.jsx"),
  "AddCertificate"
);
const EditCertificate = lazyWithRetry(
  () => import("./Admin/pages/Certificates/EditCertificate.jsx"),
  "EditCertificate"
);
const AdminTimeCapsules = lazyWithRetry(
  () => import("./Admin/pages/TimeCapsules.jsx"),
  "AdminTimeCapsules"
);

// ─────────────────────────────────────────────────────────────
// NProgress Configuration
// ─────────────────────────────────────────────────────────────

NProgress.configure({
  showSpinner: false,
  speed: 300,
  minimum: 0.2,
});

// ─────────────────────────────────────────────────────────────
// Legacy Blog Redirect
// ─────────────────────────────────────────────────────────────

function LegacyBlogRedirect() {
  const { slug } = useParams();

  return (
    <Navigate
      to={`/blog/${encodeURIComponent(slug || "")}`}
      replace
    />
  );
}

// ─────────────────────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────────────────────

export default function App() {
  const location = useLocation();

  useEffect(() => {
    // Google Analytics page tracking
    const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

    if (GA_MEASUREMENT_ID) {
      // Redact sensitive secret tokens from analytics tracking
      const safePage = location.pathname.startsWith("/time-capsule/open/")
        ? "/time-capsule/open/:token"
        : location.pathname + location.search;

      ReactGA.send({
        hitType: "pageview",
        page: safePage,
      });
    }

    // Page loading progress
    NProgress.start();

    const timer = setTimeout(() => {
      NProgress.done();
    }, 100);

    return () => {
      clearTimeout(timer);
      NProgress.done();
    };
  }, [location.pathname, location.search]);

  return (
    <ToastProvider>
      <ScrollToTop />

      {/* Time Capsule promotional popup — shown once per 7 days on public pages */}
      <TimeCapsulePopup />

      <Suspense fallback={<PageLoader />}>
        <ErrorBoundary key={location.pathname}>
          <Routes>
            {/* ================= ADMIN ROUTES ================= */}

            <Route
              path="/admin/login"
              element={<Login />}
            />

            {/* Dashboard */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={["super_admin"]}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* Events */}
            <Route
              path="/admin/events"
              element={
                <ProtectedRoute allowedRoles={["super_admin", "event_admin"]}>
                  <EventManager />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/events/add"
              element={
                <ProtectedRoute allowedRoles={["super_admin", "event_admin"]}>
                  <AddEvent />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/events/edit/:id"
              element={
                <ProtectedRoute allowedRoles={["super_admin", "event_admin"]}>
                  <EditEvent />
                </ProtectedRoute>
              }
            />

            {/* Users */}
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles={["super_admin"]}>
                  <Users />
                </ProtectedRoute>
              }
            />

            {/* Blogs */}
            <Route
              path="/admin/blogs"
              element={
                <ProtectedRoute allowedRoles={["super_admin", "blog_admin"]}>
                  <BlogManager />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/blogs/add"
              element={
                <ProtectedRoute allowedRoles={["super_admin", "blog_admin"]}>
                  <AddBlog />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/blogs/edit/:id"
              element={
                <ProtectedRoute allowedRoles={["super_admin", "blog_admin"]}>
                  <EditBlog />
                </ProtectedRoute>
              }
            />

            {/* Media */}
            <Route
              path="/admin/media"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "super_admin",
                    "blog_admin",
                    "event_admin",
                  ]}
                >
                  <MediaLibraryPage />
                </ProtectedRoute>
              }
            />

            {/* Team */}
            <Route
              path="/admin/team"
              element={
                <ProtectedRoute allowedRoles={["super_admin"]}>
                  <AdminTeam />
                </ProtectedRoute>
              }
            />

            {/* Gallery */}
            <Route
              path="/admin/gallery"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "super_admin",
                    "event_admin",
                    "blog_admin",
                  ]}
                >
                  <AdminGallery />
                </ProtectedRoute>
              }
            />

            {/* Contact */}
            <Route
              path="/admin/contact"
              element={
                <ProtectedRoute allowedRoles={["super_admin"]}>
                  <AdminContact />
                </ProtectedRoute>
              }
            />

            {/* Reviews */}
            <Route
              path="/admin/reviews"
              element={
                <ProtectedRoute allowedRoles={["super_admin"]}>
                  <AdminReviews />
                </ProtectedRoute>
              }
            />

            {/* Announcements */}
            <Route
              path="/admin/announcements"
              element={
                <ProtectedRoute allowedRoles={["super_admin", "event_admin"]}>
                  <AdminAnnouncements />
                </ProtectedRoute>
              }
            />

            {/* Students */}
            <Route
              path="/admin/students"
              element={
                <ProtectedRoute allowedRoles={["super_admin", "event_admin"]}>
                  <Students />
                </ProtectedRoute>
              }
            />

            {/* Registrations */}
            <Route
              path="/admin/registrations"
              element={
                <ProtectedRoute allowedRoles={["super_admin", "event_admin"]}>
                  <AdminRegistrations />
                </ProtectedRoute>
              }
            />

            {/* Registration Outreach */}
            <Route
              path="/admin/registration-outreach"
              element={
                <ProtectedRoute allowedRoles={["super_admin", "event_admin"]}>
                  <RegistrationOutreach />
                </ProtectedRoute>
              }
            />

            {/* Certificates */}
            <Route
              path="/admin/certificates"
              element={
                <ProtectedRoute allowedRoles={["super_admin", "event_admin"]}>
                  <Certificates />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/certificates/create"
              element={
                <ProtectedRoute allowedRoles={["super_admin", "event_admin"]}>
                  <CreateCertificates />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/certificates/add"
              element={
                <ProtectedRoute allowedRoles={["super_admin", "event_admin"]}>
                  <AddCertificate />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/certificates/edit/:id"
              element={
                <ProtectedRoute allowedRoles={["super_admin", "event_admin"]}>
                  <EditCertificate />
                </ProtectedRoute>
              }
            />

            {/* Time Capsules */}
            <Route
              path="/admin/time-capsules"
              element={
                <ProtectedRoute allowedRoles={["super_admin", "event_admin"]}>
                  <AdminTimeCapsules />
                </ProtectedRoute>
              }
            />

            {/* ================= PUBLIC ROUTES ================= */}

            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />

              <Route path="/events" element={<Events />} />
              <Route path="/events/:slug" element={<EventDetails />} />

              <Route path="/team" element={<Team />} />

              <Route path="/gallery" element={<Gallery />} />
              <Route
                path="/gallery/:eventSlug"
                element={<EventAlbum />}
              />

              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogDetails />} />

              <Route
                path="/blogs"
                element={<Navigate to="/blog" replace />}
              />

              <Route
                path="/blogs/:slug"
                element={<LegacyBlogRedirect />}
              />

              <Route path="/contact" element={<Contact />} />
              <Route path="/join" element={<JoinClub />} />
              <Route
                path="/announcements"
                element={<Announcements />}
              />

              <Route path="/register" element={<RegisterEvent />} />
              <Route
                path="/register/:eventId"
                element={<Register />}
              />

              <Route
                path="/certificate"
                element={<Certificate />}
              />

              <Route
                path="/verify/:certificateId"
                element={<VerifyCertificate />}
              />

              {/* Time Capsule */}
              <Route path="/time-capsule" element={<TimeCapsule />} />
              <Route
                path="/time-capsule/open/:token"
                element={<TimeCapsuleOpen />}
              />

              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </ErrorBoundary>
      </Suspense>
    </ToastProvider>
  );
}