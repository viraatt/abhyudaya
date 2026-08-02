import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";

import Layout from "./components/Layout.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";

import Home from "./pages/Home.jsx";
import About from "./pages/About.jsx";
import Events from "./pages/Events.jsx";
import EventDetails from "./pages/EventDetails.jsx";
import Team from "./pages/Team.jsx";
import Gallery from "./pages/Gallery.jsx";
import Blog from "./pages/Blog.jsx";
import BlogDetails from "./pages/BlogDetails.jsx";
import Contact from "./pages/Contact.jsx";
import JoinClub from "./pages/JoinClub.jsx";
import NotFound from "./pages/NotFound.jsx";

/* ================= ADMIN ================= */

import Login from "./Admin/pages/login.jsx";
import Dashboard from "./Admin/pages/dashboard.jsx";
import AdminEvents from "./Admin/pages/Events.jsx";
import Users from "./Admin/pages/Users.jsx";

import BlogManager from "./Admin/pages/BlogManager.jsx";
import AddBlog from "./Admin/pages/AddBlog.jsx";
import EditBlog from "./Admin/pages/EditBlog.jsx";

import ProtectedRoute from "./Admin/pages/components/ProtectedRoute.jsx";

import NProgress from "nprogress";
import "nprogress/nprogress.css";

NProgress.configure({ showSpinner: false, speed: 200 });

export default function App() {
  const location = useLocation();

  useEffect(() => {
    NProgress.start();
    NProgress.done();
  }, [location.pathname]);

  return (
    <>
      <ScrollToTop />

      <Routes>

        {/* ================= ADMIN ================= */}

        <Route path="/admin/login" element={<Login />} />

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

        {/* ================= PUBLIC WEBSITE ================= */}

        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:slug" element={<EventDetails />} />
          <Route path="/team" element={<Team />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:id" element={<BlogDetails />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/join" element={<JoinClub />} />
          <Route path="*" element={<NotFound />} />
        </Route>

      </Routes>
    </>
  );
}