import "./SearchBar.css";
import { FiSearch, FiX } from "react-icons/fi";

export default function SearchBar({ value, onChange, onClear }) {
  const handleClear = () => {
    if (onClear) {
      onClear();
    } else if (onChange) {
      onChange({ target: { value: "" } });
    }
  };

  return (
    <div className="blog-search-wrapper">
      <FiSearch className="search-icon" />

      <input
        type="text"
        placeholder="Search articles by title, topic, or author..."
        value={value}
        onChange={onChange}
        aria-label="Search articles"
      />

      {value && (
        <button
          type="button"
          className="search-clear-btn"
          onClick={handleClear}
          aria-label="Clear search text"
        >
          <FiX />
        </button>
      )}
    </div>
  );
}