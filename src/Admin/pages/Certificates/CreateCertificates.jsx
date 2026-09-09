import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import CertificateWizard from "../../components/certificates/CertificateWizard";
import "../style/admin.css";
import "./Certificates.css";

export default function CreateCertificates() {
  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main">
        <Topbar />

        <div className="dashboard-content">
          <div className="certs-page">
            {/* Header */}
            <div className="page-header">
              <div className="page-title">
                <h2>✨ Automated Certificate Generator</h2>
                <p>
                  Design templates, define text fields, bind participant data, and
                  generate high-resolution certificates in bulk with one click.
                </p>
              </div>

              <div className="header-actions">
                <Link
                  to="/admin/certificates"
                  className="admin-btn admin-btn--outline"
                >
                  ← Back to Certificates
                </Link>
              </div>
            </div>

            {/* 5-Step Generator Wizard */}
            <CertificateWizard />
          </div>
        </div>
      </div>
    </div>
  );
}
