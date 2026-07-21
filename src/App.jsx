import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";

import Home from "./pages/Home.jsx";
import About from "./pages/About.jsx";
import Events from "./pages/Events.jsx";
import Team from "./pages/Team.jsx";
import Gallery from "./pages/Gallery.jsx";
import Contact from "./pages/Contact.jsx";
import JoinClub from "./pages/JoinClub.jsx";
import NotFound from "./pages/NotFound.jsx";

// ✅ Admin Imports
import Login from "./Admin/pages/login.jsx";
import Dashboard from "./Admin/pages/dashboard.jsx";
import AdminEvents from "./Admin/pages/Events.jsx";
import ProtectedRoute from "./Admin/pages/components/ProtectedRoute.jsx";

export default function App() {
  return (
    <>
      <ScrollToTop />

      <Routes>

        {/* ================= ADMIN ================= */}

        <Route path="/admin/login" element={<Login />} />

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/events"
          element={
            <ProtectedRoute>
              <AdminEvents />
            </ProtectedRoute>
          }
        />

        {/* ================= PUBLIC WEBSITE ================= */}

        <Route element={<Layout />}>

          <Route path="/" element={<Home />} />

          <Route path="/about" element={<About />} />

          <Route path="/events" element={<Events />} />

          <Route path="/team" element={<Team />} />

          <Route path="/gallery" element={<Gallery />} />

          <Route path="/contact" element={<Contact />} />

          <Route path="/join" element={<JoinClub />} />

          <Route path="*" element={<NotFound />} />

        </Route>

      </Routes>
    </>
  );
}