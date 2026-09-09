import { useState } from "react";
import PropTypes from "prop-types";
import CertificateStepper from "./CertificateStepper";
import TemplateUploader from "./TemplateUploader";
import TemplateEditor from "./TemplateEditor";
import DataUploader from "./DataUploader";
import DataMapper from "./DataMapper";
import CertificatePreview from "./CertificatePreview";
import { autoMapFields } from "../../../utils/fieldMappingHelper";
import "./CertificateGenerator.css";

// Initial default fields if admin doesn't configure from scratch
const DEFAULT_INITIAL_FIELDS = [
  {
    id: "field_name",
    label: "Participant Name",
    variable: "{{name}}",
    x: 300,
    y: 420,
    width: 1320,
    height: 100,
    fontFamily: "'Cinzel', serif",
    fontSize: 48,
    fontWeight: "700",
    color: "#1e293b",
    align: "center",
    required: true,
    defaultValue: "Ishan Shukla",
  },
  {
    id: "field_event",
    label: "Event Name",
    variable: "{{event}}",
    x: 400,
    y: 560,
    width: 1120,
    height: 70,
    fontFamily: "'Montserrat', sans-serif",
    fontSize: 32,
    fontWeight: "600",
    color: "#334155",
    align: "center",
    required: true,
    defaultValue: "Abhyudaya 2026",
  },
  {
    id: "field_position",
    label: "Position / Award",
    variable: "{{position}}",
    x: 500,
    y: 650,
    width: 920,
    height: 60,
    fontFamily: "'Inter', sans-serif",
    fontSize: 26,
    fontWeight: "500",
    color: "#475569",
    align: "center",
    required: true,
    defaultValue: "Winner",
  },
  {
    id: "field_date",
    label: "Event Date",
    variable: "{{date}}",
    x: 300,
    y: 800,
    width: 400,
    height: 50,
    fontFamily: "'Inter', sans-serif",
    fontSize: 22,
    fontWeight: "400",
    color: "#64748b",
    align: "center",
    required: true,
    defaultValue: "09-09-2026",
  },
  {
    id: "field_rollno",
    label: "Roll Number",
    variable: "{{rollNo}}",
    x: 1220,
    y: 800,
    width: 400,
    height: 50,
    fontFamily: "'Inter', sans-serif",
    fontSize: 22,
    fontWeight: "500",
    color: "#64748b",
    align: "center",
    required: true,
    defaultValue: "2301234567",
  },
];

export default function CertificateWizard({ onExit }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [maxUnlockedStep, setMaxUnlockedStep] = useState(1);

  // Step 1: Template
  const [template, setTemplate] = useState(null);

  // Step 2: Dynamic Fields
  const [fields, setFields] = useState(DEFAULT_INITIAL_FIELDS);

  // Step 3: Participant Dataset & Mapping
  const [dataset, setDataset] = useState(null);
  const [mapping, setMapping] = useState({});

  // Meta information
  const [metaInfo, setMetaInfo] = useState({
    title: "Abhyudaya Certificate Batch",
    eventName: "Abhyudaya 2026",
    eventDate: "09-09-2026",
    certificateType: "Participation",
  });

  // Step transitions
  const unlockStep = (step) => {
    setMaxUnlockedStep((prev) => Math.max(prev, step));
    setCurrentStep(step);
  };

  // Step 1 handlers
  const handleTemplateLoaded = (templateData) => {
    setTemplate(templateData);
    // Recalculate default positions relative to original image size if needed
    if (templateData.originalWidth) {
      const origW = templateData.originalWidth;

      setFields((prev) =>
        prev.map((f) => ({
          ...f,
          x: Math.round((origW - f.width) / 2),
        }))
      );
    }
  };

  // Step 3: When spreadsheet data is parsed
  const handleDataParsed = (parsedData) => {
    setDataset(parsedData);
    // Execute smart auto-mapping between template fields and spreadsheet columns
    const initialMapping = autoMapFields(fields, parsedData.columns);
    setMapping(initialMapping);
  };

  const handleClearData = () => {
    setDataset(null);
    setMapping({});
  };

  return (
    <div className="cert-wizard-container">
      {/* Wizard Header */}
      <div className="cert-wizard-topbar">
        <div className="cert-wizard-meta">
          <button
            type="button"
            className="cert-btn-back-link"
            onClick={onExit}
            title="Return to Certificates"
          >
            ← Back to Certificates
          </button>
          <h2>Bulk Certificate Generator</h2>
          <span className="cert-meta-tag">
            {metaInfo.eventName || "New Batch"}
          </span>
        </div>

        <div className="cert-topbar-actions">
          <input
            type="text"
            className="cert-meta-input"
            value={metaInfo.title}
            onChange={(e) =>
              setMetaInfo((prev) => ({ ...prev, title: e.target.value }))
            }
            placeholder="Batch title..."
            title="Certificate Batch Title"
          />
        </div>
      </div>

      {/* Stepper Navigation */}
      <CertificateStepper
        currentStep={currentStep}
        onStepClick={(s) => setCurrentStep(s)}
        maxUnlockedStep={maxUnlockedStep}
      />

      {/* Wizard Step Content */}
      <div className="cert-wizard-content">
        {/* Step 1: Upload Template */}
        {currentStep === 1 && (
          <TemplateUploader
            template={template}
            onTemplateLoaded={handleTemplateLoaded}
            onContinue={() => unlockStep(2)}
          />
        )}

        {/* Step 2: Design Text Fields */}
        {currentStep === 2 && template && (
          <TemplateEditor
            template={template}
            fields={fields}
            onFieldsChange={setFields}
            onBack={() => setCurrentStep(1)}
            onContinue={() => {
              // If dataset already exists, refresh auto-mapping for any newly added fields
              if (dataset?.columns) {
                setMapping((prev) => ({
                  ...autoMapFields(fields, dataset.columns),
                  ...prev,
                }));
              }
              unlockStep(3);
            }}
          />
        )}

        {/* Step 3: Upload Participant Data & Automatic Mapping */}
        {currentStep === 3 && (
          <div className="cert-step-3-wrapper">
            <DataUploader
              dataset={dataset}
              onDataParsed={handleDataParsed}
              onClearData={handleClearData}
            />

            {dataset && (
              <DataMapper
                fields={fields}
                dataset={dataset}
                mapping={mapping}
                onMappingChange={setMapping}
                onBack={() => setCurrentStep(2)}
                onContinue={() => unlockStep(4)}
                eventName={metaInfo.eventName}
                eventDate={metaInfo.eventDate}
              />
            )}
          </div>
        )}

        {/* Step 4: Live Certificate Preview */}
        {currentStep === 4 && template && dataset && (
          <CertificatePreview
            template={template}
            fields={fields}
            dataset={dataset}
            mapping={mapping}
            onBack={() => setCurrentStep(3)}
            eventName={metaInfo.eventName}
            eventDate={metaInfo.eventDate}
          />
        )}
      </div>
    </div>
  );
}

CertificateWizard.propTypes = {
  onExit: PropTypes.func,
};
