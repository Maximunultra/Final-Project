import axios from 'axios';
import { useEffect, useState } from 'react';

const StockMovement = () => {
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  const [product_id, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [source_warehouse_id, setSourceWarehouseId] = useState('');
  const [destination_warehouse_id, setDestinationWarehouseId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProducts();
    fetchWarehouses();
    fetchStockMovements();
  }, []);

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

  const fetchStockMovements = async () => {
    try {
      const token = localStorage.getItem('token'); // Replace with your storage key
    
      const response = await axios.get('http://localhost:5000/api/stock_movements', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    
      setStockMovements(response.data);
    } catch (error) {
      console.error('Error fetching stock movements:', error);
      setError('Failed to fetch stock movements');
    }
  };

  const transferStock = async () => {
    // Form validation
    if (!product_id || !quantity || !source_warehouse_id || !destination_warehouse_id) {
      return alert('Please fill in all fields');
    }
    
    if (source_warehouse_id === destination_warehouse_id) {
      return alert('Source and destination cannot be the same');
    }
    
    if (parseInt(quantity) <= 0) {
      return alert('Quantity must be greater than zero');
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      
      await axios.post('http://localhost:5000/api/stock_movements/transfer', {
        product_id,
        quantity: parseInt(quantity),
        source_warehouse_id,
        destination_warehouse_id,
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      alert('Stock transferred successfully');
      fetchStockMovements(); // Refresh the stock movements list
      
      // Reset form fields
      setProductId('');
      setQuantity('');
      setSourceWarehouseId('');
      setDestinationWarehouseId('');
    } catch (error) {
      console.error('Error transferring stock:', error);
      
      // Handle different error types
      if (error.response && error.response.data && error.response.data.error) {
        setError(error.response.data.error);
        alert(`Failed to transfer stock: ${error.response.data.error}`);
      } else {
        setError('Failed to transfer stock. Please try again.');
        alert('Failed to transfer stock. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">Stock Movement</h1>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-4">{error}</div>}

      {/* Stock Transfer Form */}
      <div className="mt-4">
        <select 
          onChange={(e) => setProductId(e.target.value)} 
          className="border p-2 mr-2" 
          value={product_id}
          disabled={loading}
        >
          <option value="">Select Product</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>

        <input 
          type="number" 
          placeholder="Quantity" 
          value={quantity} 
          onChange={(e) => setQuantity(e.target.value)} 
          className="border p-2 mr-2"
          min="1"
          disabled={loading}
        />

        <select 
          onChange={(e) => setSourceWarehouseId(e.target.value)} 
          className="border p-2 mr-2" 
          value={source_warehouse_id}
          disabled={loading}
        >
          <option value="">Source Warehouse</option>
          {warehouses.map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>
              {warehouse.name}
            </option>
          ))}
        </select>

        <select 
          onChange={(e) => setDestinationWarehouseId(e.target.value)} 
          className="border p-2 mr-2" 
          value={destination_warehouse_id}
          disabled={loading}
        >
          <option value="">Destination Warehouse</option>
          {warehouses.map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>
              {warehouse.name}
            </option>
          ))}
        </select>

        <button 
          onClick={transferStock} 
          className={`${loading ? 'bg-blue-300' : 'bg-blue-500'} text-white px-4 py-2 rounded`}
          disabled={loading}
        >
          {loading ? 'Transferring...' : 'Transfer Stock'}
        </button>
      </div>

      {/* Stock Movement Table */}
      <div className="overflow-x-auto mt-6">
        <h2 className="text-xl font-semibold mb-2">Stock Movement History</h2>
        <table className="min-w-full table-auto">
          <thead className="bg-gray-200">
            <tr>
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2">Quantity</th>
              <th className="px-4 py-2">Source Warehouse</th>
              <th className="px-4 py-2">Destination Warehouse</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {stockMovements.length > 0 ? (
              stockMovements.map((movement) => (
                <tr key={movement.id} className="border-b">
                  <td className="px-4 py-2">{movement.product_name || 'Unknown'}</td>
                  <td className="px-4 py-2">{movement.quantity}</td>
                  <td className="px-4 py-2">{movement.source_warehouse_name || 'Unknown'}</td>
                  <td className="px-4 py-2">{movement.destination_warehouse_name || 'Unknown'}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded text-xs ${movement.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {movement.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">{movement.transfer_date ? new Date(movement.transfer_date).toLocaleString() : ''}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-4 py-2 text-center">No stock movements found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StockMovement;