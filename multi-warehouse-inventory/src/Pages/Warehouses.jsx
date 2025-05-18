import { useEffect, useState } from 'react';
import axios from 'axios';

const Modal = ({ isOpen, title, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0  bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
        <div className="flex justify-between items-center border-b px-6 py-3">
          <h3 className="text-lg font-medium">{title}</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

const WarehouseForm = ({ formData, isEditing, handleInputChange, handleSubmit, resetForm }) => {
  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse Name*</label>
        <input
          type="text"
          name="name"
          placeholder="Enter name"
          value={formData.name}
          onChange={handleInputChange}
          className="border p-2 rounded w-full"
          required
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
        <input
          type="text"
          name="location"
          placeholder="Enter location"
          value={formData.location}
          onChange={handleInputChange}
          className="border p-2 rounded w-full"
        />
      </div>
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
        <input
          type="number"
          name="capacity"
          placeholder="Enter capacity"
          value={formData.capacity}
          onChange={handleInputChange}
          className="border p-2 rounded w-full"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button 
          type="button" 
          onClick={resetForm}
          className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
        >
          Cancel
        </button>
        <button 
          type="submit" 
          className={`px-4 py-2 rounded text-white ${isEditing ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-500 hover:bg-green-600'}`}
        >
          {isEditing ? 'Update' : 'Add'} Warehouse
        </button>
      </div>
    </form>
  );
};

const Warehouse = () => {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form states
  const [isEditing, setIsEditing] = useState(false);
  const [currentWarehouse, setCurrentWarehouse] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    capacity: ''
  });
  
  // Search and sort states
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/warehouses');
      setWarehouses(response.data);
      setError(null);
    } catch (err) {
      setError('Error fetching warehouses. Please try again later.');
      console.error('Error fetching warehouses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'capacity' ? (value === '' ? '' : Number(value)) : value
    });
  };

  const resetForm = () => {
    setFormData({ name: '', location: '', capacity: '' });
    setIsEditing(false);
    setCurrentWarehouse(null);
    setIsModalOpen(false);
  };

  const openAddModal = () => {
    setIsEditing(false);
    setFormData({ name: '', location: '', capacity: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (warehouse) => {
    setIsEditing(true);
    setCurrentWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      location: warehouse.location || '',
      capacity: warehouse.capacity || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name) {
      alert('Warehouse name is required');
      return;
    }

    try {
      if (isEditing && currentWarehouse) {
        await axios.put(
          `http://localhost:5000/api/warehouses/${currentWarehouse.id}`, 
          formData
        );
        alert('Warehouse updated successfully');
      } else {
        await axios.post('http://localhost:5000/api/warehouses', formData);
        alert('Warehouse added successfully');
      }
      
      fetchWarehouses();
      resetForm();
    } catch (err) {
      const action = isEditing ? 'updating' : 'adding';
      alert(`Error ${action} warehouse. Please try again.`);
      console.error(`Error ${action} warehouse:`, err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this warehouse?')) return;

    try {
      await axios.delete(`http://localhost:5000/api/warehouses/${id}`);
      alert('Warehouse deleted successfully');
      fetchWarehouses();
    } catch (err) {
      alert('Error deleting warehouse. Please try again.');
      console.error('Error deleting warehouse:', err);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Default to ascending for a new field
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter and sort warehouses
  const filteredWarehouses = warehouses
    .filter(warehouse => 
      warehouse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (warehouse.location && warehouse.location.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      let comparison = 0;
      const fieldA = a[sortField] || '';
      const fieldB = b[sortField] || '';
      
      if (fieldA < fieldB) {
        comparison = -1;
      } else if (fieldA > fieldB) {
        comparison = 1;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  // Get sorting indicator
  const getSortIndicator = (field) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Warehouse Management</h1>
        <button 
          onClick={openAddModal}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded flex items-center"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Warehouse
        </button>
      </div>
      
      {/* Error message */}
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      
      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search warehouses..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border p-2 rounded w-full"
        />
      </div>
      
      {/* Warehouse Form Modal */}
      <Modal 
        isOpen={isModalOpen} 
        title={isEditing ? 'Edit Warehouse' : 'Add New Warehouse'} 
        onClose={resetForm}
      >
        <WarehouseForm 
          formData={formData}
          isEditing={isEditing}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          resetForm={resetForm}
        />
      </Modal>
      
      {/* Warehouse Table */}
      {loading ? (
        <div className="text-center py-4">Loading warehouses...</div>
      ) : (
        <div className="overflow-x-auto bg-white shadow rounded-lg">
          <table className="min-w-full table-auto">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th 
                  className="px-4 py-3 text-left cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSort('name')}
                >
                  Warehouse Name {getSortIndicator('name')}
                </th>
                <th 
                  className="px-4 py-3 text-left cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSort('location')}
                >
                  Location {getSortIndicator('location')}
                </th>
                <th 
                  className="px-4 py-3 text-left cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSort('capacity')}
                >
                  Capacity {getSortIndicator('capacity')}
                </th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredWarehouses.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-4 text-gray-500">
                    {searchTerm ? 'No matching warehouses found.' : 'No warehouses available.'}
                  </td>
                </tr>
              ) : (
                filteredWarehouses.map((warehouse) => (
                  <tr key={warehouse.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">{warehouse.name}</td>
                    <td className="px-4 py-3">{warehouse.location || 'N/A'}</td>
                    <td className="px-4 py-3">{warehouse.capacity || 'N/A'}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        className="bg-blue-500 text-white px-3 py-1 rounded mr-2 hover:bg-blue-600"
                        onClick={() => openEditModal(warehouse)}
                      >
                        Edit
                      </button>
                      <button
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                        onClick={() => handleDelete(warehouse.id)}
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
      )}
    </div>
  );
};

export default Warehouse;