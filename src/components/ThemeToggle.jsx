import React from "react";
import { useTheme } from "../context/ThemeContext";

const ThemeToggle = () => {
  const { isDarkMode, toggleTheme } = useTheme();

  const handleClick = () => {
    console.log(
      "🎯 Botón clickeado - Tema actual:",
      isDarkMode ? "oscuro" : "claro"
    );
    toggleTheme();
  };

  return (
    <button
      onClick={handleClick}
      className={`relative w-14 h-8 rounded-full p-1 transition-all duration-300 ${
        isDarkMode ? "bg-blue-600" : "bg-gray-300"
      } shadow-lg hover:shadow-xl`}
      aria-label={isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
    >
      <div
        className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg flex items-center justify-center transition-transform duration-300 ${
          isDarkMode ? "transform translate-x-6" : "transform translate-x-0"
        }`}
      >
        {isDarkMode ? (
          <span className="text-blue-600 text-sm">🌙</span>
        ) : (
          <span className="text-yellow-500 text-sm">☀️</span>
        )}
      </div>
    </button>
  );
};

export default ThemeToggle;
