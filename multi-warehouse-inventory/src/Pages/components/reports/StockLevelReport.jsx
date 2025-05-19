// reports/StockLevelReport.jsx - Component for displaying current stock levels across warehouses
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const StockLevelReport = ({ products, warehouses }) => {
  const [sortConfig, setSortConfig] = useState({
    key: 'name',
    direction: 'ascending'
  });
  const [filterText, setFilterText] = useState('');
  const [productStockData, setProductStockData] = useState([]);
  const [stockLevels, setStockLevels] = useState({});

  // Fetch stock data and process products
  useEffect(() => {
    const fetchStockData = async () => {
      try {
        // Fetch stock levels from API
        const stockResponse = await axios.get('http://localhost:5000/api/stock');
        
        // Create a map of stock levels with keys as `${product_id}-${warehouse_id}`
        const stockMap = {};
        stockResponse.data.forEach(stock => {
          stockMap[`${stock.product_id}-${stock.warehouse_id}`] = stock.quantity;
        });
        setStockLevels(stockMap);
      } catch (error) {
        console.error('Error fetching stock data:', error);
      }
    };

    fetchStockData();
  }, []);

  // Process product data with stock levels
  useEffect(() => {
    if (!products || !warehouses || Object.keys(stockLevels).length === 0) return;

    const processedProducts = products.map(product => {
      // Calculate total stock from all warehouses
      let totalStock = 0;
      const warehouseStockMap = {};

      // Process stock levels for each warehouse
      warehouses.forEach(warehouse => {
        const stockKey = `${product.id}-${warehouse.id}`;
        const quantity = stockLevels[stockKey] || 0;
        warehouseStockMap[warehouse.id] = quantity;
        totalStock += quantity;
      });

      return {
        ...product,
        totalStock: totalStock,
        warehouseStock: warehouseStockMap
      };
    });

    setProductStockData(processedProducts);
  }, [products, warehouses, stockLevels]);

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
    const filtered = productStockData.filter(product => 
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

  // If data is still loading
  if (!products || !warehouses || products.length === 0 || productStockData.length === 0) {
    return <div className="p-4">Loading stock data...</div>;
  }

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
                  const stockInWarehouse = 
                    product.warehouseStock && 
                    product.warehouseStock[warehouse.id] !== undefined ? 
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
        Showing {getFilteredAndSortedProducts().length} of {productStockData.length} products
      </div>
    </div>
  );
};

export default StockLevelReport;