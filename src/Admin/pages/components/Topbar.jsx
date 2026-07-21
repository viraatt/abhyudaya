import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../../../Firebase/firebase";

export default function Topbar() {
  const navigate = useNavigate();

  const logout = async () => {
    await signOut(auth);
    navigate("/admin/login");
  };

  return (
    <header className="topbar">
      <div>
        <h1>Dashboard</h1>
        <p>Welcome back, Admin 👋</p>
      </div>

      <button className="logout-btn" onClick={logout}>
        Logout
      </button>
    </header>
  );
}