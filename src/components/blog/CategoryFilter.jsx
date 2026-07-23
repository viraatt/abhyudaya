import "./CategoryFilter.css";

export default function CategoryFilter({
  activeCategory,
  onCategoryChange,
}) {
  const categories = [
    "All",
    "Events",
    "Technology",
    "Science",
    "Literature",
    "Achievements",
  ];

  return (
    <div className="blog-categories">
      {categories.map((category) => (
        <button
          key={category}
          className={`blog-category-btn ${
            activeCategory === category ? "active" : ""
          }`}
          onClick={() => onCategoryChange(category)}
        >
          {category}
        </button>
      ))}
    </div>
  );
}