// reports/InventoryValueReport.jsx - Component for displaying inventory value analysis
import React, { useState, useEffect } from 'react';
// Add chart.js and react-chartjs-2
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const InventoryValueReport = ({ products, stockMovements = [] }) => {
  const [sortConfig, setSortConfig] = useState({
    key: 'totalValue',
    direction: 'descending'
  });
  const [filterCategory, setFilterCategory] = useState('');

  // Low stock threshold (customize as needed)
  const LOW_STOCK_THRESHOLD = 5;

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

  // Calculate total inventory value using selling_price * totalStock
  const calculateTotalValue = () => {
    return products.reduce(
      (total, product) =>
        total + ((Number(product.selling_price) || 0) * (Number(product.totalStock) || 0)),
      0
    );
  };

  // Calculate value by category using selling price * stock
  const calculateValueByCategory = () => {
    const valueByCategory = {};
    products.forEach(product => {
      if (product.category) {
        if (!valueByCategory[product.category]) {
          valueByCategory[product.category] = 0;
        }
        valueByCategory[product.category] +=
          ((product.price || product.sellingPrice || 0) * (product.totalStock || 0));
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

  // Prepare data for charts
  const productNames = products.map((p) => p.name);
  const productStocks = products.map((p) => p.totalStock || 0);
  const productValues = products.map((p) => p.totalValue || 0);

  // Low stock products
  const lowStockProducts = products.filter((p) => (p.totalStock || 0) <= LOW_STOCK_THRESHOLD);

  // Prepare stock movement data (if provided)
  // stockMovements: [{ productId, productName, date, type: 'in'|'out', quantity }]
  // We'll show total in/out per product (last 30 days)
  const recentMovements = Array.isArray(stockMovements)
    ? stockMovements.filter(
        (m) =>
          new Date(m.date) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      )
    : [];

  const movementByProduct = {};
  recentMovements.forEach((m) => {
    if (!movementByProduct[m.productName]) {
      movementByProduct[m.productName] = { in: 0, out: 0 };
    }
    if (m.type === 'in') movementByProduct[m.productName].in += m.quantity;
    if (m.type === 'out') movementByProduct[m.productName].out += m.quantity;
  });

  const movementLabels = Object.keys(movementByProduct);
  const movementIn = movementLabels.map((name) => movementByProduct[name].in);
  const movementOut = movementLabels.map((name) => movementByProduct[name].out);

  // Chart data
  const stockBarData = {
    labels: productNames,
    datasets: [
      {
        label: 'Stock Quantity',
        data: productStocks,
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
      },
    ],
  };

  const valueDoughnutData = {
    labels: productNames,
    datasets: [
      {
        label: 'Inventory Value',
        data: productValues,
        backgroundColor: [
          '#3b82f6',
          '#6366f1',
          '#f59e42',
          '#10b981',
          '#ef4444',
          '#fbbf24',
          '#a21caf',
          '#14b8a6',
          '#eab308',
          '#f472b6',
        ],
      },
    ],
  };

  const movementBarData = {
    labels: movementLabels,
    datasets: [
      {
        label: 'Stock In',
        data: movementIn,
        backgroundColor: 'rgba(16, 185, 129, 0.7)',
      },
      {
        label: 'Stock Out',
        data: movementOut,
        backgroundColor: 'rgba(239, 68, 68, 0.7)',
      },
    ],
  };

  const filteredProducts = getFilteredAndSortedProducts();
  const totalInventoryValue = calculateTotalValue();
  const valueByCategory = calculateValueByCategory();

  // Calculate high-value thresholds
  const highValueThreshold = totalInventoryValue * 0.1; // Products worth 10% or more of total inventory

  return (
    <div>
      <h4 className="text-lg font-semibold mb-4">Inventory Value Analysis</h4>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Stock Quantity Bar Chart */}
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h5 className="font-medium text-md mb-2">Stock Quantity by Product</h5>
          <div className="h-64">
            <Bar data={stockBarData} options={{
              responsive: true,
              plugins: { legend: { display: false } },
              scales: { x: { ticks: { autoSkip: false, maxRotation: 90, minRotation: 45 } } }
            }} />
          </div>
        </div>
        {/* Inventory Value Doughnut Chart */}
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h5 className="font-medium text-md mb-2">Inventory Value Distribution</h5>
          <div className="h-64 flex items-center justify-center">
            <Doughnut data={valueDoughnutData} options={{
              responsive: true,
              plugins: { legend: { position: 'bottom' } }
            }} />
          </div>
        </div>
        {/* Stock Movement Bar Chart */}
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h5 className="font-medium text-md mb-2">Stock Movement (Last 30 Days)</h5>
          {movementLabels.length === 0 ? (
            <div className="text-gray-500 italic">No recent stock movement data</div>
          ) : (
            <div className="h-64">
              <Bar data={movementBarData} options={{
                responsive: true,
                plugins: { legend: { position: 'top' } },
                scales: { x: { ticks: { autoSkip: false, maxRotation: 90, minRotation: 45 } } }
              }} />
            </div>
          )}
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 p-4 rounded">
          <h5 className="font-medium text-red-700 mb-2">Low Stock Products</h5>
          <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
            {lowStockProducts.map((p) => (
              <li key={p.id}>
                <span className="font-semibold">{p.name}</span> (Stock: {p.totalStock})
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary and Category breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Summary card */}
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h5 className="font-medium text-lg mb-3">Inventory Summary</h5>

          <div className="space-y-2">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-gray-600">Total Inventory Value</span>
              <span className="text-xl font-bold">
                {formatCurrency(
                  filteredProducts.reduce(
                    (total, product) =>
                      total + ((Number(product.selling_price) || 0) * (Number(product.totalStock) || 0)),
                    0
                  )
                )}
              </span>
            </div>

            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-gray-600">Total Products</span>
              <span className="font-semibold">{filteredProducts.length}</span>
            </div>

            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-gray-600">Total Products</span>
              <span className="font-semibold">{filteredProducts.length}</span>
            </div>
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
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => {
              // Calculate total value for each product
              const totalValue = (Number(product.selling_price) || 0) * (Number(product.totalStock) || 0);
              const isHighValue = totalValue >= highValueThreshold;

              return (
                <tr key={product.id} className={isHighValue ? 'bg-yellow-50' : ''}>
                  <td className="py-2 px-4 border">
                    {product.name}
                    {isHighValue && <span className="ml-2 text-xs bg-yellow-200 text-yellow-800 px-1 rounded">High Value</span>}
                  </td>
                  <td className="py-2 px-4 border">{product.sku}</td>
                  <td className="py-2 px-4 border">{product.category || 'Uncategorized'}</td>
                  <td className="py-2 px-4 border text-right">{product.totalStock}</td>
                  <td className="py-2 px-4 border text-right">
                    {formatCurrency(product.selling_price || 0)}
                  </td>
                  <td className="py-2 px-4 border text-right font-medium">{formatCurrency(totalValue)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td colSpan="5" className="py-2 px-4 border text-right font-medium">Total Inventory Value:</td>
              <td className="py-2 px-4 border text-right font-bold">
                {formatCurrency(
                  filteredProducts.reduce(
                    (total, product) =>
                      total + ((Number(product.selling_price) || 0) * (Number(product.totalStock) || 0)),
                    0
                  )
                )}
              </td>
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