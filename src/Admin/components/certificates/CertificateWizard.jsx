import { useState, useEffect, useRef, useMemo } from "react";
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
import { getCachedTemplate, setCachedTemplate } from "../../../utils/templateCache";
import {
  saveCertificateTemplate,
  getCertificateTemplateById,
  getCertificateTemplatesByEventId,
} from "../../../Firebase/certificateTemplateService";
import { getAllEvents } from "../../../Firebase/eventService";
import "./CertificateGenerator.css";

export default function CertificateWizard({ onExit }) {
  const [searchParams] = useSearchParams();
  const templateIdParam = searchParams.get("templateId");
  const stepParam = searchParams.get("step");

  const [currentStep, setCurrentStep] = useState(1);
  const [maxUnlockedStep, setMaxUnlockedStep] = useState(1);

  // Separate Event and Batch state
  const [selectedEventId, setSelectedEventId] = useState("");
  const [batchName, setBatchName] = useState("Abhyudaya Certificate Batch");
  const isBatchNameCustomRef = useRef(false);

  // Events list & loading states
  const [eventsList, setEventsList] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState("");

  // Templates belonging to currently selected event
  const [eventTemplates, setEventTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

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
    eventId: "",
    eventName: "",
    eventDate: "",
    certificateType: "Participation",
  });

  const [saveStatus, setSaveStatus] = useState("");

  const activeRequestIdRef = useRef(0);
  const abortControllerRef = useRef(null);

  // Memoized currently selected event object
  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return null;
    return eventsList.find((ev) => ev.id === selectedEventId) || null;
  }, [eventsList, selectedEventId]);

  // Load all available events with error handling
  useEffect(() => {
    let isMounted = true;
    setEventsLoading(true);
    setEventsError("");
    getAllEvents()
      .then((events) => {
        if (!isMounted) return;
        const validEvents = Array.isArray(events) ? events : [];
        setEventsList(validEvents);
        setEventsLoading(false);
      })
      .catch((err) => {
        console.warn("Could not load events list:", err);
        if (isMounted) {
          setEventsError("Failed to load events list.");
          setEventsLoading(false);
        }
      });
    return () => { isMounted = false; };
  }, []);

  // Fetch templates for currently selected event
  useEffect(() => {
    if (!selectedEventId) {
      setEventTemplates([]);
      return;
    }
    let isMounted = true;
    setTemplatesLoading(true);
    const evTitle = selectedEvent?.title || "";
    getCertificateTemplatesByEventId(selectedEventId, evTitle)
      .then((tpls) => {
        if (isMounted) setEventTemplates(tpls || []);
      })
      .catch((err) => console.warn("Failed to load templates for event:", err))
      .finally(() => {
        if (isMounted) setTemplatesLoading(false);
      });
    return () => { isMounted = false; };
  }, [selectedEventId, selectedEvent?.title]);

  // Preload template if templateId in URL
  useEffect(() => {
    if (!templateIdParam) return;

    const currentReqId = ++activeRequestIdRef.current;
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch {}
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Check if template is already fully cached in memory (instant 0ms load)
    const cachedTpl = getCachedTemplate(templateIdParam);

    getCertificateTemplateById(templateIdParam)
      .then(async (tpl) => {
        if (currentReqId !== activeRequestIdRef.current || !tpl) return;

        let previewUrl = tpl.templateUrl;
        let blob = cachedTpl?.blob || null;
        let arrayBuffer = cachedTpl?.arrayBuffer || null;

        if (cachedTpl?.previewUrl) {
          previewUrl = cachedTpl.previewUrl;
        } else if (tpl.templateUrl) {
          try {
            const loaded = await loadRemoteTemplate(
              tpl.templateUrl,
              {
                id: tpl.id,
                originalWidth: tpl.originalWidth,
                originalHeight: tpl.originalHeight,
                fileName: tpl.title || "template",
              },
              { signal: controller.signal }
            );
            if (currentReqId !== activeRequestIdRef.current) return;
            previewUrl = loaded.previewUrl;
            blob = loaded.blob;
            arrayBuffer = loaded.arrayBuffer;
          } catch (loadErr) {
            if (loadErr?.name === "AbortError" || controller.signal.aborted) {
              return; // Request intentionally superseded by another selection
            }
            console.warn("Failed to convert remote template to blob URL:", loadErr);
          }
        }

        if (currentReqId !== activeRequestIdRef.current) return;

        const tplObj = {
          id: tpl.id,
          previewUrl,
          blob,
          arrayBuffer,
          storageUrl: tpl.templateUrl,
          storagePath: tpl.storagePath || "",
          originalWidth: Number(tpl.originalWidth) || 1920,
          originalHeight: Number(tpl.originalHeight) || 1080,
        };

        setCachedTemplate(tpl.id, tplObj, [tpl.templateUrl]);
        setTemplate(tplObj);

        // Normalize elements — handles both v2 (elements[]) and old (fields[])
        const normalizedElements = normalizeTemplateElements(
          tpl,
          Number(tpl.originalWidth) || 1920,
          Number(tpl.originalHeight) || 1080
        );
        setElements(normalizedElements);

        let associatedEventId = tpl.eventId || "";
        if (!associatedEventId && tpl.eventName && eventsList.length > 0) {
          const matchEv = eventsList.find((ev) => ev.title === tpl.eventName);
          if (matchEv) associatedEventId = matchEv.id;
        }

        if (associatedEventId) {
          setSelectedEventId(associatedEventId);
        }

        if (!isBatchNameCustomRef.current && tpl.title) {
          setBatchName(tpl.title);
        }

        setMetaInfo((prev) => ({
          ...prev,
          templateId: tpl.id,
          eventId: associatedEventId || prev.eventId,
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
        if (err?.name === "AbortError") return;
        console.error("Error loading template from URL parameter:", err);
      });

    return () => {
      try {
        controller.abort();
      } catch {}
    };
  }, [templateIdParam, stepParam, eventsList]);

  // Reconcile template from URL with eventsList once events are loaded
  useEffect(() => {
    if (!selectedEventId && metaInfo.eventName && eventsList.length > 0) {
      const matchEv = eventsList.find(
        (ev) => ev.title === metaInfo.eventName || ev.id === metaInfo.eventId
      );
      if (matchEv) {
        setSelectedEventId(matchEv.id);
        setMetaInfo((prev) => ({
          ...prev,
          eventId: matchEv.id,
          eventName: matchEv.title,
          eventDate: matchEv.eventStartDate || prev.eventDate,
        }));
      }
    }
  }, [eventsList, metaInfo.eventName, metaInfo.eventId, selectedEventId]);

  // Event Switching Handler
  const handleEventChange = (newEventId) => {
    if (newEventId === selectedEventId) return;

    setSelectedEventId(newEventId);
    const foundEvent = eventsList.find((ev) => ev.id === newEventId);

    // If user hasn't manually customized batch name, update suggested batch title
    if (!isBatchNameCustomRef.current) {
      if (foundEvent) {
        const defaultTitle = `${foundEvent.title} Certificate Batch`;
        setBatchName(defaultTitle);
        setMetaInfo((prev) => ({ ...prev, title: defaultTitle }));
      } else {
        setBatchName("Abhyudaya Certificate Batch");
      }
    }

    // STATE RESET RULE:
    // Reset event-specific data (template, elements, dataset, mapping, step)
    if (template?.previewUrl && template.previewUrl.startsWith("blob:")) {
      revokeTemplatePreview(template.previewUrl);
    }
    setTemplate(null);
    setElements([]);
    setDataset(null);
    setMapping({});
    setCurrentStep(1);
    setMaxUnlockedStep(1);

    setMetaInfo((prev) => ({
      ...prev,
      templateId: "",
      eventId: newEventId,
      eventName: foundEvent ? foundEvent.title : "",
      eventDate: foundEvent?.eventStartDate || "",
    }));
  };

  // Batch Name Input Handler
  const handleBatchNameChange = (e) => {
    const val = e.target.value;
    isBatchNameCustomRef.current = true;
    setBatchName(val);
    setMetaInfo((prev) => ({ ...prev, title: val }));
  };

  // Select existing saved template for this event
  const handleSelectExistingTemplate = async (tpl) => {
    if (!tpl) return;
    const currentReqId = ++activeRequestIdRef.current;
    if (abortControllerRef.current) {
      try { abortControllerRef.current.abort(); } catch {}
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const cachedTpl = getCachedTemplate(tpl.id);
    let previewUrl = tpl.templateUrl;
    let blob = cachedTpl?.blob || null;
    let arrayBuffer = cachedTpl?.arrayBuffer || null;

    if (cachedTpl?.previewUrl) {
      previewUrl = cachedTpl.previewUrl;
    } else if (tpl.templateUrl) {
      try {
        const loaded = await loadRemoteTemplate(
          tpl.templateUrl,
          {
            id: tpl.id,
            originalWidth: tpl.originalWidth,
            originalHeight: tpl.originalHeight,
            fileName: tpl.title || "template",
          },
          { signal: controller.signal }
        );
        if (currentReqId !== activeRequestIdRef.current) return;
        previewUrl = loaded.previewUrl;
        blob = loaded.blob;
        arrayBuffer = loaded.arrayBuffer;
      } catch (loadErr) {
        if (loadErr?.name === "AbortError") return;
        console.warn("Failed to convert remote template to blob URL:", loadErr);
      }
    }

    if (currentReqId !== activeRequestIdRef.current) return;

    const tplObj = {
      id: tpl.id,
      previewUrl,
      blob,
      arrayBuffer,
      storageUrl: tpl.templateUrl,
      storagePath: tpl.storagePath || "",
      originalWidth: Number(tpl.originalWidth) || 1920,
      originalHeight: Number(tpl.originalHeight) || 1080,
    };

    setCachedTemplate(tpl.id, tplObj, [tpl.templateUrl]);
    setTemplate(tplObj);

    const normalizedElements = normalizeTemplateElements(
      tpl,
      Number(tpl.originalWidth) || 1920,
      Number(tpl.originalHeight) || 1080
    );
    setElements(normalizedElements);

    setMetaInfo((prev) => ({
      ...prev,
      templateId: tpl.id,
      eventId: selectedEventId,
      eventName: selectedEvent?.title || tpl.eventName || prev.eventName,
      eventDate: selectedEvent?.eventStartDate || tpl.eventDate || prev.eventDate,
      certificateType: tpl.certificateType || prev.certificateType,
    }));

    setMaxUnlockedStep((prev) => Math.max(prev, 2));
    setCurrentStep(2);
  };

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (template?.previewUrl && template.previewUrl.startsWith("blob:")) {
        revokeTemplatePreview(template.previewUrl);
      }
    };
  }, [template?.previewUrl]);

  const unlockStep = (step) => {
    if (!selectedEventId && step > 1) {
      alert("Please select an event before proceeding.");
      return;
    }
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

  // Save template to Firestore with eventId association
  const handleSaveTemplate = async () => {
    if (!template) return;
    if (!selectedEventId) {
      alert("Please select an event before saving a template.");
      return;
    }
    setSaveStatus("saving");
    try {
      const legacyFields = elementsToLegacyFields(elements);

      const savedId = await saveCertificateTemplate({
        id: metaInfo.templateId || template.id || undefined,
        title: batchName || metaInfo.title || "Certificate Template",
        eventId: selectedEventId,
        eventName: selectedEvent ? selectedEvent.title : metaInfo.eventName,
        eventDate: selectedEvent?.eventStartDate || metaInfo.eventDate,
        certificateType: metaInfo.certificateType || "Participation",
        templateUrl: template.storageUrl || template.previewUrl || "",
        storagePath: template.storagePath || "",
        originalWidth: template.originalWidth,
        originalHeight: template.originalHeight,
        elements,
        version: SCHEMA_VERSION,
        fields: legacyFields,
        status: "active",
      });

      setMetaInfo((prev) => ({ ...prev, templateId: savedId }));
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(""), 3500);

      // Refresh event templates list
      if (selectedEventId) {
        getCertificateTemplatesByEventId(selectedEventId, selectedEvent?.title || "")
          .then((tpls) => setEventTemplates(tpls || []))
          .catch(() => {});
      }
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
            {selectedEvent ? selectedEvent.title : "No Event Selected"}
          </span>
          {selectedEventId && (
            <span
              style={{
                fontSize: "0.75rem",
                color: "#94a3b8",
                marginLeft: "4px",
                fontFamily: "monospace",
              }}
              title="Firestore Event ID"
            >
              ({selectedEventId})
            </span>
          )}
        </div>

        <div className="cert-topbar-actions" style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label
              htmlFor="wizardEventSelect"
              style={{ fontSize: "0.85rem", fontWeight: "600", color: "#475569", whiteSpace: "nowrap" }}
            >
              Event:
            </label>
            <select
              id="wizardEventSelect"
              className="cert-meta-input"
              value={selectedEventId}
              onChange={(e) => handleEventChange(e.target.value)}
              title="Associated Event"
              style={{ minWidth: "190px", maxWidth: "240px" }}
              disabled={eventsLoading}
            >
              <option value="">{eventsLoading ? "Loading events..." : "Select Event..."}</option>
              {eventsList.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} {ev.eventStartDate ? `(${ev.eventStartDate})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label
              htmlFor="wizardBatchNameInput"
              style={{ fontSize: "0.85rem", fontWeight: "600", color: "#475569", whiteSpace: "nowrap" }}
            >
              Certificate Batch:
            </label>
            <input
              id="wizardBatchNameInput"
              type="text"
              className="cert-meta-input"
              value={batchName}
              onChange={handleBatchNameChange}
              placeholder="Certificate Batch Title..."
              title="Certificate Batch Title"
              style={{ minWidth: "220px" }}
            />
          </div>
        </div>
      </div>

      {eventsError && (
        <div className="cert-alert cert-alert--error" style={{ margin: "0.5rem 1.5rem" }}>
          <span>⚠️ {eventsError}</span>
        </div>
      )}

      {/* Stepper */}
      <CertificateStepper
        currentStep={currentStep}
        onStepClick={(s) => {
          if (!selectedEventId && s > 1) {
            alert("Please select an event to continue.");
            return;
          }
          setCurrentStep(s);
        }}
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
            selectedEventId={selectedEventId}
            selectedEvent={selectedEvent}
            eventTemplates={eventTemplates}
            onSelectExistingTemplate={handleSelectExistingTemplate}
            templatesLoading={templatesLoading}
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
                eventName={selectedEvent?.title || metaInfo.eventName}
                eventDate={selectedEvent?.eventStartDate || metaInfo.eventDate}
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
            eventId={selectedEventId}
            eventName={selectedEvent?.title || metaInfo.eventName}
            eventDate={selectedEvent?.eventStartDate || metaInfo.eventDate}
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
            selectedEventId={selectedEventId}
            selectedEvent={selectedEvent}
            batchName={batchName}
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
