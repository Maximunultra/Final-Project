// reports/LowStockReport.jsx - Component for displaying products with low stock levels
import React, { useState, useEffect } from 'react';

const LowStockReport = ({ alerts, products, thresholds }) => {
  const [sortConfig, setSortConfig] = useState({
    key: 'stockLevel',
    direction: 'ascending'
  });
  const [lowStockItems, setLowStockItems] = useState([]);

  useEffect(() => {
    // Set low stock items whenever products, thresholds or sort config changes
    setLowStockItems(getSortedLowStockProducts());
  }, [products, thresholds, sortConfig, alerts]);

  // Get low stock products based on their thresholds
  const getLowStockProducts = () => {
    if (!products || products.length === 0) {
      return [];
    }

    // First check if we have alerts data, which may be more current
    if (alerts && alerts.length > 0) {
      // Map alerts to our expected format
      return alerts.map(alert => {
        // Find matching product data
        const matchingProduct = products.find(p => p.sku === alert.sku || p.id === alert.product_id);
        
        return {
          id: matchingProduct?.id || alert.product_id,
          name: alert.product || matchingProduct?.name,
          sku: alert.sku,
          totalStock: alert.currentStock !== undefined ? alert.currentStock : matchingProduct?.totalStock,
          threshold: alert.threshold,
          stockStatus: getStockStatus({
            totalStock: alert.currentStock !== undefined ? alert.currentStock : matchingProduct?.totalStock,
          }, alert.threshold)
        };
      });
    }

    // Fallback to calculating from products and thresholds
    return products.filter(product => {
      // Find the corresponding threshold for this product
      const productThreshold = thresholds?.find(t => t.product_id === product.id);
      
      // Use the threshold from the thresholds table, or default to 10 (matching DB default)
      const thresholdValue = productThreshold ? productThreshold.threshold : 10;
      
      // Check if product stock is below threshold
      return product.totalStock <= thresholdValue;
    }).map(product => {
      const productThreshold = thresholds?.find(t => t.product_id === product.id);
      const thresholdValue = productThreshold ? productThreshold.threshold : 10;
      
      return {
        ...product,
        threshold: thresholdValue,
        stockStatus: getStockStatus(product, thresholdValue)
      };
    });
  };

  // Get stock status label
  const getStockStatus = (product, threshold) => {
    if (product.totalStock <= 0) return 'Out of Stock';
    if (product.totalStock <= threshold * 0.5) return 'Critical';
    return 'Low';
  };

  // Handle sorting
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Sort low stock products
  const getSortedLowStockProducts = () => {
    const lowStockProducts = getLowStockProducts();
    
    return [...lowStockProducts].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? '↑' : '↓';
  };

  // Get status color for visual indication
  const getStatusColor = (status) => {
    switch (status) {
      case 'Out of Stock': return 'bg-red-100 text-red-800';
      case 'Critical': return 'bg-orange-100 text-orange-800';
      case 'Low': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100';
    }
  };

  return (
    <div>
      <h4 className="text-lg font-semibold mb-4">Low Stock Products</h4>
      
      {lowStockItems.length === 0 ? (
        <div className="bg-green-100 text-green-700 p-4 rounded text-center">
          No low stock products detected! All inventory levels are healthy.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border">
              <thead>
                <tr className="bg-gray-100">
                  <th 
                    className="py-2 px-4 border cursor-pointer"
                    onClick={() => requestSort('name')}
                  >
                    Product Name {getSortIndicator('name')}
                  </th>
                  <th 
                    className="py-2 px-4 border cursor-pointer"
                    onClick={() => requestSort('sku')}
                  >
                    SKU {getSortIndicator('sku')}
                  </th>
                  <th 
                    className="py-2 px-4 border cursor-pointer"
                    onClick={() => requestSort('totalStock')}
                  >
                    Current Stock {getSortIndicator('totalStock')}
                  </th>
                  <th 
                    className="py-2 px-4 border cursor-pointer"
                    onClick={() => requestSort('threshold')}
                  >
                    Threshold {getSortIndicator('threshold')}
                  </th>
                  <th 
                    className="py-2 px-4 border cursor-pointer"
                    onClick={() => requestSort('stockStatus')}
                  >
                    Status {getSortIndicator('stockStatus')}
                  </th>
                  <th className="py-2 px-4 border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {lowStockItems.map((product, index) => (
                  <tr key={product.id || index}>
                    <td className="py-2 px-4 border">{product.name}</td>
                    <td className="py-2 px-4 border">{product.sku}</td>
                    <td className="py-2 px-4 border">{product.totalStock}</td>
                    <td className="py-2 px-4 border">{product.threshold}</td>
                    <td className="py-2 px-4 border">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(product.stockStatus)}`}>
                        {product.stockStatus}
                      </span>
                    </td>
                    <td className="py-2 px-4 border">
                      <button className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs">
                        Reorder Now
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            Showing {lowStockItems.length} low stock products
          </div>
          
          <div className="mt-4 bg-yellow-50 p-3 rounded border border-yellow-100">
            <h5 className="font-medium text-yellow-800">Restock Recommendations</h5>
            <p className="text-sm text-yellow-700 mt-1">
              Consider placing purchase orders for all products with "Critical" status as soon as possible.
              Products with very low stock should be prioritized.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default LowStockReport;