const STEPS = [
  { id: 1, name: "Template", desc: "Upload Background" },
  { id: 2, name: "Fields", desc: "Set Text Elements" },
  { id: 3, name: "Data", desc: "Upload & Map Data" },
  { id: 4, name: "Preview", desc: "Review Samples" },
  { id: 5, name: "Generate", desc: "Create & Download" },
];

export default function CertificateStepper({ currentStep, onSelectStep, maxStepReached }) {
  return (
    <div className="cert-stepper-card">
      <ol className="cert-stepper-list">
        {STEPS.map((step, idx) => {
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          const canClick = step.id <= (maxStepReached || 1);

          return (
            <li key={step.id} style={{ display: "contents" }}>
              <button
                type="button"
                className={`cert-stepper-item ${isActive ? "active" : ""} ${
                  isCompleted ? "completed" : ""
                }`}
                disabled={!canClick}
                onClick={() => canClick && onSelectStep(step.id)}
                title={`Step ${step.id}: ${step.name}`}
              >
                <div className="cert-step-circle">
                  {isCompleted ? "✓" : step.id}
                </div>
                <div className="cert-step-info">
                  <span className="cert-step-num">Step {step.id}</span>
                  <span className="cert-step-title">{step.name}</span>
                </div>
              </button>

              {idx < STEPS.length - 1 && (
                <div
                  className={`cert-step-divider ${
                    currentStep > step.id ? "completed" : ""
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
