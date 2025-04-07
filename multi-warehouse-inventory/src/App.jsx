import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import Dashboard from "./Pages/Dashboard";
import Products from "./Pages/Products";
import Warehouses from "./Pages/Warehouses";
import StockMovement from "./Pages/StockMovement";
import LowStockAlerts from "./Pages/LowStockAlerts";
import Login from "./Pages/Login";
import Layout from "./Components/Layout"; // Import Layout

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) {
      setIsAuthenticated(true); // Set to true if user is found in localStorage
    }
  }, []);

  return (
    <Router>
      <Routes>
        {/* Route for Login */}
        <Route path="/login" element={<Login />} />

        {/* Protected Routes */}
        <Route path="/" element={<PrivateRoute isAuthenticated={isAuthenticated}><Layout><Dashboard /></Layout></PrivateRoute>} />
        <Route path="/products" element={<PrivateRoute isAuthenticated={isAuthenticated}><Layout><Products /></Layout></PrivateRoute>} />
        <Route path="/warehouses" element={<PrivateRoute isAuthenticated={isAuthenticated}><Layout><Warehouses /></Layout></PrivateRoute>} />
        <Route path="/stock-movement" element={<PrivateRoute isAuthenticated={isAuthenticated}><Layout><StockMovement /></Layout></PrivateRoute>} />
        <Route path="/low-stock" element={<PrivateRoute isAuthenticated={isAuthenticated}><Layout><LowStockAlerts /></Layout></PrivateRoute>} />
      </Routes>
    </Router>
  );
};

const PrivateRoute = ({ children, isAuthenticated }) => {
  return isAuthenticated ? children : <Navigate to="/login" />;
};

export default App;
