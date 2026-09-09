import PropTypes from "prop-types";

const STEPS = [
  { step: 1, label: "Template", icon: "🎨" },
  { step: 2, label: "Design Fields", icon: "📐" },
  { step: 3, label: "Upload & Map Data", icon: "📊" },
  { step: 4, label: "Preview", icon: "👁️" },
  { step: 5, label: "Generate", icon: "⚡" },
];

export default function CertificateStepper({ currentStep, onStepClick, maxUnlockedStep = 3 }) {
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
              >
                <span className="cert-step-circle">
                  {isCompleted ? "✓" : s.icon}
                </span>
                <span className="cert-step-label">{s.label}</span>
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
