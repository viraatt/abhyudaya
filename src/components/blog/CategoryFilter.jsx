import "./CategoryFilter.css";

const categories = [
  "All",
  "Events",
  "Technology",
  "Science",
  "Literature",
  "Achievements",
];

export default function CategoryFilter({
  activeCategory,
  onCategoryChange,
}) {
  return (
    <div className="category-wrapper" role="tablist" aria-label="Article categories">
      {categories.map((category) => (
        <button
          key={category}
          type="button"
          role="tab"
          aria-selected={activeCategory === category}
          onClick={() => onCategoryChange(category)}
          className={`category-pill ${
            activeCategory === category ? "active" : ""
          }`}
        >
          {category}
        </button>
      ))}
    </div>
  );
}