import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import CertificateStepper from "./CertificateStepper";
import TemplateUploader from "./TemplateUploader";
import TemplateEditor from "./TemplateEditor";
import DataMapper from "./DataMapper";
import CertificatePreview from "./CertificatePreview";
import GenerationProgress from "./GenerationProgress";
import { getCertificateTemplateById } from "../../../Firebase/certificateTemplateService";
import { DEFAULT_TEMPLATE_FIELDS } from "../../../utils/certificateRenderer";
import "./CertificateGenerator.css";

export default function CertificateWizard() {
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [maxStepReached, setMaxStepReached] = useState(1);
  const [loadingTemplate, setLoadingTemplate] = useState(() =>
    Boolean(new URLSearchParams(window.location.search).get("templateId"))
  );

  // Template & Event Configuration
  const [templateConfig, setTemplateConfig] = useState({
    templateFile: null,
    templateUrl: "",
    fileUrl: "",
    storagePath: "",
    savedTemplateId: "",
    templateId: "",
    templateName: "",
    name: "",
    eventId: "",
    eventName: "",
    eventDate: "",
    certificateType: "Participation",
    width: 1920,
    height: 1080,
    dimensions: { width: 1920, height: 1080 },
    fields: DEFAULT_TEMPLATE_FIELDS,
    status: "draft",
  });

  // Uploaded Participant Dataset
  const [dataset, setDataset] = useState({
    fileName: "",
    totalRows: 0,
    columns: [],
    rows: [],
  });

  // Field Mapping (fieldId -> columnName / special action)
  const [dataMapping, setDataMapping] = useState({
    field_name: "name",
    field_roll: "rollNo",
    field_event: "__fixed_event__",
    field_date: "__fixed_date__",
    field_id: "__auto_id__",
  });

  // Reopen existing template if templateId is in URL query parameters
  useEffect(() => {
    const templateIdParam = searchParams.get("templateId");
    if (!templateIdParam) return;

    let isMounted = true;

    getCertificateTemplateById(templateIdParam)
      .then((tpl) => {
        if (!isMounted || !tpl) return;
        setTemplateConfig({
          templateId: tpl.id,
          savedTemplateId: tpl.id,
          templateName: tpl.name,
          name: tpl.name,
          eventId: tpl.eventId || "",
          eventName: tpl.eventName || "",
          eventDate: tpl.eventDate || "",
          certificateType: tpl.certificateType || "Participation",
          fileUrl: tpl.fileUrl || tpl.templateUrl,
          templateUrl: tpl.fileUrl || tpl.templateUrl,
          storagePath: tpl.storagePath || "",
          templateFile: null,
          width: tpl.width || 1920,
          height: tpl.height || 1080,
          dimensions: { width: tpl.width || 1920, height: tpl.height || 1080 },
          fields: tpl.fields || DEFAULT_TEMPLATE_FIELDS,
          status: tpl.status || "published",
        });
        setCurrentStep(2);
        setMaxStepReached(2);
      })
      .catch((err) => {
        console.error("Failed to restore template by ID:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingTemplate(false);
      });

    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  const goToStep = (step) => {
    setCurrentStep(step);
    if (step > maxStepReached) {
      setMaxStepReached(step);
    }
  };

  const handleUpdateConfig = (updates) => {
    setTemplateConfig((prev) => ({ ...prev, ...updates }));
  };

  const handleReset = () => {
    setCurrentStep(1);
    setMaxStepReached(1);
    setTemplateConfig({
      templateFile: null,
      templateUrl: "",
      fileUrl: "",
      storagePath: "",
      savedTemplateId: "",
      templateId: "",
      templateName: "",
      name: "",
      eventId: "",
      eventName: "",
      eventDate: "",
      certificateType: "Participation",
      width: 1920,
      height: 1080,
      dimensions: { width: 1920, height: 1080 },
      fields: DEFAULT_TEMPLATE_FIELDS,
      status: "draft",
    });
    setDataset({
      fileName: "",
      totalRows: 0,
      columns: [],
      rows: [],
    });
    setDataMapping({
      field_name: "name",
      field_roll: "rollNo",
      field_event: "__fixed_event__",
      field_date: "__fixed_date__",
      field_id: "__auto_id__",
    });
  };

  if (loadingTemplate) {
    return (
      <div className="cert-generator-container">
        <div className="cert-wizard-body" style={{ alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
          <h4>Loading Saved Template from Firestore...</h4>
        </div>
      </div>
    );
  }

  return (
    <div className="cert-generator-container">
      {/* 5-Step Stepper */}
      <CertificateStepper
        currentStep={currentStep}
        onSelectStep={goToStep}
        maxStepReached={maxStepReached}
      />

      {/* Dynamic Step View */}
      <div className="cert-wizard-body">
        {currentStep === 1 && (
          <TemplateUploader
            templateConfig={templateConfig}
            onUpdateConfig={handleUpdateConfig}
            onNext={() => goToStep(2)}
          />
        )}

        {currentStep === 2 && (
          <TemplateEditor
            templateConfig={templateConfig}
            onUpdateConfig={handleUpdateConfig}
            onNext={() => goToStep(3)}
            onBack={() => goToStep(1)}
          />
        )}

        {currentStep === 3 && (
          <DataMapper
            templateConfig={templateConfig}
            dataset={dataset}
            dataMapping={dataMapping}
            onDatasetParsed={setDataset}
            onUpdateMapping={setDataMapping}
            onNext={() => goToStep(4)}
            onBack={() => goToStep(2)}
          />
        )}

        {currentStep === 4 && (
          <CertificatePreview
            templateConfig={templateConfig}
            dataset={dataset}
            dataMapping={dataMapping}
            onNext={() => goToStep(5)}
            onBack={() => goToStep(3)}
          />
        )}

        {currentStep === 5 && (
          <GenerationProgress
            templateConfig={templateConfig}
            dataset={dataset}
            dataMapping={dataMapping}
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  );
}
