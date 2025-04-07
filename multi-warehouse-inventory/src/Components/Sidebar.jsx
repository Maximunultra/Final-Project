// src/components/Sidebar.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div>
      {/* Sidebar */}
      <div
        className={`bg-gray-800 text-white w-64 space-y-6 px-2 py-7 transition-all duration-300 ${
          isOpen ? "block" : "hidden sm:block"
        }`}
      >
        <div className="text-2xl font-semibold text-center text-white mb-4">
          Multi-Warehouse
        </div>
        <div className="space-y-2">
          <Link to="/" className="block py-2 px-4 rounded-lg hover:bg-gray-600 transition duration-200">
            Dashboard
          </Link>
          <Link to="/products" className="block py-2 px-4 rounded-lg hover:bg-gray-600 transition duration-200">
            Products
          </Link>
          <Link to="/warehouses" className="block py-2 px-4 rounded-lg hover:bg-gray-600 transition duration-200">
            Warehouses
          </Link>
          <Link to="/stock-movement" className="block py-2 px-4 rounded-lg hover:bg-gray-600 transition duration-200">
            Stock Movements
          </Link>
          <Link to="/low-stock" className="block py-2 px-4 rounded-lg hover:bg-gray-600 transition duration-200">
            Low Stock Alerts
          </Link>
          <button
            className="block py-2 px-4 rounded-lg w-full text-left hover:bg-gray-600 transition duration-200"
            onClick={() => {
              localStorage.removeItem("user"); // Remove user data
              window.location.href = "/login"; // Redirect to login
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Mobile toggle button */}
      <button onClick={toggleSidebar} className="sm:hidden text-white p-4 bg-gray-800">
        {isOpen ? "Close" : "Open"} Sidebar
      </button>
    </div>
  );
};

export default Sidebar;
