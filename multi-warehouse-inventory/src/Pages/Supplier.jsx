import { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, AlertTriangle } from 'lucide-react';
import PurchaseOrders from './components/PurchaseOrders';

const SupplierManagement = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState(null);
  const [formData, setFormData] = useState({ company_name: '', contact_info: '' });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [showPurchaseOrders, setShowPurchaseOrders] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [forceDelete, setForceDelete] = useState(false);
  const [relatedEntities, setRelatedEntities] = useState([]);

  // Fetch suppliers on component mount
  useEffect(() => {
    fetchSuppliers();
  }, []);

  // Filter suppliers when search term changes
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredSuppliers(suppliers);
    } else {
      const filtered = suppliers.filter(
        supplier => 
          supplier.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (supplier.contact_info && supplier.contact_info.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredSuppliers(filtered);
    }
  }, [searchTerm, suppliers]);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/suppliers');
      if (!response.ok) {
        throw new Error('Failed to fetch suppliers');
      }
      const data = await response.json();
      setSuppliers(data);
      setFilteredSuppliers(data);
      setError(null);
    } catch (err) {
      setError('Error loading suppliers: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const openModal = (supplier = null) => {
    if (supplier) {
      setCurrentSupplier(supplier);
      setFormData({ 
        company_name: supplier.company_name, 
        contact_info: supplier.contact_info || ''
      });
    } else {
      setCurrentSupplier(null);
      setFormData({ 
        company_name: '', 
        contact_info: '' 
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentSupplier(null);
    setFormData({ company_name: '', contact_info: '' });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      let response;
      if (currentSupplier) {
        // Update existing supplier
        response = await fetch(`http://localhost:5000/api/suppliers/${currentSupplier.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      } else {
        // Create new supplier
        response = await fetch('http://localhost:5000/api/suppliers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save supplier');
      }

      // Refresh supplier list
      await fetchSuppliers();
      closeModal();
    } catch (err) {
      setError(err.message);
    }
  };

  const openDeleteConfirm = (supplier) => {
    setCurrentSupplier(supplier);
    setDeleteConfirmOpen(true);
    setDeleteError(null);
    setForceDelete(false);
    setRelatedEntities([]);
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    setCurrentSupplier(null);
    setDeleteError(null);
    setForceDelete(false);
    setRelatedEntities([]);
  };

  const handleDelete = async () => {
    try {
      const url = forceDelete 
        ? `http://localhost:5000/api/suppliers/${currentSupplier.id}?force=true`
        : `http://localhost:5000/api/suppliers/${currentSupplier.id}`;
        
      const response = await fetch(url, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Check if this is a related entities error
        if (errorData.hasRelatedEntities) {
          setRelatedEntities(errorData.relatedEntities);
          setDeleteError(errorData.error);
          return;
        }
        
        throw new Error(errorData.error || 'Failed to delete supplier');
      }

      // Refresh supplier list
      await fetchSuppliers();
      closeDeleteConfirm();
    } catch (err) {
      setDeleteError(err.message);
    }
  };

  const viewSupplierPurchaseOrders = (supplier) => {
    setSelectedSupplier(supplier);
    setShowPurchaseOrders(true);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {!showPurchaseOrders ? (
        <>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Supplier Management</h1>
            <button 
              onClick={() => openModal()} 
              className="flex items-center bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              <Plus size={18} className="mr-1" />
              Add Supplier
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search suppliers..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="pl-10 pr-4 py-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Error Alert */}
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
              <div className="flex items-center">
                <AlertTriangle size={24} className="mr-2" />
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* Suppliers Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Information</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="3" className="px-6 py-4 text-center text-gray-500">Loading suppliers...</td>
                  </tr>
                ) : filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="px-6 py-4 text-center text-gray-500">
                      {searchTerm ? 'No suppliers match your search.' : 'No suppliers found. Add a supplier to get started.'}
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map(supplier => (
                    <tr key={supplier.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                        <button
                          onClick={() => viewSupplierPurchaseOrders(supplier)}
                          className="text-blue-600 hover:underline focus:outline-none"
                        >
                          {supplier.company_name}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">{supplier.contact_info || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => openModal(supplier)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => openDeleteConfirm(supplier)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Add/Edit Supplier Modal */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">{currentSupplier ? 'Edit Supplier' : 'Add New Supplier'}</h2>
                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      Company Name*
                    </label>
                    <input
                      type="text"
                      name="company_name"
                      value={formData.company_name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      Contact Information
                    </label>
                    <textarea
                      name="contact_info"
                      value={formData.contact_info}
                      onChange={handleInputChange}
                      rows="3"
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Phone, email, address, etc."
                    />
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="bg-gray-300 text-gray-800 px-4 py-2 rounded mr-2 hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      {currentSupplier ? 'Save Changes' : 'Add Supplier'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {deleteConfirmOpen && currentSupplier && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">Confirm Delete</h2>
                <p className="mb-4">
                  Are you sure you want to delete supplier <strong>{currentSupplier.company_name}</strong>?
                  {!relatedEntities.length && " This action cannot be undone."}
                </p>
                
                {deleteError && (
                  <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
                    <p>{deleteError}</p>
                  </div>
                )}
                
                {relatedEntities.length > 0 && (
                  <div className="mb-6">
                    <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
                      <div className="flex items-center">
                        <AlertTriangle size={20} className="mr-2" />
                        <p>This supplier has associated {relatedEntities.join(' and ')}.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center mb-4">
                      <input
                        type="checkbox"
                        id="forceDelete"
                        checked={forceDelete}
                        onChange={(e) => setForceDelete(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="forceDelete" className="ml-2 block text-sm text-red-700">
                        I understand that deleting this supplier will also delete all associated {relatedEntities.join(' and ')}.
                      </label>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end">
                  <button
                    onClick={closeDeleteConfirm}
                    className="bg-gray-300 text-gray-800 px-4 py-2 rounded mr-2 hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={relatedEntities.length > 0 && !forceDelete}
                    className={`${
                      relatedEntities.length > 0 && !forceDelete 
                        ? 'bg-red-300 cursor-not-allowed' 
                        : 'bg-red-600 hover:bg-red-700'
                    } text-white px-4 py-2 rounded`}
                  >
                    {relatedEntities.length > 0 && forceDelete ? 'Force Delete' : 'Delete Supplier'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div>
          <div className="flex items-center mb-8">
            <button
              onClick={() => setShowPurchaseOrders(false)}
              className="mr-4 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md"
            >
              &larr; Back to Suppliers
            </button>
            <h1 className="text-2xl font-bold text-gray-800">
              Purchase Orders for {selectedSupplier?.company_name}
            </h1>
          </div>
          
          <PurchaseOrders supplierId={selectedSupplier?.id} supplierName={selectedSupplier?.company_name} />
        </div>
      )}
    </div>
  );
}

export default SupplierManagement;