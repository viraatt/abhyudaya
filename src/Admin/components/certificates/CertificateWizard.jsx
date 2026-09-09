import { useState } from "react";
import CertificateStepper from "./CertificateStepper";
import TemplateUploader from "./TemplateUploader";
import TemplateEditor from "./TemplateEditor";
import DataMapper from "./DataMapper";
import CertificatePreview from "./CertificatePreview";
import GenerationProgress from "./GenerationProgress";
import { DEFAULT_TEMPLATE_FIELDS } from "../../../utils/certificateRenderer";
import "./CertificateGenerator.css";

export default function CertificateWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [maxStepReached, setMaxStepReached] = useState(1);

  // Template & Event Configuration
  const [templateConfig, setTemplateConfig] = useState({
    templateFile: null,
    templateUrl: "",
    storagePath: "",
    savedTemplateId: "",
    templateName: "",
    eventId: "",
    eventName: "",
    eventDate: "",
    certificateType: "Participation",
    dimensions: { width: 1920, height: 1080 },
    fields: DEFAULT_TEMPLATE_FIELDS,
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
      storagePath: "",
      savedTemplateId: "",
      templateName: "",
      eventId: "",
      eventName: "",
      eventDate: "",
      certificateType: "Participation",
      dimensions: { width: 1920, height: 1080 },
      fields: DEFAULT_TEMPLATE_FIELDS,
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
