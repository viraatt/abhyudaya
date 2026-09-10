import PropTypes from "prop-types";

const STEPS = [
  { step: 1, label: "Template", icon: "1", subtitle: "Background Design" },
  { step: 2, label: "Design Fields", icon: "2", subtitle: "Text & QR Placement" },
  { step: 3, label: "Participant Data", icon: "3", subtitle: "Upload & Map" },
  { step: 4, label: "Live Preview", icon: "4", subtitle: "Inspect Output" },
  { step: 5, label: "Generate", icon: "5", subtitle: "Bulk PDFs & ZIP" },
];

export default function CertificateStepper({
  currentStep,
  onStepClick,
  maxUnlockedStep = 1,
}) {
  return (
    <nav className="cert-stepper-container" aria-label="Certificate Generation Progress">
      <div className="cert-stepper">
        {STEPS.map((s, idx) => {
          const isCompleted = currentStep > s.step;
          const isActive = currentStep === s.step;
          const isClickable = s.step <= maxUnlockedStep && s.step !== currentStep;

          return (
            <div key={s.step} className="cert-stepper-item-wrap">
              <button
                type="button"
                className={`cert-step-item ${isActive ? "active" : ""} ${
                  isCompleted ? "completed" : ""
                } ${isClickable ? "clickable" : ""}`}
                onClick={() => isClickable && onStepClick?.(s.step)}
                disabled={!isClickable}
                aria-current={isActive ? "step" : undefined}
                title={
                  isClickable
                    ? `Jump to Step ${s.step}: ${s.label}`
                    : isActive
                    ? `Current Step: ${s.label}`
                    : `Complete prior steps to unlock ${s.label}`
                }
              >
                <span className="cert-step-circle">
                  {isCompleted ? "✓" : s.icon}
                </span>
                <div className="cert-step-text">
                  <span className="cert-step-label">{s.label}</span>
                  <span className="cert-step-subtitle">{s.subtitle}</span>
                </div>
              </button>

              {idx < STEPS.length - 1 && (
                <div
                  className={`cert-step-line ${
                    currentStep > s.step ? "filled" : ""
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}

CertificateStepper.propTypes = {
  currentStep: PropTypes.number.isRequired,
  onStepClick: PropTypes.func,
  maxUnlockedStep: PropTypes.number,
};

