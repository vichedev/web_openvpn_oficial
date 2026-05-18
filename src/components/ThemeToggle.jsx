import React from "react";
import { useTheme } from "../context/ThemeContext";

const ThemeToggle = () => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`relative w-14 h-7 rounded-full p-0.5 transition-colors duration-300 border ${
        isDarkMode
          ? "bg-gradient-to-r from-indigo-600 to-sky-600 border-white/15"
          : "bg-gradient-to-r from-sky-200 to-cyan-200 border-white/70"
      }`}
      aria-label={isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
    >
      <span
        className={`flex items-center justify-center w-6 h-6 bg-white rounded-full shadow-md text-xs transition-transform duration-300 ${
          isDarkMode ? "translate-x-7" : "translate-x-0"
        }`}
      >
        {isDarkMode ? "🌙" : "☀️"}
      </span>
    </button>
  );
};

export default ThemeToggle;
