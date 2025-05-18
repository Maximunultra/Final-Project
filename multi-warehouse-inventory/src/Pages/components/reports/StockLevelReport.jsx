// reports/StockLevelReport.jsx - Component for displaying current stock levels across warehouses
import React, { useState } from 'react';

const StockLevelReport = ({ products, warehouses }) => {
  const [sortConfig, setSortConfig] = useState({
    key: 'name',
    direction: 'ascending'
  });
  const [filterText, setFilterText] = useState('');

  // Handle sorting of products
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Filter and sort products
  const getFilteredAndSortedProducts = () => {
    const filtered = products.filter(product => 
      product.name.toLowerCase().includes(filterText.toLowerCase()) ||
      product.sku.toLowerCase().includes(filterText.toLowerCase())
    );

    return [...filtered].sort((a, b) => {
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

  return (
    <div>
      <h4 className="text-lg font-semibold mb-4">Current Stock Levels</h4>
      
      <div className="mb-4">
        <input
          type="text"
          placeholder="Filter by product name or SKU..."
          className="border rounded p-2 w-full"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />
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
                onClick={() => requestSort('totalStock')}
              >
                Total Stock {getSortIndicator('totalStock')}
              </th>
              {warehouses.map(warehouse => (
                <th key={warehouse.id} className="py-2 px-4 border">
                  {warehouse.name}
                </th>
              ))}
              <th 
                className="py-2 px-4 border cursor-pointer"
                onClick={() => requestSort('category')}
              >
                Category {getSortIndicator('category')}
              </th>
            </tr>
          </thead>
          <tbody>
            {getFilteredAndSortedProducts().map((product) => (
              <tr key={product.id}>
                <td className="py-2 px-4 border">{product.name}</td>
                <td className="py-2 px-4 border">{product.sku}</td>
                <td className="py-2 px-4 border">{product.totalStock}</td>
                {warehouses.map(warehouse => {
                  // Find stock level for this product in this warehouse
                  const stockInWarehouse = product.warehouseStock && 
                    product.warehouseStock[warehouse.id] ? 
                    product.warehouseStock[warehouse.id] : 0;
                  
                  return (
                    <td key={warehouse.id} className="py-2 px-4 border text-center">
                      {stockInWarehouse}
                    </td>
                  );
                })}
                <td className="py-2 px-4 border">{product.category}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        Showing {getFilteredAndSortedProducts().length} of {products.length} products
      </div>
    </div>
  );
};

export default StockLevelReport;