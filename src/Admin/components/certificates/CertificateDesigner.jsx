/**
 * CertificateDesigner — Canva-style certificate editor for Step 2 of the wizard.
 *
 * Features:
 *  - 3-panel layout: Elements+Layers | Canvas | Properties
 *  - 8 element types: text, dynamicText, paragraph, image, qr, signature, shape, line
 *  - Drag & resize on canvas with pixel-accurate scaling
 *  - Multi-select with Ctrl+click
 *  - Undo/Redo (50 state history)
 *  - Keyboard shortcuts: arrows, Delete, Ctrl+D, Escape
 *  - Design/Preview mode toggle with participant switcher
 *  - Layers panel with visibility, reorder, delete
 *  - Properties panel adapts to element type
 *  - Auto-extracts dynamic variables for DataMapper
 */

import { useState, useEffect, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import ElementToolbar from "./designer/ElementToolbar";
import LayersPanel from "./designer/LayersPanel";
import PropertiesPanel from "./designer/PropertiesPanel";
import CanvasStage from "./designer/CanvasStage";
import {
  generateElementId,
  extractVariablesFromElements,
  ELEMENT_TYPES,
} from "./designer/elementSchema";
import "./CertificateDesigner.css";

const MAX_UNDO_HISTORY = 50;

export default function CertificateDesigner({
  template,
  elements,
  onElementsChange,
  onBack,
  onContinue,
  onSaveTemplate,
  saveStatus,
  dataset, // for custom variable detection
  previewDataset, // for preview mode
  previewMapping,
}) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [isPreview, setIsPreview] = useState(false);
  const [previewRowIndex, setPreviewRowIndex] = useState(0);

  // Undo/Redo history
  const historyRef = useRef([elements]);
  const historyIndexRef = useRef(0);
  const skipHistoryRef = useRef(false);

  const originalWidth = Number(template?.originalWidth) || 1920;
  const originalHeight = Number(template?.originalHeight) || 1080;

  // Custom variables derived from uploaded dataset
  const customVariables = dataset?.columns
    ? dataset.columns.filter(
        (col) =>
          !["name", "event", "date", "position", "rollno", "rollNo", "certificateid", "certificateId"].includes(
            col.toLowerCase().replace(/\s/g, "")
          )
      )
    : [];

  // Push new state to history when elements change
  useEffect(() => {
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false;
      return;
    }
    const current = historyRef.current;
    const idx = historyIndexRef.current;
    const next = current.slice(0, idx + 1);
    next.push(elements);
    if (next.length > MAX_UNDO_HISTORY) next.shift();
    historyRef.current = next;
    historyIndexRef.current = next.length - 1;
  }, [elements]);

  const undo = useCallback(() => {
    const idx = historyIndexRef.current;
    if (idx <= 0) return;
    historyIndexRef.current = idx - 1;
    skipHistoryRef.current = true;
    onElementsChange(historyRef.current[idx - 1]);
  }, [onElementsChange]);

  const redo = useCallback(() => {
    const idx = historyIndexRef.current;
    const history = historyRef.current;
    if (idx >= history.length - 1) return;
    historyIndexRef.current = idx + 1;
    skipHistoryRef.current = true;
    onElementsChange(history[idx + 1]);
  }, [onElementsChange]);

  // ── Element CRUD ────────────────────────────────────────────────────────────

  const handleAddElement = useCallback((el) => {
    onElementsChange([...elements, el]);
    setSelectedIds([el.id]);
  }, [elements, onElementsChange]);

  const handleUpdateElement = useCallback((id, patch) => {
    onElementsChange(elements.map((el) => (el.id === id ? { ...el, ...patch } : el)));
  }, [elements, onElementsChange]);

  const handleDeleteElement = useCallback((id) => {
    onElementsChange(elements.filter((el) => el.id !== id));
    setSelectedIds((prev) => prev.filter((s) => s !== id));
  }, [elements, onElementsChange]);

  const handleDuplicateElement = useCallback((id) => {
    const el = elements.find((x) => x.id === id);
    if (!el) return;
    const dupe = {
      ...el,
      id: generateElementId(el.type),
      x: el.x + 20,
      y: el.y + 20,
    };
    onElementsChange([...elements, dupe]);
    setSelectedIds([dupe.id]);
  }, [elements, onElementsChange]);

  const handleToggleVisibility = useCallback((id) => {
    onElementsChange(
      elements.map((el) =>
        el.id === id ? { ...el, visible: el.visible === false ? true : false } : el
      )
    );
  }, [elements, onElementsChange]);

  const handleToggleLock = useCallback((id) => {
    onElementsChange(
      elements.map((el) =>
        el.id === id ? { ...el, locked: !el.locked } : el
      )
    );
  }, [elements, onElementsChange]);

  const handleReorder = useCallback((newOrder) => {
    onElementsChange(newOrder);
  }, [onElementsChange]);

  // ── Multi-select alignment ──────────────────────────────────────────────────

  const handleAlignMultiple = useCallback((direction) => {
    const selected = elements.filter((el) => selectedIds.includes(el.id));
    if (selected.length < 2) return;

    const xs = selected.map((el) => el.x);
    const ys = selected.map((el) => el.y);
    const rights = selected.map((el) => el.x + el.width);
    const bottoms = selected.map((el) => el.y + el.height);
    const mids = selected.map((el) => el.x + el.width / 2);
    const vmids = selected.map((el) => el.y + el.height / 2);

    let patches = {};

    if (direction === "left") {
      const minX = Math.min(...xs);
      selected.forEach((el) => { patches[el.id] = { x: minX }; });
    } else if (direction === "right") {
      const maxRight = Math.max(...rights);
      selected.forEach((el) => { patches[el.id] = { x: maxRight - el.width }; });
    } else if (direction === "hcenter") {
      const avgMid = mids.reduce((a, b) => a + b, 0) / mids.length;
      selected.forEach((el) => { patches[el.id] = { x: Math.round(avgMid - el.width / 2) }; });
    } else if (direction === "top") {
      const minY = Math.min(...ys);
      selected.forEach((el) => { patches[el.id] = { y: minY }; });
    } else if (direction === "bottom") {
      const maxBottom = Math.max(...bottoms);
      selected.forEach((el) => { patches[el.id] = { y: maxBottom - el.height }; });
    } else if (direction === "vcenter") {
      const avgVmid = vmids.reduce((a, b) => a + b, 0) / vmids.length;
      selected.forEach((el) => { patches[el.id] = { y: Math.round(avgVmid - el.height / 2) }; });
    }

    onElementsChange(
      elements.map((el) => (patches[el.id] ? { ...el, ...patches[el.id] } : el))
    );
  }, [elements, selectedIds, onElementsChange]);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName;
      const isInput = ["INPUT", "TEXTAREA", "SELECT"].includes(tag);

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }

      if (selectedIds.length === 0) return;

      // Duplicate
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        selectedIds.forEach(handleDuplicateElement);
        return;
      }

      // Escape → deselect
      if (e.key === "Escape") {
        setSelectedIds([]);
        return;
      }

      // Delete
      if ((e.key === "Delete" || e.key === "Backspace") && !isInput) {
        e.preventDefault();
        selectedIds.forEach(handleDeleteElement);
        return;
      }

      // Arrow nudge
      if (isInput) return;
      const step = e.shiftKey ? 10 : 1;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        for (const id of selectedIds) {
          const el = elements.find((x) => x.id === id);
          if (!el || el.locked) continue;
          if (e.key === "ArrowLeft") handleUpdateElement(id, { x: Math.round(el.x - step) });
          if (e.key === "ArrowRight") handleUpdateElement(id, { x: Math.round(el.x + step) });
          if (e.key === "ArrowUp") handleUpdateElement(id, { y: Math.round(el.y - step) });
          if (e.key === "ArrowDown") handleUpdateElement(id, { y: Math.round(el.y + step) });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIds, elements, handleUpdateElement, handleDeleteElement, handleDuplicateElement, undo, redo]);

  // ── Derived state ──────────────────────────────────────────────────────────
  const selectedElement = selectedIds.length === 1
    ? elements.find((el) => el.id === selectedIds[0]) || null
    : null;

  const previewRows = previewDataset?.rows || [];
  const previewRow = previewRows[previewRowIndex] || {};
  const previewOptions = {
    eventName: "",
    eventDate: "",
    rowIndex: previewRowIndex,
    certificateId: `PREVIEW-${String(previewRowIndex + 1).padStart(4, "0")}`,
  };

  // Build participant name list for preview switcher
  const participantNames = previewRows.map((row, idx) => {
    const nameKey = Object.keys(row).find((k) => k.toLowerCase().replace(/\s/g, "") === "name");
    return nameKey ? row[nameKey] : `Participant ${idx + 1}`;
  });

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  return (
    <div className="cdes-root">
      {/* ── TOP BAR ─────────────────────────────────────────────────────────── */}
      <div className="cdes-topbar">
        <div className="cdes-topbar-left">
          <span className="cdes-topbar-title">Certificate Designer</span>
          <span className="cdes-topbar-dims">
            {originalWidth} × {originalHeight}px
          </span>
        </div>

        <div className="cdes-topbar-center">
          {/* Undo / Redo */}
          <button
            className="cdes-topbar-btn"
            title="Undo (Ctrl+Z)"
            disabled={!canUndo}
            onClick={undo}
          >
            ↶ Undo
          </button>
          <button
            className="cdes-topbar-btn"
            title="Redo (Ctrl+Y)"
            disabled={!canRedo}
            onClick={redo}
          >
            ↷ Redo
          </button>

          <div className="cdes-topbar-divider" />

          {/* Design / Preview toggle */}
          <button
            className={`cdes-mode-btn ${!isPreview ? "active" : ""}`}
            onClick={() => setIsPreview(false)}
          >
            Design
          </button>
          <button
            className={`cdes-mode-btn ${isPreview ? "active" : ""}`}
            onClick={() => setIsPreview(true)}
            disabled={previewRows.length === 0}
            title={previewRows.length === 0 ? "Upload participant data in Step 3 first" : "Preview with real data"}
          >
            Preview
          </button>

          {/* Participant selector in preview mode */}
          {isPreview && previewRows.length > 1 && (
            <select
              className="cdes-participant-select"
              value={previewRowIndex}
              onChange={(e) => setPreviewRowIndex(Number(e.target.value))}
            >
              {participantNames.map((name, idx) => (
                <option key={idx} value={idx}>
                  {name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="cdes-topbar-right">
          {saveStatus === "saving" && <span className="cdes-save-status saving">⏳ Saving...</span>}
          {saveStatus === "saved" && <span className="cdes-save-status saved">✓ Saved</span>}
          {saveStatus === "error" && <span className="cdes-save-status error">⚠ Save failed</span>}

          {onSaveTemplate && (
            <button
              className="cdes-topbar-btn cdes-topbar-btn--save"
              onClick={onSaveTemplate}
              title="Save template to Cloud Firestore"
            >
              💾 Save
            </button>
          )}
        </div>
      </div>

      {/* ── 3-PANEL BODY ────────────────────────────────────────────────────── */}
      <div className="cdes-body">
        {/* Left Panel */}
        <div className="cdes-left-panel">
          <ElementToolbar
            canvasWidth={originalWidth}
            canvasHeight={originalHeight}
            elementCount={elements.length}
            customVariables={customVariables}
            onAddElement={handleAddElement}
          />
          <LayersPanel
            elements={elements}
            selectedIds={selectedIds}
            onSelect={setSelectedIds}
            onToggleVisibility={handleToggleVisibility}
            onToggleLock={handleToggleLock}
            onDelete={handleDeleteElement}
            onReorder={handleReorder}
          />
        </div>

        {/* Center: Canvas */}
        <div className="cdes-center-panel">
          <CanvasStage
            template={template}
            elements={elements}
            selectedIds={selectedIds}
            isPreview={isPreview}
            previewRow={isPreview ? previewRow : null}
            mapping={previewMapping || {}}
            previewOptions={previewOptions}
            onSelectIds={setSelectedIds}
            onUpdateElement={handleUpdateElement}
          />
        </div>

        {/* Right Panel */}
        <div className="cdes-right-panel">
          <PropertiesPanel
            element={selectedElement}
            selectedIds={selectedIds}
            elements={elements}
            canvasWidth={originalWidth}
            canvasHeight={originalHeight}
            onUpdate={handleUpdateElement}
            onDelete={handleDeleteElement}
            onDuplicate={handleDuplicateElement}
            onAlignMultiple={handleAlignMultiple}
            onReorder={handleReorder}
          />
        </div>
      </div>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <div className="cert-step-footer">
        <button
          type="button"
          className="admin-btn admin-btn--outline"
          onClick={onBack}
        >
          ← Back
        </button>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span className="cdes-footer-hint">
            {elements.filter((el) => el.visible !== false).length} element(s) ·{" "}
            {extractVariablesFromElements(elements).length} variable(s)
          </span>
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={onContinue}
          >
            Next: Upload Data →
          </button>
        </div>
      </div>
    </div>
  );
}

CertificateDesigner.propTypes = {
  template: PropTypes.object.isRequired,
  elements: PropTypes.array.isRequired,
  onElementsChange: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
  onContinue: PropTypes.func.isRequired,
  onSaveTemplate: PropTypes.func,
  saveStatus: PropTypes.string,
  dataset: PropTypes.object,
  previewDataset: PropTypes.object,
  previewMapping: PropTypes.object,
};
