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
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/warehouses');
      setWarehouses(response.data);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };

  const fetchStockMovements = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/stock_movements');
      setStockMovements(response.data);
    } catch (error) {
      console.error('Error fetching stock movements:', error);
    }
  };

  const transferStock = async () => {
    if (!product_id || !quantity || !source_warehouse_id || !destination_warehouse_id) {
      return alert('Please fill in all fields');
    }
    if (source_warehouse_id === destination_warehouse_id) {
      return alert('Source and destination cannot be the same');
    }

    try {
      await axios.post('http://localhost:5000/api/transfer', {
        product_id,
        quantity,
        source_warehouse_id,
        destination_warehouse_id,
      });
      alert('Stock transferred successfully');
      fetchStockMovements();
      setProductId('');
      setQuantity('');
      setSourceWarehouseId('');
      setDestinationWarehouseId('');
    } catch (error) {
      console.error('Error transferring stock:', error);
      alert('Failed to transfer stock. Check if there is enough stock.');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">Stock Movement</h1>

      {/* Stock Transfer Form */}
      <div className="mt-4">
        <select onChange={(e) => setProductId(e.target.value)} className="border p-2 mr-2" value={product_id}>
          <option value="">Select Product</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>

        <input type="number" placeholder="Quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="border p-2 mr-2" />

        <select onChange={(e) => setSourceWarehouseId(e.target.value)} className="border p-2 mr-2" value={source_warehouse_id}>
          <option value="">Source Warehouse</option>
          {warehouses.map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>
              {warehouse.name}
            </option>
          ))}
        </select>

        <select onChange={(e) => setDestinationWarehouseId(e.target.value)} className="border p-2 mr-2" value={destination_warehouse_id}>
          <option value="">Destination Warehouse</option>
          {warehouses.map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>
              {warehouse.name}
            </option>
          ))}
        </select>

        <button onClick={transferStock} className="bg-blue-500 text-white px-4 py-2 rounded">
          Transfer Stock
        </button>
      </div>

      {/* Stock Movement Table */}
      <table className="min-w-full table-auto mt-4">
        <thead className="bg-gray-200">
          <tr>
            <th className="px-4 py-2">Product</th>
            <th className="px-4 py-2">Quantity</th>
            <th className="px-4 py-2">Source Warehouse</th>
            <th className="px-4 py-2">Destination Warehouse</th>
            <th className="px-4 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {stockMovements.map((movement) => (
            <tr key={movement.id}>
              <td className="px-4 py-2">{products.find((p) => p.id === movement.product_id)?.name || 'Unknown'}</td>
              <td className="px-4 py-2">{movement.quantity}</td>
              <td className="px-4 py-2">{warehouses.find((w) => w.id === movement.source_warehouse_id)?.name || 'Unknown'}</td>
              <td className="px-4 py-2">{warehouses.find((w) => w.id === movement.destination_warehouse_id)?.name || 'Unknown'}</td>
              <td className="px-4 py-2">{movement.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StockMovement;
