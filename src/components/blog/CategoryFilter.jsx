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
    <div className="category-wrapper">
      {categories.map((category) => (
        <button
          key={category}
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