import React, { useState, useEffect } from 'react';
import { PlusCircle, Search, Edit, Trash2, FileText, Download, Filter } from 'lucide-react';

const PurchaseOrders = () => {
  // State for purchase orders data
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentFilter, setCurrentFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  
  // Form state for creating/editing purchase orders
  const [formData, setFormData] = useState({
    id: '',
    orderNumber: '',
    vendorName: '',
    orderDate: '',
    deliveryDate: '',
    status: 'pending',
    totalAmount: '',
    items: [{ productName: '', quantity: 1, cost_price: 0, selling_price: 0, totalPrice: 0 }]
  });

  // State for products data
  const [products, setProducts] = useState([]);

  // Mock data fetch - replace with your actual API call
  useEffect(() => {
    const fetchPurchaseOrders = async () => {
      try {
        // Simulating API fetch with setTimeout
        setTimeout(() => {
          const mockData = [
            {
              id: '1',
              orderNumber: 'PO-2025-001',
              vendorName: 'Tech Supplies Inc.',
              orderDate: '2025-05-01',
              deliveryDate: '2025-05-15',
              status: 'delivered',
              totalAmount: 12500,
              items: [
                { productName: 'Laptops', quantity: 5, cost_price: 1800, selling_price: 2000, totalPrice: 10000 },
                { productName: 'Monitors', quantity: 10, cost_price: 200, selling_price: 250, totalPrice: 2500 }
              ]
            },
            {
              id: '2',
              orderNumber: 'PO-2025-002',
              vendorName: 'Office Solutions',
              orderDate: '2025-05-05',
              deliveryDate: '2025-05-25',
              status: 'pending',
              totalAmount: 3750,
              items: [
                { productName: 'Chairs', quantity: 15, cost_price: 120, selling_price: 150, totalPrice: 2250 },
                { productName: 'Desks', quantity: 5, cost_price: 250, selling_price: 300, totalPrice: 1500 }
              ]
            },
            {
              id: '3',
              orderNumber: 'PO-2025-003',
              vendorName: 'Paper Co.',
              orderDate: '2025-05-10',
              deliveryDate: '2025-05-20',
              status: 'in-transit',
              totalAmount: 850,
              items: [
                { productName: 'Printer Paper', quantity: 50, cost_price: 10, selling_price: 12, totalPrice: 600 },
                { productName: 'Notebooks', quantity: 50, cost_price: 4, selling_price: 5, totalPrice: 250 }
              ]
            }
          ];
          
          setPurchaseOrders(mockData);
          setFilteredOrders(mockData);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error("Error fetching purchase orders:", error);
        setLoading(false);
      }
    };
    
    fetchPurchaseOrders();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/products");
        const data = await res.json();
        setProducts(data);
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };
    fetchProducts();
  }, []);

  // Filter purchase orders based on search term and status filter
  useEffect(() => {
    const results = purchaseOrders.filter(order => {
      const matchesSearch = 
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.vendorName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = 
        currentFilter === 'all' || 
        order.status === currentFilter;
      
      return matchesSearch && matchesFilter;
    });
    
    setFilteredOrders(results);
  }, [searchTerm, currentFilter, purchaseOrders]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Handle item changes in the form
  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    
    // Update total price if quantity or cost price changes
    if (field === 'quantity' || field === 'cost_price') {
      updatedItems[index].totalPrice =
        Number(updatedItems[index].quantity) * Number(updatedItems[index].cost_price);
    }
    
    setFormData({
      ...formData,
      items: updatedItems
    });
  };

  // Add new item row
  const addItemRow = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { productName: '', quantity: 1, cost_price: 0, selling_price: 0, totalPrice: 0 }
      ]
    });
  };

  // Remove item row
  const removeItemRow = (index) => {
    if (formData.items.length > 1) {
      const updatedItems = formData.items.filter((_, i) => i !== index);
      setFormData({
        ...formData,
        items: updatedItems
      });
    }
  };

  // Calculate total amount
  const calculateTotalAmount = () => {
    return formData.items.reduce((sum, item) => sum + Number(item.totalPrice), 0).toFixed(2);
  };

  // Open create modal
  const openCreateModal = () => {
    setFormData({
      id: '',
      orderNumber: `PO-2025-${String(purchaseOrders.length + 1).padStart(3, '0')}`,
      vendorName: '',
      orderDate: new Date().toISOString().split('T')[0],
      deliveryDate: '',
      status: 'pending',
      items: [{ productName: '', quantity: 1, cost_price: 0, selling_price: 0, totalPrice: 0 }],
      totalAmount: 0
    });
    setShowCreateModal(true);
  };

  // Open edit modal
  const openEditModal = (order) => {
    setFormData({
      ...order
    });
    setShowCreateModal(true);
  };

  // Open view modal
  const openViewModal = (order) => {
    setCurrentOrder(order);
    setShowViewModal(true);
  };

  // Save purchase order (create or update)
  const savePurchaseOrder = (e) => {
    e.preventDefault();
    
    // Calculate total amount
    const totalAmount = calculateTotalAmount();
    
    const updatedFormData = {
      ...formData,
      totalAmount
    };
    
    if (formData.id) {
      // Update existing order
      const updatedOrders = purchaseOrders.map(order => 
        order.id === formData.id ? updatedFormData : order
      );
      setPurchaseOrders(updatedOrders);
    } else {
      // Create new order
      const newOrder = {
        ...updatedFormData,
        id: String(purchaseOrders.length + 1)
      };
      setPurchaseOrders([...purchaseOrders, newOrder]);
    }
    
    setShowCreateModal(false);
  };

  // Delete purchase order
  const deletePurchaseOrder = (id) => {
    if (window.confirm('Are you sure you want to delete this purchase order?')) {
      const updatedOrders = purchaseOrders.filter(order => order.id !== id);
      setPurchaseOrders(updatedOrders);
    }
  };

  // Status badge component
  const StatusBadge = ({ status }) => {
    let badgeClass = 'px-2 py-1 rounded text-xs font-medium';
    
    switch (status) {
      case 'pending':
        badgeClass += ' bg-yellow-100 text-yellow-800';
        break;
      case 'in-transit':
        badgeClass += ' bg-blue-100 text-blue-800';
        break;
      case 'delivered':
        badgeClass += ' bg-green-100 text-green-800';
        break;
      case 'cancelled':
        badgeClass += ' bg-red-100 text-red-800';
        break;
      default:
        badgeClass += ' bg-gray-100 text-gray-800';
    }
    
    return (
      <span className={badgeClass}>
        {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
      </span>
    );
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Download purchase order as CSV
  const downloadAsCsv = (order) => {
    // Create CSV header
    let csv = 'Order Number,Vendor,Order Date,Delivery Date,Status,Total Amount\n';
    
    // Add order info
    csv += `${order.orderNumber},${order.vendorName},${order.orderDate},${order.deliveryDate},${order.status},${order.totalAmount}\n\n`;
    
    // Add items header
    csv += 'Product,Quantity,Cost Price,Selling Price,Total Price\n';
    
    // Add items
    order.items.forEach(item => {
      csv += `${item.productName},${item.quantity},${item.cost_price},${item.selling_price},${item.totalPrice}\n`;
    });
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `${order.orderNumber}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Mock suppliers data
  const [suppliers, setSuppliers] = useState([
    { id: '1', name: 'Tech Supplies Inc.' },
    { id: '2', name: 'Office Solutions' },
    { id: '3', name: 'Paper Co.' }
  ]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Purchase Orders</h1>
        <button 
          onClick={openCreateModal}
          className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          <PlusCircle className="mr-2" size={18} />
          New Purchase Order
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search by order number or vendor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
        </div>
        
        <div className="flex gap-2">
          <div className="relative">
            <select
              value={currentFilter}
              onChange={(e) => setCurrentFilter(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md appearance-none"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in-transit">In Transit</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <Filter className="absolute left-3 top-2.5 text-gray-400" size={18} />
          </div>
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading purchase orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="mx-auto text-gray-400" size={48} />
          <p className="mt-4 text-gray-600">No purchase orders found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 cursor-pointer" onClick={() => openViewModal(order)}>
                    {order.orderNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{order.vendorName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.orderDate}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.deliveryDate}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 font-medium">
                    {formatCurrency(order.totalAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button 
                        onClick={() => downloadAsCsv(order)}
                        className="text-gray-500 hover:text-gray-700"
                        title="Download as CSV"
                      >
                        <Download size={18} />
                      </button>
                      <button 
                        onClick={() => openViewModal(order)}
                        className="text-blue-500 hover:text-blue-700"
                        title="View Details"
                      >
                        <FileText size={18} />
                      </button>
                      <button 
                        onClick={() => openEditModal(order)}
                        className="text-yellow-500 hover:text-yellow-700"
                        title="Edit"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => deletePurchaseOrder(order.id)}
                        className="text-red-500 hover:text-red-700"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-screen overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {formData.id ? 'Edit Purchase Order' : 'Create Purchase Order'}
              </h2>
              
              <form onSubmit={savePurchaseOrder}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Order Number
                    </label>
                    <input
                      type="text"
                      name="orderNumber"
                      value={formData.orderNumber}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      readOnly
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vendor Name
                    </label>
                    <select
                      name="vendorName"
                      value={formData.vendorName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="">Select a supplier</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.name}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Order Date
                    </label>
                    <input
                      type="date"
                      name="orderDate"
                      value={formData.orderDate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expected Delivery Date
                    </label>
                    <input
                      type="date"
                      name="deliveryDate"
                      value={formData.deliveryDate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="pending">Pending</option>
                      <option value="in-transit">In Transit</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
                
                <h3 className="text-lg font-medium mb-2">Order Items</h3>
                
                <div className="mb-4 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cost Price</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Selling Price</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2">
                            <select
                              value={item.productName || ""}
                              onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                              className="w-full px-3 py-1 border border-gray-300 rounded-md"
                              required
                            >
                              <option value="">Select product</option>
                              {products.map((product) => (
                                <option key={product.id} value={product.name}>
                                  {product.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                              className="w-full px-3 py-1 border border-gray-300 rounded-md"
                              required
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.cost_price}
                              onChange={(e) => handleItemChange(index, 'cost_price', e.target.value)}
                              className="w-full px-3 py-1 border border-gray-300 rounded-md"
                              required
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.selling_price}
                              onChange={(e) => handleItemChange(index, 'selling_price', e.target.value)}
                              className="w-full px-3 py-1 border border-gray-300 rounded-md"
                              required
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              value={Number(item.quantity) * Number(item.cost_price)}
                              className="w-full px-3 py-1 border border-gray-300 rounded-md bg-gray-50"
                              readOnly
                            />
                          </td>
                          <td className="px-4 py-2">
                            <button
                              type="button"
                              onClick={() => removeItemRow(index)}
                              disabled={formData.items.length === 1}
                              className={`p-1 rounded-full ${
                                formData.items.length === 1 
                                  ? 'text-gray-300' 
                                  : 'text-red-500 hover:bg-red-100'
                              }`}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="6" className="px-4 py-2">
                          <button
                            type="button"
                            onClick={addItemRow}
                            className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
                          >
                            <PlusCircle size={16} className="mr-1" />
                            Add Item
                          </button>
                        </td>
                      </tr>
                      <tr>
                        <td colSpan="4" className="px-4 py-2 text-right font-medium">
                          Total Amount:
                        </td>
                        <td className="px-4 py-2 font-bold">
                          {formatCurrency(calculateTotalAmount())}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                
                <div className="flex justify-end space-x-2 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {formData.id ? 'Update Order' : 'Create Order'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Order Modal */}
      {showViewModal && currentOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Purchase Order Details</h2>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500">Order Number</p>
                  <p className="font-medium">{currentOrder.orderNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Vendor</p>
                  <p className="font-medium">{currentOrder.vendorName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Order Date</p>
                  <p className="font-medium">{currentOrder.orderDate}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Expected Delivery Date</p>
                  <p className="font-medium">{currentOrder.deliveryDate}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <StatusBadge status={currentOrder.status} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Amount</p>
                  <p className="font-medium">{formatCurrency(currentOrder.totalAmount)}</p>
                </div>
              </div>
              
              <h3 className="text-lg font-medium mb-2">Order Items</h3>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Selling Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentOrder.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{item.productName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.quantity}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatCurrency(item.cost_price)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatCurrency(item.selling_price)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{formatCurrency(item.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="4" className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800 text-right">Total Amount:</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                        {formatCurrency(currentOrder.totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  onClick={() => {
                    setShowViewModal(false); 
                    openEditModal(currentOrder);
                  }}
                  className="flex items-center px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                >
                  <Edit size={16} className="mr-1" />
                  Edit
                </button>
                <button
                  onClick={() => downloadAsCsv(currentOrder)}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  <Download size={16} className="mr-1" />
                  Download CSV
                </button>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="flex items-center px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrders;