import "./SearchBar.css";
import { FiSearch } from "react-icons/fi";

export default function SearchBar({ value, onChange }) {
  return (
    <div className="blog-search-wrapper">
      <FiSearch className="search-icon" />

      <input
        type="text"
        placeholder="Search blogs, events, technology..."
        value={value}
        onChange={onChange}
      />
    </div>
  );
}