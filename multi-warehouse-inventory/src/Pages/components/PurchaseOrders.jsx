import React, { useState, useEffect } from 'react';
import { PlusCircle, Search, Edit, Trash2, FileText, Download, Filter, Package, CheckCircle, AlertTriangle } from 'lucide-react';
import axios from 'axios';

const PurchaseOrders = () => {
  // State management
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentFilter, setCurrentFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [supplierProducts, setSupplierProducts] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [receiveItems, setReceiveItems] = useState([]);

  // API configuration
  const API_BASE_URL = 'http://localhost:5000/api';
  const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    }
  });

  // Form state
  const [formData, setFormData] = useState({
    id: '',
    orderNumber: '',
    vendorName: '',
    orderDate: '',
    deliveryDate: '',
    status: 'pending',
    totalAmount: '',
    items: [{ productId: '', description: '', quantity: 1, unitPrice: 0, totalPrice: 0 }]
  });

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get all necessary data in parallel
        const [suppliersRes, ordersRes, warehousesRes] = await Promise.all([
          axiosInstance.get('/suppliers'),
          axiosInstance.get('/purchase-orders'),
          axiosInstance.get('/warehouses')
        ]);

        setSuppliers(suppliersRes.data);
        setWarehouses(warehousesRes.data);
        
        // Extract unique products from suppliers
        const products = suppliersRes.data
          .filter(supplier => supplier.product_name)
          .map(supplier => ({
            id: supplier.id,
            name: supplier.product_name,
            price: supplier.price || 0,
            supplierId: supplier.id,
            supplierName: supplier.company_name
          }));
        
        setSupplierProducts(products);
        setPurchaseOrders(ordersRes.data);
        setFilteredOrders(ordersRes.data);
      } catch (err) {
        handleApiError(err, 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Filter orders
  useEffect(() => {
    const results = purchaseOrders.filter(order => {
      const matchesSearch = 
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.vendorName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = currentFilter === 'all' || order.status === currentFilter;
      
      return matchesSearch && matchesFilter;
    });
    
    setFilteredOrders(results);
  }, [searchTerm, currentFilter, purchaseOrders]);

  // Update supplier products when vendor changes
  useEffect(() => {
    if (selectedSupplier) {
      const filteredProducts = suppliers
        .filter(supplier => supplier.company_name === selectedSupplier && supplier.product_name)
        .map(supplier => ({
          id: supplier.id,
          name: supplier.product_name,
          price: supplier.price || 0,
          supplierId: supplier.id
        }));
      
      setSupplierProducts(filteredProducts);
    }
  }, [selectedSupplier, suppliers]);

  // Handle API errors
  const handleApiError = (err, defaultMessage) => {
    console.error(err);
    const errorMessage = err.response?.data?.message || 
                        err.message || 
                        defaultMessage;
    setError(errorMessage);
  };

  // Form handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'vendorName') {
      setSelectedSupplier(value);
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleProductChange = (index, productId) => {
    const selectedProduct = supplierProducts.find(p => p.id === productId);
    if (!selectedProduct) return;

    setFormData(prev => {
      const updatedItems = [...prev.items];
      updatedItems[index] = {
        productId,
        description: selectedProduct.name,
        unitPrice: selectedProduct.price,
        quantity: updatedItems[index].quantity,
        totalPrice: updatedItems[index].quantity * selectedProduct.price
      };
      return { ...prev, items: updatedItems };
    });
  };

  const handleItemChange = (index, field, value) => {
    setFormData(prev => {
      const updatedItems = [...prev.items];
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: value,
        ...(field === 'quantity' && {
          totalPrice: Number(value) * Number(updatedItems[index].unitPrice)
        })
      };
      return { ...prev, items: updatedItems };
    });
  };

  // Handle receive item quantity change
  const handleReceiveQuantityChange = (index, value) => {
    const qty = parseInt(value, 10) || 0;
    setReceiveItems(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        receivedQuantity: qty
      };
      return updated;
    });
  };

  // CRUD operations
  const savePurchaseOrder = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const totalAmount = formData.items.reduce((sum, item) => sum + Number(item.totalPrice), 0);
      const orderData = { ...formData, totalAmount };

      const response = formData.id 
        ? await axiosInstance.put(`/purchase-orders/${formData.id}`, orderData)
        : await axiosInstance.post('/purchase-orders', orderData);

      setPurchaseOrders(prev => 
        formData.id 
          ? prev.map(order => order.id === formData.id ? response.data : order)
          : [...prev, response.data]
      );
      setShowCreateModal(false);
    } catch (err) {
      handleApiError(err, 'Failed to save order');
    } finally {
      setLoading(false);
    }
  };

  const deletePurchaseOrder = async (id) => {
    if (!window.confirm('Are you sure you want to delete this purchase order?')) return;
    
    try {
      setLoading(true);
      await axiosInstance.delete(`/purchase-orders/${id}`);
      setPurchaseOrders(prev => prev.filter(order => order.id !== id));
    } catch (err) {
      handleApiError(err, 'Failed to delete order');
    } finally {
      setLoading(false);
    }
  };

  // Handle receiving items
  const submitReceiveItems = async () => {
    try {
      setLoading(true);
      setError(null);

      // Filter out items with 0 quantity
      const itemsToReceive = receiveItems
        .filter(item => item.receivedQuantity > 0)
        .map(item => ({
          id: item.id,
          received_quantity: item.receivedQuantity
        }));

      if (itemsToReceive.length === 0) {
        setError('Please enter quantities to receive');
        setLoading(false);
        return;
      }

      // Call the API to receive items
      const response = await axiosInstance.post(`/purchase-orders/${currentOrder.id}/receive`, {
        items: itemsToReceive,
        warehouse_id: selectedWarehouse
      });

      // Update the local state with the updated order
      setPurchaseOrders(prev => 
        prev.map(order => 
          order.id === currentOrder.id ? response.data.purchase_order : order
        )
      );

      setShowReceiveModal(false);
      alert('Items received successfully and stock updated!');
    } catch (err) {
      handleApiError(err, 'Failed to receive items');
    } finally {
      setLoading(false);
    }
  };

  // UI helpers
  const addItemRow = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { productId: '', description: '', quantity: 1, unitPrice: 0, totalPrice: 0 }]
    }));
  };

  const removeItemRow = (index) => {
    if (formData.items.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const openCreateModal = () => {
    setFormData({
      id: '',
      orderNumber: `PO-${new Date().getFullYear()}-${String(purchaseOrders.length + 1).padStart(3, '0')}`,
      vendorName: '',
      orderDate: new Date().toISOString().split('T')[0],
      deliveryDate: '',
      status: 'pending',
      items: [{ productId: '', description: '', quantity: 1, unitPrice: 0, totalPrice: 0 }],
      totalAmount: 0
    });
    setSelectedSupplier('');
    setShowCreateModal(true);
  };

  const openEditModal = (order) => {
    setFormData(order);
    setSelectedSupplier(order.vendorName);
    setShowCreateModal(true);
  };

  const openViewModal = (order) => {
    setCurrentOrder(order);
    setShowViewModal(true);
  };

  // Open receive items modal
  const openReceiveModal = (order) => {
    // Only allow receiving items for orders that are not cancelled or already fully received
    if (order.status === 'cancelled' || order.status === 'received') {
      alert(`Cannot receive items for an order with status: ${order.status}`);
      return;
    }

    setCurrentOrder(order);
    
    // Set up the receive items form
    const items = order.purchase_order_items ? order.purchase_order_items.map(item => ({
      id: item.id,
      productId: item.product_id,
      productName: item.products?.name || 'Unknown Product',
      orderedQuantity: item.quantity,
      receivedSoFar: item.received_quantity || 0,
      remainingQuantity: item.quantity - (item.received_quantity || 0),
      receivedQuantity: 0 // New quantity being received now
    })) : [];
    
    setReceiveItems(items);
    setSelectedWarehouse('');
    setShowReceiveModal(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const downloadAsCsv = (order) => {
    let csv = 'Order Number,Vendor,Order Date,Delivery Date,Status,Total Amount\n';
    csv += `${order.orderNumber},${order.vendorName},${order.orderDate},${order.deliveryDate},${order.status},${order.totalAmount}\n\n`;
    csv += 'Item,Quantity,Unit Price,Total Price\n';
    order.items.forEach(item => {
      csv += `${item.description},${item.quantity},${item.unitPrice},${item.totalPrice}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${order.orderNumber}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const StatusBadge = ({ status }) => {
    const statusClasses = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      received: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
      </span>
    );
  };

  const ErrorMessage = ({ error, onClose }) => (
    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 flex justify-between items-center">
      <p>{error}</p>
      <button onClick={onClose} className="text-red-700 font-bold">
        &times;
      </button>
    </div>
  );

  // Calculate if an order can be received
  const canReceiveItems = (order) => {
    return ['pending', 'approved', 'shipped'].includes(order.status);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {error && <ErrorMessage error={error} onClose={() => setError(null)} />}

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Purchase Orders</h1>
        <button 
          onClick={openCreateModal}
          className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          disabled={loading}
        >
          <PlusCircle className="mr-2" size={18} />
          New Purchase Order
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by order number or vendor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full"
            disabled={loading}
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
        </div>
        
        <div className="flex gap-2">
          <div className="relative">
            <select
              value={currentFilter}
              onChange={(e) => setCurrentFilter(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md appearance-none"
              disabled={loading}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="shipped">Shipped</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <Filter className="absolute left-3 top-2.5 text-gray-400" size={18} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading purchase orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="mx-auto text-gray-400" size={48} />
          <p className="mt-4 text-gray-600">No purchase orders found</p>
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
                      {canReceiveItems(order) && (
                        <button 
                          onClick={() => openReceiveModal(order)}
                          className="text-green-500 hover:text-green-700"
                          title="Receive Items"
                        >
                          <Package size={18} />
                        </button>
                      )}
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
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  {formData.id ? 'Edit Purchase Order' : 'Create Purchase Order'}
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
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
                      <option value="">Select a vendor</option>
                      {suppliers
                        .filter((supplier, index, self) => 
                          index === self.findIndex(s => s.company_name === supplier.company_name)
                        )
                        .map(supplier => (
                          <option key={supplier.id} value={supplier.company_name}>
                            {supplier.company_name}
                          </option>
                        ))
                      }
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
                      <option value="approved">Approved</option>
                      <option value="shipped">Shipped</option>
                      <option value="received">Received</option>
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
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2">
                            <select
                              value={item.productId}
                              onChange={(e) => handleProductChange(index, e.target.value)}
                              className="w-full px-3 py-1 border border-gray-300 rounded-md"
                              required
                              disabled={!formData.vendorName}
                            >
                              <option value="">Select a product</option>
                              {supplierProducts
                                .filter(product => !formData.vendorName || 
                                  suppliers.find(s => s.id === product.id)?.company_name === formData.vendorName)
                                .map(product => (
                                  <option key={product.id} value={product.id}>
                                    {product.name}
                                  </option>
                                ))}
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                              className="w-full px-3 py-1 border border-gray-300 rounded-md"
                              required
                            />
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
                              value={item.unitPrice}
                              onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                              className="w-full px-3 py-1 border border-gray-300 rounded-md"
                              required
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              value={item.totalPrice}
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
                            disabled={!formData.vendorName}
                          >
                            <PlusCircle size={16} className="mr-1" />
                            Add Item
                          </button>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Total Amount */}
                <div className="flex justify-end mb-4">
                  <span className="text-lg font-semibold">
                    Total: {formatCurrency(formData.items.reduce((sum, item) => sum + Number(item.totalPrice), 0))}
                  </span>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    disabled={loading}
                  >
                    {formData.id ? 'Update Order' : 'Create Order'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* End Create/Edit Modal */}
    </div>
  );
};

export default PurchaseOrders;