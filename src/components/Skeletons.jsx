// src/components/Skeletons.jsx

// Card Skeleton for Events/Blogs
export function CardSkeleton() {
  return (
    <div style={{ width: "100%", padding: "16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
      {/* Image box */}
      <div className="skeleton" style={{ width: "100%", height: "180px", marginBottom: "16px" }} />
      {/* Title */}
      <div className="skeleton" style={{ width: "70%", height: "24px", marginBottom: "10px" }} />
      {/* Subtitle / text lines */}
      <div className="skeleton" style={{ width: "90%", height: "14px", marginBottom: "6px" }} />
      <div className="skeleton" style={{ width: "40%", height: "14px" }} />
    </div>
  );
}

// Grid of Skeletons while loading lists
export function GridSkeleton({ count = 6 }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px", padding: "20px 0" }}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}