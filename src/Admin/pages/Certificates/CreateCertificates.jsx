import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import CertificateWizard from "../../components/certificates/CertificateWizard";
import "../style/admin.css";
import "./Certificates.css";

export default function CreateCertificates() {
  const navigate = useNavigate();

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main">
        <Topbar />

        <div className="dashboard-content">
          <CertificateWizard onExit={() => navigate("/admin/certificates")} />
        </div>
      </div>
    </div>
  );
}
