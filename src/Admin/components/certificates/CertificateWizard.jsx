import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import PropTypes from "prop-types";
import CertificateStepper from "./CertificateStepper";
import TemplateUploader from "./TemplateUploader";
import TemplateEditor from "./TemplateEditor";
import DataUploader from "./DataUploader";
import DataMapper from "./DataMapper";
import CertificatePreview from "./CertificatePreview";
import GenerationProgress from "./GenerationProgress";
import { autoMapFields } from "../../../utils/fieldMappingHelper";
import {
  saveCertificateTemplate,
  getCertificateTemplateById,
} from "../../../Firebase/certificateTemplateService";
import { getEventsPage } from "../../../Firebase/eventService";
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
  const [searchParams] = useSearchParams();
  const templateIdParam = searchParams.get("templateId");
  const stepParam = searchParams.get("step");

  const [currentStep, setCurrentStep] = useState(1);
  const [maxUnlockedStep, setMaxUnlockedStep] = useState(1);

  // Step 1: Template
  const [template, setTemplate] = useState(null);

  // Step 2: Dynamic Fields
  const [fields, setFields] = useState(DEFAULT_INITIAL_FIELDS);

  // Step 3: Participant Dataset & Mapping
  const [dataset, setDataset] = useState(null);
  const [mapping, setMapping] = useState({});

  // Meta information & associated event
  const [metaInfo, setMetaInfo] = useState({
    templateId: "",
    title: "Abhyudaya Certificate Batch",
    eventName: "Abhyudaya 2026",
    eventDate: "09-09-2026",
    certificateType: "Participation",
  });

  const [eventsList, setEventsList] = useState([]);
  const [saveStatus, setSaveStatus] = useState("");

  // Load available events for dropdown association
  useEffect(() => {
    let isMounted = true;
    getEventsPage({ pageSize: 50, onlyPublished: false })
      .then((res) => {
        if (isMounted) setEventsList(res.events || []);
      })
      .catch((err) => console.warn("Could not load events list:", err));
    return () => {
      isMounted = false;
    };
  }, []);

  // Preload template if templateId provided in URL
  useEffect(() => {
    if (!templateIdParam) return;
    let isMounted = true;
    getCertificateTemplateById(templateIdParam)
      .then((tpl) => {
        if (!isMounted || !tpl) return;
        setTemplate({
          id: tpl.id,
          previewUrl: tpl.templateUrl,
          storagePath: tpl.storagePath || "",
          originalWidth: Number(tpl.originalWidth) || 1920,
          originalHeight: Number(tpl.originalHeight) || 1080,
        });

        if (Array.isArray(tpl.fields) && tpl.fields.length > 0) {
          setFields(tpl.fields);
        }

        setMetaInfo((prev) => ({
          ...prev,
          templateId: tpl.id,
          title: tpl.title || prev.title,
          eventName: tpl.eventName || prev.eventName,
          eventDate: tpl.eventDate || prev.eventDate,
          certificateType: tpl.certificateType || prev.certificateType,
        }));

        const targetStep = stepParam ? Math.min(5, Math.max(1, Number(stepParam))) : 2;
        setMaxUnlockedStep((prev) => Math.max(prev, targetStep));
        setCurrentStep(targetStep);
      })
      .catch((err) => {
        console.error("Error loading template from URL parameter:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [templateIdParam, stepParam]);

  // Step transitions
  const unlockStep = (step) => {
    setMaxUnlockedStep((prev) => Math.max(prev, step));
    setCurrentStep(step);
  };

  // Step 1 handlers
  const handleTemplateLoaded = (templateData) => {
    setTemplate(templateData);
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
    const initialMapping = autoMapFields(fields, parsedData.columns);
    setMapping(initialMapping);
  };

  const handleClearData = () => {
    setDataset(null);
    setMapping({});
  };

  // Save template configuration to Cloud Firestore
  const handleSaveTemplate = async () => {
    if (!template) return;
    setSaveStatus("saving");
    try {
      const savedId = await saveCertificateTemplate({
        id: metaInfo.templateId || undefined,
        title: metaInfo.title || "Certificate Template",
        eventName: metaInfo.eventName,
        eventDate: metaInfo.eventDate,
        certificateType: metaInfo.certificateType,
        templateUrl: template.previewUrl || "",
        storagePath: template.storagePath || "",
        originalWidth: template.originalWidth,
        originalHeight: template.originalHeight,
        fields,
        status: "active",
      });

      setMetaInfo((prev) => ({ ...prev, templateId: savedId }));
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(""), 3500);
    } catch (err) {
      console.error("Failed to save template:", err);
      alert("Failed to save template: " + (err.message || "Unknown error"));
      setSaveStatus("error");
    }
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
          {saveStatus === "saving" && (
            <span style={{ fontSize: "12px", color: "var(--color-primary-400, #818cf8)", marginLeft: "10px" }}>
              ⏳ Saving template...
            </span>
          )}
          {saveStatus === "saved" && (
            <span style={{ fontSize: "12px", color: "#10b981", marginLeft: "10px" }}>
              ✓ Template saved to Cloud
            </span>
          )}
        </div>

        <div className="cert-topbar-actions" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {eventsList.length > 0 && (
            <select
              className="cert-meta-input"
              value={metaInfo.eventName}
              onChange={(e) => {
                const selectedTitle = e.target.value;
                const foundEvent = eventsList.find((ev) => ev.title === selectedTitle);
                setMetaInfo((prev) => ({
                  ...prev,
                  eventName: selectedTitle,
                  eventDate: foundEvent?.eventStartDate || prev.eventDate,
                }));
              }}
              title="Associated Event"
              style={{ maxWidth: "220px" }}
            >
              <option value="">Select Event...</option>
              {eventsList.map((ev) => (
                <option key={ev.id} value={ev.title}>
                  {ev.title} {ev.eventStartDate ? `(${ev.eventStartDate})` : ""}
                </option>
              ))}
              <option value={metaInfo.eventName}>{metaInfo.eventName || "Custom Event"}</option>
            </select>
          )}

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
            onSaveTemplate={handleSaveTemplate}
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
            onContinue={() => unlockStep(5)}
            eventName={metaInfo.eventName}
            eventDate={metaInfo.eventDate}
          />
        )}

        {/* Step 5: Real Certificate Generation & Download */}
        {currentStep === 5 && template && dataset && (
          <GenerationProgress
            template={template}
            fields={fields}
            dataset={dataset}
            mapping={mapping}
            metaInfo={metaInfo}
            onBack={() => setCurrentStep(4)}
          />
        )}
      </div>
    </div>
  );
}

CertificateWizard.propTypes = {
  onExit: PropTypes.func,
};
