import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Dashboard from './Pages/Dashboard';
import Products from './Pages/Products';
import Warehouses from './Pages/Warehouses';
import StockMovement from './Pages/StockMovement';
import LowStockAlerts from './Pages/LowStockAlerts';
import Login from './Pages/Login';

// PrivateRoute checks if the user is authenticated before rendering children
const PrivateRoute = ({ children }) => {
  const user = localStorage.getItem('user');
  return user ? children : <Navigate to="/login" />;  // Redirect to login if no user is found
};

const App = () => {
  return (
    <Router>
      <div className="flex">
        <div className="flex-1 p-6 bg-gray-100 min-h-screen">
          <Routes>
            <Route path="/login" element={<Login />} />
            {/* Protect the Dashboard route */}
            <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/products" element={<PrivateRoute><Products /></PrivateRoute>} />
            <Route path="/warehouses" element={<PrivateRoute><Warehouses /></PrivateRoute>} />
            <Route path="/stock-movement" element={<PrivateRoute><StockMovement /></PrivateRoute>} />
            <Route path="/low-stock" element={<PrivateRoute><LowStockAlerts /></PrivateRoute>} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;
