// LowStockAlerts.jsx - Main component file
import React, { useState, useEffect } from "react";
import StockAlertsTable from "./components/StockAlertsTable";
import ProductStockTable from "./components/ProductStockTable";
import ThresholdForm from "./components/ThresholdForm";
import ReportingAnalytics from "./components/ReportingAnalytics";
import { 
  fetchProductsData, 
  fetchStockData, 
  fetchThresholdsData, 
  updateProductThreshold 
} from "./Services/Dataservices";

const LowStockAlerts = () => {
  const [products, setProducts] = useState([]);
  const [thresholds, setThresholds] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [newThreshold, setNewThreshold] = useState({
    product_id: "",
    threshold: 10
  });
  const [activeTab, setActiveTab] = useState("alerts"); // tabs: alerts, products, reports

  // Fetch products and stock data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const [productsData, stockData, thresholdsData] = await Promise.all([
          fetchProductsData(),
          fetchStockData(),
          fetchThresholdsData()
        ]);
        
        // Process data
        const processedProducts = productsData.map(product => {
          // Find all stock entries for this product
          const productStock = stockData.filter(
            s => s.product_id === product.id
          );
          
          // Calculate total stock across all warehouses
          const totalStock = productStock.reduce(
            (sum, entry) => sum + (entry.quantity || 0), 0
          );
          
          return {
            ...product,
            totalStock,
            threshold: thresholdsData[product.id] || 10, // Default threshold
            stockByWarehouse: productStock
          };
        });
        
        setProducts(processedProducts);
        setThresholds(thresholdsData);
        
        // Generate alerts for products below threshold
        const alertsList = processedProducts
          .filter(p => p.totalStock < (thresholdsData[p.id] || 10))
          .map(p => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            currentStock: p.totalStock,
            threshold: thresholdsData[p.id] || 10
          }));
        
        setAlerts(alertsList);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load data. Please try again later.");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Update a product's threshold
  const updateThreshold = async (productId, value) => {
    try {
      // Validate input
      if (isNaN(value) || value < 0) {
        setError("Threshold must be a non-negative number");
        return;
      }
      
      // Update the threshold in your backend using the data service
      await updateProductThreshold(productId, value);
      
      // Update local state
      setThresholds(prev => ({
        ...prev,
        [productId]: value
      }));
      
      // Update products and recalculate alerts
      setProducts(prev => {
        const newProducts = prev.map(p => 
          p.id === productId 
            ? { ...p, threshold: value }
            : p
        );
        return newProducts;
      });
      
      // Recalculate alerts
      setAlerts(prev => {
        const updatedAlerts = [...prev.filter(a => a.id !== productId)];
        const product = products.find(p => p.id === productId);
        
        if (product && product.totalStock < value) {
          updatedAlerts.push({
            id: product.id,
            name: product.name,
            sku: product.sku,
            currentStock: product.totalStock,
            threshold: value
          });
        } else if (product && product.totalStock >= value) {
          // Product is no longer in alert state, already filtered out above
        }
        
        return updatedAlerts;
      });
      
      // Clear any previous errors
      setError(null);
    } catch (err) {
      console.error("Error updating threshold:", err);
      setError("Failed to update threshold. Please try again.");
    }
  };

  const handleThresholdSubmit = (e) => {
    e.preventDefault();
    
    const productId = parseInt(newThreshold.product_id);
    const thresholdValue = parseInt(newThreshold.threshold);
    
    if (isNaN(productId) || isNaN(thresholdValue) || thresholdValue < 0) {
      setError("Please enter valid values for product and threshold");
      return;
    }
    
    updateThreshold(productId, thresholdValue);
    setShowForm(false);
    setNewThreshold({ product_id: "", threshold: 10 });
  };

  if (loading) return <div className="flex justify-center p-8">Loading stock alerts...</div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;

  return (
    <div className="px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Inventory Management Dashboard</h2>
        <div className="flex space-x-2">
          {activeTab !== "reports" && (
            <button 
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              {showForm ? "Cancel" : "Set New Threshold"}
            </button>
          )}
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="border-b mb-6">
        <nav className="flex space-x-4">
          <button 
            onClick={() => setActiveTab("alerts")}
            className={`py-2 px-4 ${activeTab === "alerts" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-600"}`}
          >
            Low Stock Alerts
          </button>
          <button 
            onClick={() => setActiveTab("products")}
            className={`py-2 px-4 ${activeTab === "products" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-600"}`}
          >
            All Products
          </button>
          <button 
            onClick={() => setActiveTab("reports")}
            className={`py-2 px-4 ${activeTab === "reports" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-600"}`}
          >
            Reports & Analytics
          </button>
        </nav>
      </div>
      
      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
      
      {showForm && activeTab !== "reports" && (
        <ThresholdForm 
          products={products} 
          newThreshold={newThreshold} 
          setNewThreshold={setNewThreshold} 
          handleThresholdSubmit={handleThresholdSubmit} 
        />
      )}
      
      {/* Content based on active tab */}
      {activeTab === "alerts" && (
        <StockAlertsTable 
          alerts={alerts} 
          updateThreshold={updateThreshold} 
        />
      )}
      
      {activeTab === "products" && (
        <ProductStockTable 
          products={products} 
          updateThreshold={updateThreshold} 
        />
      )}
      
      {activeTab === "reports" && (
        <ReportingAnalytics 
          products={products}
          alerts={alerts}
        />
      )}
    </div>
  );
};

export default LowStockAlerts;