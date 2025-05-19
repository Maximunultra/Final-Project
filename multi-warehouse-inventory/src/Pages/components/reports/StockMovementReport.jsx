import React, { useState, useEffect } from 'react';

const StockMovementReport = ({ stockMovements: rawMovements, products, warehouses, dateRange }) => {
  const [sortConfig, setSortConfig] = useState({
    key: 'date',
    direction: 'descending'
  });
  const [filters, setFilters] = useState({
    product: '',
    warehouse: '',
    movementType: ''
  });
  const [transformedMovements, setTransformedMovements] = useState([]);

  // Transform backend data to frontend format
  useEffect(() => {
    if (!rawMovements || !Array.isArray(rawMovements)) {
      setTransformedMovements([]);
      return;
    }

    const transformed = rawMovements.map(movement => ({
      id: movement.id || `temp-${Math.random().toString(36).substr(2, 9)}`,
      date: movement.transfer_date || movement.date,
      productId: movement.product_id || movement.productId,
      // Determine movement type based on available fields
      type: determineMovementType(movement),
      quantity: movement.quantity,
      warehouseId: movement.destination_warehouse_id || movement.warehouse_id || movement.warehouseId,
      sourceWarehouseId: movement.source_warehouse_id || movement.sourceWarehouseId,
      referenceNumber: movement.reference_number || movement.referenceNumber,
      notes: movement.notes
    }));

    setTransformedMovements(transformed);
  }, [rawMovements]);

  // Helper to determine movement type
  const determineMovementType = (movement) => {
    // If type is explicitly set, use it
    if (movement.type) return movement.type;
    
    // Otherwise infer from the data structure
    if (movement.source_warehouse_id && movement.destination_warehouse_id) {
      return 'transfer';
    } else if (movement.source_warehouse_id) {
      return 'shipping';
    } else if (movement.destination_warehouse_id) {
      return 'receiving';
    }
    
    // Fallback
    return 'adjustment';
  };

  // Handle sorting
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Apply filters and sorting to stock movements
  const getFilteredAndSortedMovements = () => {
    // Make sure movements exist
    if (!transformedMovements || !Array.isArray(transformedMovements)) {
      return [];
    }
    
    const filtered = transformedMovements.filter(movement => {
      // Skip invalid movements
      if (!movement || !movement.date) return false;
      
      // Apply date range filter
      if (dateRange && dateRange.startDate && dateRange.endDate) {
        const movementDate = new Date(movement.date);
        const startDate = new Date(dateRange.startDate);
        const endDate = new Date(dateRange.endDate);
        endDate.setHours(23, 59, 59, 999); // Include the entire end date
        
        if (movementDate < startDate || movementDate > endDate) return false;
      }
      
      // Apply product filter
      if (filters.product && movement.productId !== filters.product) return false;
      
      // Apply warehouse filter - check both destination and source warehouses
      if (filters.warehouse && movement.warehouseId !== filters.warehouse && 
          movement.sourceWarehouseId !== filters.warehouse) return false;
      
      // Apply movement type filter
      if (filters.movementType && movement.type !== filters.movementType) return false;
      
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortConfig.key === 'date') {
        // Special case for date sorting
        const dateA = new Date(a.date || 0);
        const dateB = new Date(b.date || 0);
        return sortConfig.direction === 'ascending' 
          ? dateA - dateB 
          : dateB - dateA;
      }
      
      // Handle case where key doesn't exist in one or both objects
      const aValue = a[sortConfig.key] !== undefined ? a[sortConfig.key] : '';
      const bValue = b[sortConfig.key] !== undefined ? b[sortConfig.key] : '';
      
      if (aValue < bValue) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value
    });
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? '↑' : '↓';
  };

  // Format date in a readable format
  const formatDate = (dateString) => {
    if (!dateString) return 'Invalid Date';
    
    try {
      const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
      return new Date(dateString).toLocaleDateString(undefined, options);
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Get product name by ID
  const getProductName = (productId) => {
    if (!productId || !products || !Array.isArray(products)) return 'Unknown Product';
    const product = products.find(p => p.id === productId);
    return product ? product.name : 'Unknown Product';
  };

  // Get warehouse name by ID
  const getWarehouseName = (warehouseId) => {
    if (!warehouseId || !warehouses || !Array.isArray(warehouses)) return 'Unknown Warehouse';
    const warehouse = warehouses.find(w => w.id === warehouseId);
    return warehouse ? warehouse.name : 'Unknown Warehouse';
  };

  // Get badge color based on movement type
  const getMovementTypeBadge = (type) => {
    if (!type) return 'bg-gray-100 text-gray-800';
    
    switch (type.toLowerCase()) {
      case 'receiving':
        return 'bg-green-100 text-green-800';
      case 'shipping':
        return 'bg-blue-100 text-blue-800';
      case 'adjustment':
        return 'bg-yellow-100 text-yellow-800';
      case 'transfer':
        return 'bg-purple-100 text-purple-800';
      case 'return':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get movement quantity with appropriate sign
  const getFormattedQuantity = (movement) => {
    if (!movement || typeof movement.quantity === 'undefined') return '-';
    
    const quantity = Math.abs(movement.quantity);
    
    if (!movement.type) return quantity.toString();
    
    switch (movement.type.toLowerCase()) {
      case 'receiving':
      case 'return':
        return `+${quantity}`;
      case 'shipping':
        return `-${quantity}`;
      case 'adjustment':
        return movement.quantity >= 0 ? `+${quantity}` : `-${quantity}`;
      case 'transfer':
        return movement.sourceWarehouseId ? `-${quantity}` : `+${quantity}`;
      default:
        return movement.quantity;
    }
  };

  // Calculate summary statistics
  const calculateSummaryStats = () => {
    const filteredMovements = getFilteredAndSortedMovements();
    let inflow = 0;
    let outflow = 0;
    
    filteredMovements.forEach(movement => {
      if (!movement.type || typeof movement.quantity === 'undefined') return;
      
      const type = movement.type.toLowerCase();
      
      if (['receiving', 'return'].includes(type) || (type === 'adjustment' && movement.quantity > 0)) {
        inflow += Math.abs(movement.quantity);
      } else if (['shipping'].includes(type) || (type === 'adjustment' && movement.quantity < 0)) {
        outflow += Math.abs(movement.quantity);
      } else if (type === 'transfer') {
        // For transfers, consider location context
        if (movement.sourceWarehouseId) {
          outflow += Math.abs(movement.quantity);
        } else {
          inflow += Math.abs(movement.quantity);
        }
      }
    });
    
    return {
      inflow,
      outflow,
      netChange: inflow - outflow,
      totalMovements: filteredMovements.length
    };
  };

  const summaryStats = calculateSummaryStats();
  const filteredMovements = getFilteredAndSortedMovements();

  return (
    <div>
      <h4 className="text-lg font-semibold mb-4">Stock Movement History</h4>
      
      <div className="flex flex-wrap gap-4 mb-4">
        {/* Filter controls */}
        <div>
          <label className="block text-sm font-medium mb-1">Product</label>
          <select 
            name="product"
            value={filters.product}
            onChange={handleFilterChange}
            className="border rounded p-1"
          >
            <option value="">All Products</option>
            {Array.isArray(products) && products.map(product => (
              <option key={product.id} value={product.id}>{product.name}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Warehouse</label>
          <select 
            name="warehouse"
            value={filters.warehouse}
            onChange={handleFilterChange}
            className="border rounded p-1"
          >
            <option value="">All Warehouses</option>
            {Array.isArray(warehouses) && warehouses.map(warehouse => (
              <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Movement Type</label>
          <select 
            name="movementType"
            value={filters.movementType}
            onChange={handleFilterChange}
            className="border rounded p-1"
          >
            <option value="">All Types</option>
            <option value="receiving">Receiving</option>
            <option value="shipping">Shipping</option>
            <option value="adjustment">Adjustment</option>
            <option value="transfer">Transfer</option>
            <option value="return">Return</option>
          </select>
        </div>
        
        {/* Clear filters button */}
        <div className="self-end">
          <button
            onClick={() => setFilters({ product: '', warehouse: '', movementType: '' })}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded"
          >
            Clear Filters
          </button>
        </div>
      </div>
      
      {/* Summary statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 p-3 rounded border">
          <div className="text-sm text-gray-500">Total Movements</div>
          <div className="text-xl font-semibold">{summaryStats.totalMovements}</div>
        </div>
        <div className="bg-green-50 p-3 rounded border border-green-100">
          <div className="text-sm text-green-700">Total Inflow</div>
          <div className="text-xl font-semibold text-green-700">+{summaryStats.inflow}</div>
        </div>
        <div className="bg-red-50 p-3 rounded border border-red-100">
          <div className="text-sm text-red-700">Total Outflow</div>
          <div className="text-xl font-semibold text-red-700">-{summaryStats.outflow}</div>
        </div>
        <div className={`${summaryStats.netChange >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'} p-3 rounded border`}>
          <div className={`text-sm ${summaryStats.netChange >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>Net Change</div>
          <div className={`text-xl font-semibold ${summaryStats.netChange >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
            {summaryStats.netChange >= 0 ? '+' : ''}{summaryStats.netChange}
          </div>
        </div>
      </div>
      
      {filteredMovements.length === 0 ? (
        <div className="bg-gray-100 p-4 rounded text-center">
          No stock movement data found for the selected filters and date range.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead>
              <tr className="bg-gray-100">
                <th 
                  className="py-2 px-4 border cursor-pointer"
                  onClick={() => requestSort('date')}
                >
                  Date & Time {getSortIndicator('date')}
                </th>
                <th 
                  className="py-2 px-4 border cursor-pointer"
                  onClick={() => requestSort('productId')}
                >
                  Product {getSortIndicator('productId')}
                </th>
                <th 
                  className="py-2 px-4 border cursor-pointer"
                  onClick={() => requestSort('type')}
                >
                  Movement Type {getSortIndicator('type')}
                </th>
                <th 
                  className="py-2 px-4 border cursor-pointer"
                  onClick={() => requestSort('quantity')}
                >
                  Quantity {getSortIndicator('quantity')}
                </th>
                <th 
                  className="py-2 px-4 border cursor-pointer"
                  onClick={() => requestSort('warehouseId')}
                >
                  Warehouse {getSortIndicator('warehouseId')}
                </th>
                <th className="py-2 px-4 border">
                  Reference
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.map((movement) => (
                <tr key={movement.id}>
                  <td className="py-2 px-4 border">
                    {formatDate(movement.date)}
                  </td>
                  <td className="py-2 px-4 border">
                    {getProductName(movement.productId)}
                  </td>
                  <td className="py-2 px-4 border">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getMovementTypeBadge(movement.type)}`}>
                      {movement.type && typeof movement.type === 'string' 
                        ? movement.type.charAt(0).toUpperCase() + movement.type.slice(1)
                        : 'Unknown'}
                    </span>
                  </td>
                  <td className="py-2 px-4 border font-medium">
                    {getFormattedQuantity(movement)}
                  </td>
                  <td className="py-2 px-4 border">
                    {getWarehouseName(movement.warehouseId)}
                    {movement.sourceWarehouseId && movement.type && movement.type.toLowerCase() === 'transfer' && (
                      <div className="text-xs text-gray-500">
                        From: {getWarehouseName(movement.sourceWarehouseId)}
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-4 border text-sm">
                    {movement.referenceNumber || '-'}
                    {movement.notes && (
                      <div className="text-xs text-gray-500">{movement.notes}</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-600">
        Showing {filteredMovements.length} stock movements 
        {dateRange?.startDate && dateRange?.endDate ? ` from ${dateRange.startDate} to ${dateRange.endDate}` : ''}
      </div>
    </div>
  );
};

export default StockMovementReport;