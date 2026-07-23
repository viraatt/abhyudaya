import "./SearchBar.css";
import { FiSearch } from "react-icons/fi";

export default function SearchBar({ value, onChange }) {
  return (
    <div className="blog-search">
      <input
        type="text"
        placeholder="Search articles..."
        value={value}
        onChange={onChange}
      />
      <FiSearch className="search-icon" />
    </div>
  );
}