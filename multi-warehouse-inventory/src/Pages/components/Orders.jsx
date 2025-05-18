import { useEffect, useState } from 'react';
import axios from 'axios';

const OrderFulfillment = () => {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [fulfillmentItems, setFulfillmentItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  useEffect(() => {
    fetchOrders();
    fetchProducts();
    fetchWarehouses();
  }, []);
  
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get('http://localhost:5000/api/orders', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchProducts = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/products');
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to fetch products');
    }
  };
  
  const fetchWarehouses = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/warehouses');
      setWarehouses(response.data);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      setError('Failed to fetch warehouses');
    }
  };
  
  const handleOrderSelect = async (orderId) => {
    try {
      setLoading(true);
      setError('');
      setSuccessMessage('');
      
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`http://localhost:5000/api/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setSelectedOrder(response.data);
      
      // Initialize fulfillment items based on order items
      const items = response.data.order_items.map(item => ({
        order_item_id: item.id,
        product_id: item.product_id,
        quantity: item.quantity,
        fulfill_quantity: item.quantity - (item.fulfilled_quantity || 0),
        warehouse_id: item.warehouse_id,
        status: item.status
      }));
      
      setFulfillmentItems(items);
    } catch (error) {
      console.error(`Error fetching order details:`, error);
      setError('Failed to fetch order details');
    } finally {
      setLoading(false);
    }
  };
  
  const handleQuantityChange = (index, value) => {
    const updatedItems = [...fulfillmentItems];
    const maxQuantity = updatedItems[index].quantity - (updatedItems[index].fulfilled_quantity || 0);
    
    // Ensure quantity is not less than 0 or more than available
    const newQuantity = Math.min(Math.max(0, parseInt(value) || 0), maxQuantity);
    
    updatedItems[index].fulfill_quantity = newQuantity;
    setFulfillmentItems(updatedItems);
  };
  
  const fulfillOrder = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccessMessage('');
      
      // Filter out items with zero quantity
      const itemsToFulfill = fulfillmentItems
        .filter(item => item.fulfill_quantity > 0 && item.status !== 'Fulfilled')
        .map(item => ({
          order_item_id: item.order_item_id,
          quantity: item.fulfill_quantity
        }));
      
      if (itemsToFulfill.length === 0) {
        setError('No items selected for fulfillment');
        setLoading(false);
        return;
      }
      
      const token = localStorage.getItem('token');
      
      // Send fulfillment request
      const response = await axios.post(
        `http://localhost:5000/api/orders/${selectedOrder.id}/fulfill`,
        { items: itemsToFulfill },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      setSuccessMessage('Order fulfilled successfully');
      
      // Refresh orders and clear selection
      fetchOrders();
      setSelectedOrder(null);
      setFulfillmentItems([]);
    } catch (error) {
      console.error('Error fulfilling order:', error);
      
      if (error.response && error.response.data && error.response.data.error) {
        setError(error.response.data.error);
      } else {
        setError('Failed to fulfill order');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const cancelOrder = async () => {
    if (!window.confirm('Are you sure you want to cancel this order? This will release any reserved stock.')) {
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      setSuccessMessage('');
      
      const token = localStorage.getItem('token');
      
      // Send cancel request
      const response = await axios.post(
        `http://localhost:5000/api/orders/${selectedOrder.id}/cancel`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      setSuccessMessage('Order cancelled successfully');
      
      // Refresh orders and clear selection
      fetchOrders();
      setSelectedOrder(null);
      setFulfillmentItems([]);
    } catch (error) {
      console.error('Error cancelling order:', error);
      
      if (error.response && error.response.data && error.response.data.error) {
        setError(error.response.data.error);
      } else {
        setError('Failed to cancel order');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const processBackorders = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccessMessage('');
      
      const token = localStorage.getItem('token');
      
      // Send process backorders request
      const response = await axios.post(
        'http://localhost:5000/api/orders/process-backorders',
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      const { processed_orders } = response.data;
      
      if (processed_orders && processed_orders.length > 0) {
        setSuccessMessage(`${processed_orders.length} backorders processed successfully`);
      } else {
        setSuccessMessage('No backorders needed processing');
      }
      
      // Refresh orders
      fetchOrders();
    } catch (error) {
      console.error('Error processing backorders:', error);
      
      if (error.response && error.response.data && error.response.data.error) {
        setError(error.response.data.error);
      } else {
        setError('Failed to process backorders');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Reserved':
        return 'bg-blue-100 text-blue-800';
      case 'Partially Reserved':
        return 'bg-indigo-100 text-indigo-800';
      case 'Backorder':
        return 'bg-red-100 text-red-800';
      case 'Fulfilled':
      case 'Shipped':
        return 'bg-green-100 text-green-800';
      case 'Partially Fulfilled':
        return 'bg-teal-100 text-teal-800';
      case 'Cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getProductName = (productId) => {
    const product = products.find(p => p.id === productId);
    return product ? product.name : 'Unknown Product';
  };
  
  const getWarehouseName = (warehouseId) => {
    const warehouse = warehouses.find(w => w.id === warehouseId);
    return warehouse ? warehouse.name : 'Unknown Warehouse';
  };
  
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Order Fulfillment</h1>
      
      {/* Success and Error Messages */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          {successMessage}
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {/* Process Backorders Button */}
      <div className="mb-6">
        <button
          onClick={processBackorders}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
        >
          {loading ? 'Processing...' : 'Process Backorders'}
        </button>
      </div>
      
      <div className="flex flex-col md:flex-row gap-6">
        {/* Orders List */}
        <div className="md:w-1/2">
          <h2 className="text-xl font-semibold mb-4">Orders</h2>
          
          {loading && !selectedOrder && (
            <div className="text-center py-4">Loading orders...</div>
          )}
          
          {orders.length === 0 && !loading && (
            <div className="text-center py-4 bg-gray-50 rounded">No orders found</div>
          )}
          
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 border-b text-left">ID</th>
                  <th className="px-4 py-2 border-b text-left">Status</th>
                  <th className="px-4 py-2 border-b text-left">Created</th>
                  <th className="px-4 py-2 border-b text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id} className={selectedOrder?.id === order.id ? 'bg-blue-50' : ''}>
                    <td className="px-4 py-2 border-b">#{order.id}</td>
                    <td className="px-4 py-2 border-b">
                      <span className={`px-2 py-1 rounded text-xs ${getStatusBadgeClass(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 border-b">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 border-b">
                      <button
                        onClick={() => handleOrderSelect(order.id)}
                        disabled={loading}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Order Details and Fulfillment */}
        <div className="md:w-1/2">
          {selectedOrder ? (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Order #{selectedOrder.id}</h2>
                <span className={`px-3 py-1 rounded ${getStatusBadgeClass(selectedOrder.status)}`}>
                  {selectedOrder.status}
                </span>
              </div>
              
              <div className="mb-4 bg-gray-50 p-4 rounded">
                <p><strong>Customer ID:</strong> {selectedOrder.customer_id}</p>
                <p><strong>Created:</strong> {new Date(selectedOrder.created_at).toLocaleString()}</p>
                {selectedOrder.shipping_address && (
                  <p><strong>Shipping Address:</strong> {selectedOrder.shipping_address}</p>
                )}
                {selectedOrder.notes && (
                  <p><strong>Notes:</strong> {selectedOrder.notes}</p>
                )}
              </div>
              
              <h3 className="font-semibold mb-2">Order Items</h3>
              
              {fulfillmentItems.length === 0 ? (
                <div className="text-center py-4 bg-gray-50 rounded">No items in this order</div>
              ) : (
                <div className="overflow-x-auto mb-4">
                  <table className="min-w-full bg-white border border-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 border-b text-left">Product</th>
                        <th className="px-4 py-2 border-b text-left">Warehouse</th>
                        <th className="px-4 py-2 border-b text-center">Qty</th>
                        <th className="px-4 py-2 border-b text-center">Fulfilled</th>
                        <th className="px-4 py-2 border-b text-center">Status</th>
                        <th className="px-4 py-2 border-b text-center">Fulfill Now</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fulfillmentItems.map((item, index) => (
                        <tr key={item.order_item_id}>
                          <td className="px-4 py-2 border-b">{getProductName(item.product_id)}</td>
                          <td className="px-4 py-2 border-b">{getWarehouseName(item.warehouse_id)}</td>
                          <td className="px-4 py-2 border-b text-center">{item.quantity}</td>
                          <td className="px-4 py-2 border-b text-center">{item.fulfilled_quantity || 0}</td>
                          <td className="px-4 py-2 border-b text-center">
                            <span className={`px-2 py-1 rounded text-xs ${getStatusBadgeClass(item.status)}`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-4 py-2 border-b text-center">
                            {item.status !== 'Fulfilled' ? (
                              <input
                                type="number"
                                min="0"
                                max={item.quantity - (item.fulfilled_quantity || 0)}
                                value={item.fulfill_quantity || 0}
                                onChange={(e) => handleQuantityChange(index, e.target.value)}
                                disabled={loading || item.status === 'Fulfilled'}
                                className="border rounded px-2 py-1 w-16 text-center"
                              />
                            ) : (
                              <span className="text-green-600">✓</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
                >
                  Back
                </button>
                
                {['Pending', 'Reserved', 'Partially Reserved', 'Backorder'].includes(selectedOrder.status) && (
                  <button
                    onClick={cancelOrder}
                    disabled={loading}
                    className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
                  >
                    {loading ? 'Processing...' : 'Cancel Order'}
                  </button>
                )}
                
                {['Reserved', 'Partially Reserved', 'Partially Fulfilled'].includes(selectedOrder.status) && (
                  <button
                    onClick={fulfillOrder}
                    disabled={loading || fulfillmentItems.every(item => item.status === 'Fulfilled')}
                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
                  >
                    {loading ? 'Processing...' : 'Fulfill Items'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 p-6 rounded text-center">
              <p className="text-gray-500">Select an order to view details and fulfill</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderFulfillment;