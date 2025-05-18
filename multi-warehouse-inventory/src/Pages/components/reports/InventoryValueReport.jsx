// reports/InventoryValueReport.jsx - Component for displaying inventory value analysis
import React, { useState } from 'react';

const InventoryValueReport = ({ products }) => {
  const [sortConfig, setSortConfig] = useState({
    key: 'totalValue',
    direction: 'descending'
  });
  const [filterCategory, setFilterCategory] = useState('');
  
  // Get unique categories from products
  const categories = [...new Set(products.map(product => product.category))].filter(Boolean);
  
  // Handle sorting
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  // Apply filtering and sorting to products
  const getFilteredAndSortedProducts = () => {
    let filtered = [...products];
    
    if (filterCategory) {
      filtered = filtered.filter(product => product.category === filterCategory);
    }
    
    return filtered.sort((a, b) => {
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
  
  // Calculate total inventory value
  const calculateTotalValue = () => {
    return products.reduce((total, product) => total + (product.totalValue || 0), 0);
  };
  
  // Calculate value by category
  const calculateValueByCategory = () => {
    const valueByCategory = {};
    
    products.forEach(product => {
      if (product.category) {
        if (!valueByCategory[product.category]) {
          valueByCategory[product.category] = 0;
        }
        valueByCategory[product.category] += (product.totalValue || 0);
      }
    });
    
    return valueByCategory;
  };
  
  // Format currency value
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };
  
  const filteredProducts = getFilteredAndSortedProducts();
  const totalInventoryValue = calculateTotalValue();
  const valueByCategory = calculateValueByCategory();
  
  // Calculate high-value thresholds
  const highValueThreshold = totalInventoryValue * 0.1; // Products worth 10% or more of total inventory
  
  return (
    <div>
      <h4 className="text-lg font-semibold mb-4">Inventory Value Analysis</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Summary card */}
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h5 className="font-medium text-lg mb-3">Inventory Summary</h5>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-gray-600">Total Inventory Value</span>
              <span className="text-xl font-bold">{formatCurrency(totalInventoryValue)}</span>
            </div>
            
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-gray-600">Total Products</span>
              <span className="font-semibold">{products.length}</span>
            </div>
            
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-gray-600">Average Value per Product</span>
              <span className="font-semibold">
                {formatCurrency(products.length ? totalInventoryValue / products.length : 0)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">High-Value Products</span>
              <span className="font-semibold">
                {products.filter(p => p.totalValue >= highValueThreshold).length}
              </span>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded text-sm text-blue-700">
            High-value products are defined as individual products whose value exceeds 10% of total inventory value.
          </div>
        </div>
        
        {/* Category breakdown */}
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h5 className="font-medium text-lg mb-3">Value by Category</h5>
          
          {Object.keys(valueByCategory).length === 0 ? (
            <div className="text-gray-500 italic">No category data available</div>
          ) : (
            <div className="space-y-3">
              {Object.entries(valueByCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([category, value]) => {
                  const percentage = (value / totalInventoryValue) * 100;
                  return (
                    <div key={category} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{category}</span>
                        <span>{formatCurrency(value)} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              }
            </div>
          )}
          
          <div className="mt-4">
            <button 
              onClick={() => setFilterCategory('')}
              className={`px-2 py-1 text-xs rounded mr-2 ${!filterCategory ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              All Categories
            </button>
            
            {categories.map(category => (
              <button 
                key={category}
                onClick={() => setFilterCategory(category)}
                className={`px-2 py-1 text-xs rounded mr-2 mt-2 ${filterCategory === category ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Products Table */}
      <div className="mb-4">
        <h5 className="font-medium mb-2">Inventory Value by Product</h5>
        {filterCategory && (
          <div className="mb-2 text-sm">
            Filtering by category: <span className="font-semibold">{filterCategory}</span>
            <button 
              onClick={() => setFilterCategory('')} 
              className="ml-2 text-blue-500 hover:underline"
            >
              Clear filter
            </button>
          </div>
        )}
      </div>
      
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
                onClick={() => requestSort('category')}
              >
                Category {getSortIndicator('category')}
              </th>
              <th 
                className="py-2 px-4 border cursor-pointer"
                onClick={() => requestSort('totalStock')}
              >
                Quantity {getSortIndicator('totalStock')}
              </th>
              <th 
                className="py-2 px-4 border cursor-pointer"
                onClick={() => requestSort('price')}
              >
                Unit Price {getSortIndicator('price')}
              </th>
              <th 
                className="py-2 px-4 border cursor-pointer"
                onClick={() => requestSort('totalValue')}
              >
                Total Value {getSortIndicator('totalValue')}
              </th>
              <th className="py-2 px-4 border">% of Inventory</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => {
              const percentageOfTotal = ((product.totalValue || 0) / totalInventoryValue) * 100;
              const isHighValue = (product.totalValue || 0) >= highValueThreshold;
              
              return (
                <tr key={product.id} className={isHighValue ? 'bg-yellow-50' : ''}>
                  <td className="py-2 px-4 border">
                    {product.name}
                    {isHighValue && <span className="ml-2 text-xs bg-yellow-200 text-yellow-800 px-1 rounded">High Value</span>}
                  </td>
                  <td className="py-2 px-4 border">{product.sku}</td>
                  <td className="py-2 px-4 border">{product.category || 'Uncategorized'}</td>
                  <td className="py-2 px-4 border text-right">{product.totalStock}</td>
                  <td className="py-2 px-4 border text-right">{formatCurrency(product.price || 0)}</td>
                  <td className="py-2 px-4 border text-right font-medium">{formatCurrency(product.totalValue || 0)}</td>
                  <td className="py-2 px-4 border text-right">{percentageOfTotal.toFixed(2)}%</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td colSpan="5" className="py-2 px-4 border text-right font-medium">Total Inventory Value:</td>
              <td className="py-2 px-4 border text-right font-bold">{formatCurrency(totalInventoryValue)}</td>
              <td className="py-2 px-4 border text-right">100%</td>
            </tr>
          </tfoot>
        </table>
      </div>
      
      <div className="mt-6 bg-blue-50 p-4 rounded border border-blue-100">
        <h5 className="font-medium text-blue-800 mb-2">Insights & Recommendations</h5>
        <ul className="list-disc list-inside space-y-1 text-sm text-blue-700">
          <li>Focus on optimizing stock levels for high-value products to minimize tied-up capital.</li>
          <li>Consider implementing cycle counting for products representing over 5% of inventory value.</li>
          <li>Review slow-moving high-value products to avoid excessive holding costs.</li>
          <li>Evaluate storage security measures for products with highest per-unit value.</li>
        </ul>
      </div>
    </div>
  );
};

export default InventoryValueReport;