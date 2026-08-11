import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";

import Layout from "./components/Layout.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";
import PageLoader from "./components/PageLoader.jsx";
import { ToastProvider } from "./Admin/components/Toast.jsx";

import ProtectedRoute from "./Admin/pages/components/ProtectedRoute.jsx";

import NProgress from "nprogress";
import "nprogress/nprogress.css";

// ─────────────────────────────────────────────────────────────
// Lazy Loaded Public Pages
// ─────────────────────────────────────────────────────────────
const Home = lazy(() => import("./pages/Home.jsx"));
const About = lazy(() => import("./pages/About.jsx"));
const Events = lazy(() => import("./pages/Events.jsx"));
const EventDetails = lazy(() => import("./pages/EventDetails.jsx"));
const Team = lazy(() => import("./pages/Team.jsx"));
const Gallery = lazy(() => import("./pages/Gallery.jsx"));
const Blog = lazy(() => import("./pages/Blog.jsx"));
const BlogDetails = lazy(() => import("./pages/BlogDetails.jsx"));
const Contact = lazy(() => import("./pages/Contact.jsx"));
const JoinClub = lazy(() => import("./pages/JoinClub.jsx"));
const Announcements = lazy(() => import("./pages/Announcements.jsx"));
const Register = lazy(() => import("./pages/Register.jsx"));
const NotFound = lazy(() => import("./pages/NotFound.jsx"));

// ─────────────────────────────────────────────────────────────
// Lazy Loaded Admin Pages
// ─────────────────────────────────────────────────────────────
const Login = lazy(() => import("./Admin/pages/login.jsx"));
const Dashboard = lazy(() => import("./Admin/pages/dashboard.jsx"));
const EventManager = lazy(() => import("./Admin/pages/EventManager.jsx"));
const AddEvent = lazy(() => import("./Admin/pages/AddEvent.jsx"));
const EditEvent = lazy(() => import("./Admin/pages/EditEvent.jsx"));
const Users = lazy(() => import("./Admin/pages/Users.jsx"));
const BlogManager = lazy(() => import("./Admin/pages/BlogManager.jsx"));
const AddBlog = lazy(() => import("./Admin/pages/AddBlog.jsx"));
const EditBlog = lazy(() => import("./Admin/pages/EditBlog.jsx"));
const AdminTeam = lazy(() => import("./Admin/pages/Team.jsx"));
const AdminGallery = lazy(() => import("./Admin/pages/Gallery.jsx"));
const AdminContact = lazy(() => import("./Admin/pages/Contact.jsx"));
const AdminReviews = lazy(() => import("./Admin/pages/Reviews.jsx"));
const RegistrationOutreach = lazy(() => import("./Admin/pages/RegistrationOutreach.jsx"));
const Students = lazy(() => import("./Admin/pages/Students.jsx"));
const AdminAnnouncements = lazy(() => import("./Admin/pages/Announcements.jsx"));
const AdminRegistrations = lazy(() => import("./Admin/pages/Registrations.jsx"));
const MediaLibraryPage = lazy(() => import("./Admin/components/media/MediaLibrary.jsx"));

NProgress.configure({
  showSpinner: false,
  speed: 300,
  minimum: 0.2,
});

export default function App() {
  const location = useLocation();

  useEffect(() => {
    NProgress.start();

    const timer = setTimeout(() => {
      NProgress.done();
    }, 100);

    return () => {
      clearTimeout(timer);
      NProgress.done();
    };
  }, [location.pathname]);

  return (
    <ToastProvider>
      <ScrollToTop />

      <Suspense fallback={<PageLoader />}>
        <Routes>

          {/* ================= ADMIN ================= */}

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

          {/* Media Library */}
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
              <ProtectedRoute allowedRoles={["super_admin"]}>
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

          {/* ================= PUBLIC ================= */}

          <Route element={<Layout />}>

            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/:slug" element={<EventDetails />} />
            <Route path="/team" element={<Team />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogDetails />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/join" element={<JoinClub />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/register/:eventId" element={<Register />} />
            <Route path="*" element={<NotFound />} />

          </Route>

        </Routes>
      </Suspense>
    </ToastProvider>
  );
}