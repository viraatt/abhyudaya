import React, { useRef, useState, useEffect } from "react";

export default function InteractiveTiltCard({
  children,
  className = "",
  onClick,
  maxTilt = 12,
}) {
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [sheenPos, setSheenPos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);
  const [hasHoverSupport, setHasHoverSupport] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      setHasHoverSupport(window.matchMedia("(hover: hover)").matches);
    }
  }, []);

  const handleMouseMove = (e) => {
    if (!hasHoverSupport || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = -((y - centerY) / centerY) * maxTilt;
    const rotateY = ((x - centerX) / centerX) * maxTilt;

    setTilt({ x: rotateX, y: rotateY });
    setSheenPos({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
    });
  };

  const handleMouseEnter = () => {
    if (hasHoverSupport) setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (hasHoverSupport) {
      setIsHovered(false);
      setTilt({ x: 0, y: 0 });
    }
  };

  return (
    <div
      className="gallery-card-3d-viewport"
      style={{ perspective: hasHoverSupport ? "1200px" : "none" }}
    >
      <div
        ref={cardRef}
        className={`gallery-card-3d-body relative rounded-[12px] overflow-hidden cursor-pointer ${className}`}
        style={{
          transformStyle: hasHoverSupport ? "preserve-3d" : "flat",
          transform: isHovered && hasHoverSupport
            ? `rotateX(${tilt.x.toFixed(2)}deg) rotateY(${tilt.y.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`
            : "rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
          transition: isHovered
            ? "transform 0.1s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.3s ease"
            : "transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.3s ease",
          boxShadow: isHovered && hasHoverSupport
            ? "0 20px 40px -10px rgba(0, 0, 0, 0.25), 0 0 20px rgba(255, 209, 102, 0.3)"
            : "0 4px 15px -3px rgba(0, 0, 0, 0.1)",
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
      >
        {/* Dynamic Light Sheen Overlay */}
        {hasHoverSupport && (
          <div
            className="pointer-events-none absolute inset-0 z-20 transition-opacity duration-300"
            style={{
              opacity: isHovered ? 0.25 : 0,
              background: `radial-gradient(circle at ${sheenPos.x}% ${sheenPos.y}%, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0) 65%)`,
            }}
          />
        )}

        {/* Card Content */}
        <div
          style={{
            transform: isHovered && hasHoverSupport ? "translateZ(20px)" : "none",
            transition: "transform 0.3s ease-out",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
