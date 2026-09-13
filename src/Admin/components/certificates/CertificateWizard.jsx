import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import PropTypes from "prop-types";
import CertificateStepper from "./CertificateStepper";
import TemplateUploader from "./TemplateUploader";
import CertificateDesigner from "./CertificateDesigner";
import DataUploader from "./DataUploader";
import DataMapper from "./DataMapper";
import CertificatePreview from "./CertificatePreview";
import GenerationProgress from "./GenerationProgress";
import {
  normalizeTemplateElements,
  elementsToLegacyFields,
  SCHEMA_VERSION,
} from "./designer/elementSchema";
import { autoMapFields, autoMapElements } from "../../../utils/fieldMappingHelper";
import { loadRemoteTemplate, revokeTemplatePreview } from "../../../utils/pdfTemplateHelper";
import {
  saveCertificateTemplate,
  getCertificateTemplateById,
} from "../../../Firebase/certificateTemplateService";
import { getEventsPage } from "../../../Firebase/eventService";
import "./CertificateGenerator.css";

export default function CertificateWizard({ onExit }) {
  const [searchParams] = useSearchParams();
  const templateIdParam = searchParams.get("templateId");
  const stepParam = searchParams.get("step");

  const [currentStep, setCurrentStep] = useState(1);
  const [maxUnlockedStep, setMaxUnlockedStep] = useState(1);

  // Step 1: Template background
  const [template, setTemplate] = useState(null);

  // Step 2: Elements (new v2 schema)
  const [elements, setElements] = useState([]);

  // Step 3: Participant data & mapping
  const [dataset, setDataset] = useState(null);
  const [mapping, setMapping] = useState({});

  // Meta information
  const [metaInfo, setMetaInfo] = useState({
    templateId: "",
    title: "Abhyudaya Certificate Batch",
    eventName: "Abhyudaya 2026",
    eventDate: "09-09-2026",
    certificateType: "Participation",
  });

  const [eventsList, setEventsList] = useState([]);
  const [saveStatus, setSaveStatus] = useState("");

  // Load available events
  useEffect(() => {
    let isMounted = true;
    getEventsPage({ pageSize: 50, onlyPublished: false })
      .then((res) => { if (isMounted) setEventsList(res.events || []); })
      .catch((err) => console.warn("Could not load events list:", err));
    return () => { isMounted = false; };
  }, []);

  // Preload template if templateId in URL
  useEffect(() => {
    if (!templateIdParam) return;
    let isMounted = true;
    getCertificateTemplateById(templateIdParam)
      .then(async (tpl) => {
        if (!isMounted || !tpl) return;

        let previewUrl = tpl.templateUrl;
        let blob = null;

        if (tpl.templateUrl) {
          try {
            const loaded = await loadRemoteTemplate(tpl.templateUrl, {
              originalWidth: tpl.originalWidth,
              originalHeight: tpl.originalHeight,
              fileName: tpl.title || "template",
            });
            previewUrl = loaded.previewUrl;
            blob = loaded.blob;
          } catch (loadErr) {
            console.warn("Failed to convert remote template to blob URL:", loadErr);
          }
        }

        const tplObj = {
          id: tpl.id,
          previewUrl,
          blob,
          storageUrl: tpl.templateUrl,
          storagePath: tpl.storagePath || "",
          originalWidth: Number(tpl.originalWidth) || 1920,
          originalHeight: Number(tpl.originalHeight) || 1080,
        };

        setTemplate(tplObj);

        // Normalize elements — handles both v2 (elements[]) and old (fields[])
        const normalizedElements = normalizeTemplateElements(
          tpl,
          Number(tpl.originalWidth) || 1920,
          Number(tpl.originalHeight) || 1080
        );
        setElements(normalizedElements);

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
      .catch((err) => console.error("Error loading template from URL parameter:", err));

    return () => { isMounted = false; };
  }, [templateIdParam, stepParam]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (template?.previewUrl && template.previewUrl.startsWith("blob:")) {
        revokeTemplatePreview(template.previewUrl);
      }
    };
  }, [template?.previewUrl]);

  const unlockStep = (step) => {
    setMaxUnlockedStep((prev) => Math.max(prev, step));
    setCurrentStep(step);
  };

  // Step 1 handler
  const handleTemplateLoaded = (templateData) => {
    if (template?.previewUrl && template.previewUrl.startsWith("blob:") && template.previewUrl !== templateData?.previewUrl) {
      revokeTemplatePreview(template.previewUrl);
    }
    setTemplate(templateData);
    // Reset elements when a new template is loaded
    setElements([]);
  };

  // Step 3: When CSV/Excel data is parsed
  const handleDataParsed = (parsedData) => {
    setDataset(parsedData);
    // Auto-map using elements (v2) or fall back to legacy fields
    const legacyFields = elementsToLegacyFields(elements);
    const initialMapping = legacyFields.length > 0
      ? autoMapFields(legacyFields, parsedData.columns)
      : autoMapElements(elements, parsedData.columns);
    setMapping(initialMapping);
  };

  const handleClearData = () => {
    setDataset(null);
    setMapping({});
  };

  // Save template to Firestore
  const handleSaveTemplate = async () => {
    if (!template) return;
    setSaveStatus("saving");
    try {
      // Convert elements to legacy fields for backward compat with old consumers
      const legacyFields = elementsToLegacyFields(elements);

      const savedId = await saveCertificateTemplate({
        id: metaInfo.templateId || undefined,
        title: metaInfo.title || "Certificate Template",
        eventName: metaInfo.eventName,
        eventDate: metaInfo.eventDate,
        certificateType: metaInfo.certificateType,
        templateUrl: template.storageUrl || template.previewUrl || "",
        storagePath: template.storagePath || "",
        originalWidth: template.originalWidth,
        originalHeight: template.originalHeight,
        // v2: save elements array
        elements,
        version: SCHEMA_VERSION,
        // Backward compat: also save legacy fields[]
        fields: legacyFields,
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

  // Derive legacy fields for DataMapper, CertificatePreview, GenerationProgress
  const legacyFields = elementsToLegacyFields(elements);

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
            onChange={(e) => setMetaInfo((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Batch title..."
            title="Certificate Batch Title"
          />
        </div>
      </div>

      {/* Stepper */}
      <CertificateStepper
        currentStep={currentStep}
        onStepClick={(s) => setCurrentStep(s)}
        maxUnlockedStep={maxUnlockedStep}
      />

      {/* Step Content */}
      <div className="cert-wizard-content">
        {/* Step 1: Upload Template */}
        {currentStep === 1 && (
          <TemplateUploader
            template={template}
            onTemplateLoaded={handleTemplateLoaded}
            onContinue={() => unlockStep(2)}
          />
        )}

        {/* Step 2: Certificate Designer (NEW) */}
        {currentStep === 2 && template && (
          <CertificateDesigner
            template={template}
            elements={elements}
            onElementsChange={setElements}
            onBack={() => setCurrentStep(1)}
            onSaveTemplate={handleSaveTemplate}
            saveStatus={saveStatus}
            dataset={dataset}
            previewDataset={dataset}
            previewMapping={mapping}
            onContinue={() => {
              // Refresh auto-mapping for any newly added elements
              if (dataset?.columns) {
                const freshMapping = autoMapElements(elements, dataset.columns);
                setMapping((prev) => ({ ...freshMapping, ...prev }));
              }
              unlockStep(3);
            }}
          />
        )}

        {/* Step 3: Upload Participant Data */}
        {currentStep === 3 && (
          <div className="cert-step-3-wrapper">
            <DataUploader
              dataset={dataset}
              onDataParsed={handleDataParsed}
              onClearData={handleClearData}
            />

            {dataset && (
              <DataMapper
                fields={legacyFields}
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

        {/* Step 4: Live Preview */}
        {currentStep === 4 && template && dataset && (
          <CertificatePreview
            template={template}
            fields={legacyFields}
            elements={elements}
            dataset={dataset}
            mapping={mapping}
            onBack={() => setCurrentStep(3)}
            onContinue={() => unlockStep(5)}
            eventName={metaInfo.eventName}
            eventDate={metaInfo.eventDate}
          />
        )}

        {/* Step 5: Generate & Download */}
        {currentStep === 5 && template && dataset && (
          <GenerationProgress
            template={template}
            fields={legacyFields}
            elements={elements}
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
