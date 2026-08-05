import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";

import Layout from "./components/Layout.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";

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
const NotFound = lazy(() => import("./pages/NotFound.jsx"));

// ─────────────────────────────────────────────────────────────
// Lazy Loaded Admin Pages
// ─────────────────────────────────────────────────────────────
const Login = lazy(() => import("./Admin/pages/login.jsx"));
const Dashboard = lazy(() => import("./Admin/pages/dashboard.jsx"));
const AdminEvents = lazy(() => import("./Admin/pages/Events.jsx"));
const Users = lazy(() => import("./Admin/pages/Users.jsx"));
const BlogManager = lazy(() => import("./Admin/pages/BlogManager.jsx"));
const AddBlog = lazy(() => import("./Admin/pages/AddBlog.jsx"));
const EditBlog = lazy(() => import("./Admin/pages/EditBlog.jsx"));
const AdminTeam = lazy(() => import("./Admin/pages/Team.jsx"));
const AdminGallery = lazy(() => import("./Admin/pages/Gallery.jsx"));
const AdminContact = lazy(() => import("./Admin/pages/Contact.jsx"));

NProgress.configure({
  showSpinner: false,
  speed: 200,
});

export default function App() {
  const location = useLocation();

  useEffect(() => {
    NProgress.start();
    NProgress.done();
  }, [location.pathname]);

  return (
    <>
      <ScrollToTop />

      <Suspense fallback={<div style={{ padding: "2rem" }}>Loading...</div>}>
        <Routes>

          {/* ================= ADMIN ================= */}

          <Route
            path="/admin/login"
            element={<Login />}
          />

          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={["superadmin"]}>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/events"
            element={
              <ProtectedRoute allowedRoles={["superadmin"]}>
                <AdminEvents />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={["superadmin"]}>
                <Users />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/blogs"
            element={
              <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
                <BlogManager />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/blogs/add"
            element={
              <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
                <AddBlog />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/blogs/edit/:id"
            element={
              <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
                <EditBlog />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/team"
            element={
              <ProtectedRoute allowedRoles={["superadmin"]}>
                <AdminTeam />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/gallery"
            element={
              <ProtectedRoute allowedRoles={["superadmin"]}>
                <AdminGallery />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/contact"
            element={
              <ProtectedRoute allowedRoles={["superadmin"]}>
                <AdminContact />
              </ProtectedRoute>
            }
          />

          {/* ================= PUBLIC ================= */}

          <Route element={<Layout />}>

            <Route
              path="/"
              element={<Home />}
            />

            <Route
              path="/about"
              element={<About />}
            />

            <Route
              path="/events"
              element={<Events />}
            />

            <Route
              path="/events/:slug"
              element={<EventDetails />}
            />

            <Route
              path="/team"
              element={<Team />}
            />

            <Route
              path="/gallery"
              element={<Gallery />}
            />

            <Route
              path="/blog"
              element={<Blog />}
            />

            <Route
              path="/blog/:id"
              element={<BlogDetails />}
            />

            <Route
              path="/contact"
              element={<Contact />}
            />

            <Route
              path="/join"
              element={<JoinClub />}
            />

            <Route
              path="*"
              element={<NotFound />}
            />

          </Route>

        </Routes>
      </Suspense>
    </>
  );
}