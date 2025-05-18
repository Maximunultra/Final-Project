// components/ReportingAnalytics.jsx - Component for reporting and analytics features
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import StockLevelReport from './reports/StockLevelReport';
import LowStockReport from './reports/LowStockReport';
import StockMovementReport from './reports/StockMovementReport';
import InventoryValueReport from './reports/InventoryValueReport';
import { CSVLink } from 'react-csv';
import * as XLSX from 'xlsx';

const ReportingAnalytics = ({ products, alerts }) => {
  const [activeReport, setActiveReport] = useState('stock-levels');
  const [stockMovements, setStockMovements] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loadingReportData, setLoadingReportData] = useState(false);
  const [reportError, setReportError] = useState(null);
  const [exportFormat, setExportFormat] = useState('csv');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0] // today
  });

  useEffect(() => {
    const fetchReportData = async () => {
      setLoadingReportData(true);
      setReportError(null);
      
      try {
        // Fetch stock movements and warehouses data for reports
        const [movementsResponse, warehousesResponse] = await Promise.all([
          axios.get('http://localhost:5000/api/stock_movements', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            params: {
              start_date: dateRange.startDate,
              end_date: dateRange.endDate
            }
          }),
          axios.get('http://localhost:5000/api/warehouses')
        ]);
        
        setStockMovements(movementsResponse.data);
        setWarehouses(warehousesResponse.data);
      } catch (error) {
        console.error('Error fetching report data:', error);
        setReportError('Failed to load report data. Please try again.');
      } finally {
        setLoadingReportData(false);
      }
    };
    
    fetchReportData();
  }, [dateRange]);

  // Calculate stock value for inventory valuation
  const calculateInventoryValue = () => {
    return products.map(product => ({
      ...product,
      totalValue: product.totalStock * (product.price || 0)
    }));
  };

  // Prepare report data for export based on active report
  const getReportDataForExport = () => {
    switch (activeReport) {
      case 'stock-levels':
        return products.map(product => ({
          'Product ID': product.id,
          'Product Name': product.name,
          'Category': product.category,
          'Total Stock': product.totalStock,
          'Unit': product.unit || 'pcs'
        }));
      
      case 'low-stock':
        const lowStockProducts = products.filter(product => 
          product.totalStock <= (product.reorderLevel || 10)
        );
        return lowStockProducts.map(product => ({
          'Product ID': product.id,
          'Product Name': product.name,
          'Current Stock': product.totalStock,
          'Reorder Level': product.reorderLevel || 10,
          'Status': product.totalStock <= (product.reorderLevel / 2) ? 'Critical' : 'Low'
        }));
      
      case 'stock-movement':
        return stockMovements.map(movement => ({
          'Movement ID': movement.id,
          'Product': products.find(p => p.id === movement.productId)?.name || 'Unknown',
          'Type': movement.type,
          'Quantity': movement.quantity,
          'Warehouse': warehouses.find(w => w.id === movement.warehouseId)?.name || 'Unknown',
          'Date': new Date(movement.date).toLocaleDateString(),
          'Reference': movement.reference || 'N/A'
        }));
      
      case 'inventory-value':
        const valuedInventory = calculateInventoryValue();
        return valuedInventory.map(product => ({
          'Product ID': product.id,
          'Product Name': product.name,
          'Unit Price': product.price || 0,
          'Quantity': product.totalStock,
          'Total Value': product.totalValue
        }));
      
      default:
        return [];
    }
  };

  // Handle Excel export
  const handleExcelExport = () => {
    const data = getReportDataForExport();
    if (data.length === 0) {
      alert('No data available to export');
      return;
    }
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, activeReport);
    
    // Generate filename with report type and date
    const fileName = `${activeReport}-report-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Get CSV filename based on active report
  const getCSVFilename = () => {
    return `${activeReport}-report-${new Date().toISOString().split('T')[0]}.csv`;
  };

  const handleDateRangeChange = (e) => {
    setDateRange({
      ...dateRange,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div>
      <div className="bg-white p-4 rounded-lg mb-6">
        <h3 className="text-lg font-medium mb-4">Reports & Analytics</h3>
        
        <div className="flex flex-wrap items-center justify-between mb-4">
          <div className="flex space-x-4 mb-2 sm:mb-0">
            <button
              onClick={() => setActiveReport('stock-levels')}
              className={`px-3 py-1 rounded ${activeReport === 'stock-levels' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Current Stock Levels
            </button>
            <button
              onClick={() => setActiveReport('low-stock')}
              className={`px-3 py-1 rounded ${activeReport === 'low-stock' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Low-Stock Products
            </button>
            <button
              onClick={() => setActiveReport('stock-movement')}
              className={`px-3 py-1 rounded ${activeReport === 'stock-movement' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Stock Movement History
            </button>
            <button
              onClick={() => setActiveReport('inventory-value')}
              className={`px-3 py-1 rounded ${activeReport === 'inventory-value' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Inventory Value
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className="border rounded p-1"
            >
              <option value="csv">CSV</option>
              <option value="excel">Excel</option>
            </select>
            
            {exportFormat === 'csv' ? (
              <CSVLink
                data={getReportDataForExport()}
                filename={getCSVFilename()}
                className="px-3 py-1 bg-green-500 text-white rounded inline-block"
                target="_blank"
              >
                Export CSV
              </CSVLink>
            ) : (
              <button
                onClick={handleExcelExport}
                className="px-3 py-1 bg-green-500 text-white rounded"
              >
                Export Excel
              </button>
            )}
          </div>
        </div>
        
        {/* Date Range Filter for appropriate reports */}
        {(activeReport === 'stock-movement') && (
          <div className="mb-4 flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input
                type="date"
                name="startDate"
                value={dateRange.startDate}
                onChange={handleDateRangeChange}
                className="border rounded p-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input
                type="date"
                name="endDate"
                value={dateRange.endDate}
                onChange={handleDateRangeChange}
                className="border rounded p-1"
              />
            </div>
          </div>
        )}
        
        {/* Display appropriate report based on selection */}
        {loadingReportData ? (
          <div className="text-center py-10">Loading report data...</div>
        ) : reportError ? (
          <div className="bg-red-100 text-red-700 p-3 rounded">{reportError}</div>
        ) : (
          <div className="mt-4">
            {activeReport === 'stock-levels' && (
              <StockLevelReport products={products} warehouses={warehouses} />
            )}
            
            {activeReport === 'low-stock' && (
              <LowStockReport alerts={alerts} products={products} />
            )}
            
            {activeReport === 'stock-movement' && (
              <StockMovementReport 
                stockMovements={stockMovements} 
                products={products} 
                warehouses={warehouses} 
                dateRange={dateRange}
              />
            )}
            
            {activeReport === 'inventory-value' && (
              <InventoryValueReport products={calculateInventoryValue()} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportingAnalytics;