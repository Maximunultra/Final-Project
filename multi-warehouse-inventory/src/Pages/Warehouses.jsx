import axios from 'axios';
import { useEffect, useState } from 'react';

const Warehouse = () => {
  const [warehouses, setWarehouses] = useState([]);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState('');

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/warehouses');
      setWarehouses(response.data);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };

  const addWarehouse = async () => {
    if (!name) return alert('Warehouse name is required');

    try {
      await axios.post('http://localhost:5000/api/warehouses', { name, location, capacity });
      alert('Warehouse added successfully');
      fetchWarehouses();
      setName('');
      setLocation('');
      setCapacity('');
    } catch (error) {
      console.error('Error adding warehouse:', error);
    }
  };

  const deleteWarehouse = async (id) => {
    if (!window.confirm('Are you sure you want to delete this warehouse?')) return;

    try {
      await axios.delete(`http://localhost:5000/api/warehouses/${id}`);
      alert('Warehouse deleted successfully');
      fetchWarehouses();
    } catch (error) {
      console.error('Error deleting warehouse:', error);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">Warehouse Management</h1>

      {/* Add Warehouse Form */}
      <div className="mt-4">
        <input
          type="text"
          placeholder="Warehouse Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2 mr-2"
        />
        <input
          type="text"
          placeholder="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="border p-2 mr-2"
        />
        <input
          type="number"
          placeholder="Capacity"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          className="border p-2 mr-2"
        />
        <button onClick={addWarehouse} className="bg-green-500 text-white px-4 py-2 rounded">
          Add Warehouse
        </button>
      </div>

      {/* Warehouse Table */}
      <table className="min-w-full table-auto mt-4">
        <thead className="bg-gray-200">
          <tr>
            <th className="px-4 py-2">Warehouse Name</th>
            <th className="px-4 py-2">Location</th>
            <th className="px-4 py-2">Capacity</th>
            <th className="px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {warehouses.length === 0 ? (
            <tr>
              <td colSpan="4" className="text-center py-4">No warehouses available.</td>
            </tr>
          ) : (
            warehouses.map((warehouse) => (
              <tr key={warehouse.id}>
                <td className="px-4 py-2">{warehouse.name}</td>
                <td className="px-4 py-2">{warehouse.location || 'N/A'}</td>
                <td className="px-4 py-2">{warehouse.capacity}</td>
                <td className="px-4 py-2">
                  <button
                    className="bg-red-500 text-white px-4 py-2 rounded"
                    onClick={() => deleteWarehouse(warehouse.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Warehouse;
