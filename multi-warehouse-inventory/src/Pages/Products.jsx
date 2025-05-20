import axios from 'axios';
import { useEffect, useState } from 'react';

// Predefined categories
const PRODUCT_CATEGORIES = [
  'Raw Materials',
  'Work-in-Progress (WIP)', 
  'Finished Goods', 
  'Maintenance, Repair, and Overhaul (MRO)'
];

// SKU Generation Utility Function
const generateSKU = (name, category) => {
  // Remove spaces and convert to uppercase
  const nameAbbr = name.replace(/\s+/g, '')
    .toUpperCase()
    .substring(0, 4); // Take first 4 characters

  // Create category code
  const categoryCode = {
    'Raw Materials': 'RM',
    'Work-in-Progress (WIP)': 'WIP',
    'Finished Goods': 'FG',
    'Maintenance, Repair, and Overhaul (MRO)': 'MRO'
  }[category] || 'UN'; // UN for Unknown

  // Generate a random 4-digit number
  const randomNumber = Math.floor(1000 + Math.random() * 9000);

  // Combine elements to create SKU
  return `${categoryCode}-${nameAbbr}-${randomNumber}`;
};

const Products = () => {
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [editProduct, setEditProduct] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    category: '',
    supplier_id: '',
    cost_price: '',
    selling_price: ''
  });
  const [stockData, setStockData] = useState({
    warehouse_id: '',
    quantity: ''
  });
  const [stockLevels, setStockLevels] = useState({});

  useEffect(() => {
    // Fetch products, stock levels, warehouses, and suppliers together
    const fetchData = async () => {
      try {
        // Fetch products
        const productsResponse = await axios.get('http://localhost:5000/api/products');
        setProducts(productsResponse.data);

        // Fetch suppliers
        const suppliersResponse = await axios.get('http://localhost:5000/api/suppliers');
        setSuppliers(suppliersResponse.data);

        // Fetch warehouses
        const warehousesResponse = await axios.get('http://localhost:5000/api/warehouses');
        setWarehouses(warehousesResponse.data);

        // Fetch stock levels
        const stockResponse = await axios.get('http://localhost:5000/api/stock');
        const stockMap = {};
        stockResponse.data.forEach(stock => {
          stockMap[`${stock.product_id}-${stock.warehouse_id}`] = stock.quantity;
        });
        setStockLevels(stockMap);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  // Open stock management modal
  const openStockModal = (product) => {
    setSelectedProduct(product);
    setStockData({
      warehouse_id: '',
      quantity: ''
    });
    setIsStockModalOpen(true);
  };

  // Handle stock addition/update
  const handleStockManagement = async (e) => {
  e.preventDefault();
  
  if (!selectedProduct || !stockData.warehouse_id || !stockData.quantity) {
    alert('Please fill in all stock details');
    return;
  }

  try {
    // Attempt to create or update stock directly
    await axios.post('http://localhost:5000/api/stock', {
      product_id: selectedProduct.id,
      warehouse_id: stockData.warehouse_id,
      quantity: parseInt(stockData.quantity)
    });

    // Refresh stock levels
    const stockResponse = await axios.get('http://localhost:5000/api/stock');
    const stockMap = {};
    stockResponse.data.forEach(stock => {
      stockMap[`${stock.product_id}-${stock.warehouse_id}`] = stock.quantity;
    });
    setStockLevels(stockMap);

    // Close the modal
    setIsStockModalOpen(false);
    alert('Stock updated successfully');
  } catch (error) {
    console.error('Error managing stock:', error);
    alert('Error managing stock: ' + error.message);
  }
};

  // Handle edit of a product
  const handleEdit = (product) => {
    setEditProduct(product);
  };

  // Save edited product
  const handleSave = (e) => {
    e.preventDefault();
    axios.put(`http://localhost:5000/api/products/${editProduct.id}`, editProduct)
      .then(() => {
        setProducts((prev) =>
          prev.map((product) =>
            product.id === editProduct.id ? editProduct : product
          )
        );
        setEditProduct(null); // Close the edit form
      })
      .catch(error => {
        console.error('Error updating product:', error);
        alert('Error updating product: ' + (error.response?.data?.message || error.message));
      });
  };

  // Handle changes in edit product form
  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditProduct((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  // Delete a product
const handleDelete = (productId) => {
  // Show confirmation dialog before deletion
  if (window.confirm('Are you sure you want to delete this product?')) {
    axios.delete(`http://localhost:5000/api/products/${productId}`)
      .then((response) => {
        // Update local state to remove the deleted product
        setProducts((prev) => prev.filter(product => product.id !== productId));
        alert('Product deleted successfully');
      })
      .catch(error => {
        console.error('Error deleting product:', error);
        
        // Handle different error response formats
        let errorMessage = 'Failed to delete product';
        
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          errorMessage = error.response.data?.message || 
                        error.response.data?.error || 
                        `Server error: ${error.response.status}`;
        } else if (error.request) {
          // The request was made but no response was received
          errorMessage = 'No response from server. Please check your connection.';
        } else {
          // Something happened in setting up the request that triggered an Error
          errorMessage = error.message;
        }
        
        alert('Error deleting product: ' + errorMessage);
      });
  }
};

  // New function to handle adding a new product
  const handleAddProduct = (e) => {
    e.preventDefault();
    
    // Auto-generate SKU if not provided
    const productToAdd = {
      ...newProduct,
      sku: newProduct.sku || generateSKU(newProduct.name, newProduct.category)
    };

    axios.post('http://localhost:5000/api/products', productToAdd)
      .then((response) => {
        // Add the new product to the list
        if (response.data.product) {
          setProducts((prev) => [...prev, response.data.product]);
        } else if (response.data && Array.isArray(response.data)) {
          setProducts((prev) => [...prev, response.data[0]]);
        } else if (response.data) {
          // Handle case where response.data is the product object directly
          setProducts((prev) => [...prev, response.data]);
        }
        
        // Reset the new product form and close modal
        setNewProduct({
          name: '',
          sku: '',
          category: '',
          supplier_id: '',
          cost_price: '',
          selling_price: ''
        });
        setIsAddModalOpen(false);
        alert('Product added successfully');
      })
      .catch(error => {
        console.error('Error adding product:', error);
        alert('Error adding product: ' + (error.response?.data?.message || error.message));
      });
  };

  // Handle changes in the new product form
  const handleNewProductChange = (e) => {
    const { name, value } = e.target;
    
    // If name changes and no SKU is manually set, auto-generate SKU
    if (name === 'name' && !newProduct.sku) {
      const autoSKU = generateSKU(value, newProduct.category);
      setNewProduct((prev) => ({
        ...prev,
        [name]: value,
        sku: autoSKU
      }));
    } else if (name === 'category' && newProduct.name) {
      // If category changes and name exists, regenerate SKU
      const autoSKU = generateSKU(newProduct.name, value);
      setNewProduct((prev) => ({
        ...prev,
        [name]: value,
        sku: autoSKU
      }));
    } else {
      // Normal change handling
      setNewProduct((prev) => ({
        ...prev,
        [name]: value
      }));
    }
  };

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-bold mb-4">Product Catalog Management</h1>

      {/* Add Product Button */}
      <button 
        onClick={() => setIsAddModalOpen(true)}
        className="mb-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
      >
        Add New Product
      </button>

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Add New Product</h2>
            <form onSubmit={handleAddProduct}>
              <div className="space-y-4">
                <input 
                  type="text" 
                  name="name" 
                  value={newProduct.name} 
                  onChange={handleNewProductChange} 
                  className="w-full p-2 border border-gray-300 rounded" 
                  placeholder="Product Name" 
                  required 
                />
                <input 
                  type="text" 
                  name="sku" 
                  value={newProduct.sku} 
                  onChange={handleNewProductChange} 
                  className="w-full p-2 border border-gray-300 rounded" 
                  placeholder="SKU (Auto-generated)" 
                />
                <select
                  name="category"
                  value={newProduct.category}
                  onChange={handleNewProductChange}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                >
                  <option value="">Select Category</option>
                  {PRODUCT_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <select
                  name="supplier_id"
                  value={newProduct.supplier_id}
                  onChange={handleNewProductChange}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.company_name || supplier.name}
                    </option>
                  ))}
                </select>
                <input 
                  type="number" 
                  name="cost_price" 
                  value={newProduct.cost_price} 
                  onChange={handleNewProductChange} 
                  className="w-full p-2 border border-gray-300 rounded" 
                  placeholder="Cost Price" 
                  required 
                  step="0.01" 
                />
                <input 
                  type="number" 
                  name="selling_price" 
                  value={newProduct.selling_price} 
                  onChange={handleNewProductChange} 
                  className="w-full p-2 border border-gray-300 rounded" 
                  placeholder="Selling Price" 
                  required 
                  step="0.01" 
                />
              </div>
              <div className="flex justify-end space-x-4 mt-6">
                <button 
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                  Add Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Management Modal */}
      {isStockModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Manage Stock for {selectedProduct?.name}</h2>
            <form onSubmit={handleStockManagement}>
              <div className="space-y-4">
                <select
                  value={stockData.warehouse_id}
                  onChange={(e) => setStockData(prev => ({
                    ...prev, 
                    warehouse_id: e.target.value
                  }))}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                >
                  <option value="">Select Warehouse</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
                <input 
                  type="number" 
                  value={stockData.quantity}
                  onChange={(e) => setStockData(prev => ({
                    ...prev, 
                    quantity: e.target.value
                  }))}
                  className="w-full p-2 border border-gray-300 rounded" 
                  placeholder="Quantity" 
                  required 
                  min="0"
                />
              </div>
              <div className="flex justify-end space-x-4 mt-6">
                <button 
                  type="button"
                  onClick={() => setIsStockModalOpen(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                  Save Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Edit Product</h2>
            <form onSubmit={handleSave}>
              <div className="space-y-4">
                <input 
                  type="text" 
                  name="name" 
                  value={editProduct.name} 
                  onChange={handleChange} 
                  className="w-full p-2 border border-gray-300 rounded" 
                  placeholder="Product Name" 
                  required 
                />
                <input 
                  type="text" 
                  name="sku" 
                  value={editProduct.sku} 
                  onChange={handleChange} 
                  className="w-full p-2 border border-gray-300 rounded" 
                  placeholder="SKU" 
                  required 
                />
                <select
                  name="category"
                  value={editProduct.category}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                >
                  <option value="">Select Category</option>
                  {PRODUCT_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <select
                  name="supplier_id"
                  value={editProduct.supplier_id}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.company_name || supplier.name}
                    </option>
                  ))}
                </select>
                <input 
                  type="number" 
                  name="cost_price" 
                  value={editProduct.cost_price} 
                  onChange={handleChange} 
                  className="w-full p-2 border border-gray-300 rounded" 
                  placeholder="Cost Price" 
                  step="0.01" 
                />
                <input 
                  type="number" 
                  name="selling_price" 
                  value={editProduct.selling_price} 
                  onChange={handleChange} 
                  className="w-full p-2 border border-gray-300 rounded" 
                  placeholder="Selling Price" 
                  step="0.01" 
                />
              </div>
              <div className="flex justify-end space-x-4 mt-6">
                <button 
                  type="button"
                  onClick={() => setEditProduct(null)}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Table */}
      <table className="min-w-full mt-4 rounded-lg overflow-hidden shadow-lg bg-white">
        <thead className="bg-gradient-to-r from-blue-100 to-blue-200">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-gray-700">Product Name</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700">SKU</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700">Category</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700">Supplier</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700">Cost Price</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700">Selling Price</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700">Stock Levels</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.length === 0 ? (
            <tr>
              <td colSpan="8" className="text-center py-8 text-gray-500">No products available.</td>
            </tr>
          ) : (
            products.map((product, idx) => {
              // Find the supplier name for this product
              const supplierObj = suppliers.find(supplier => supplier.id === product.supplier_id);
              const supplierName = supplierObj ? (supplierObj.company_name || supplierObj.name) : 'Unknown';

              // Compile stock levels across all warehouses
              const productStockLevels = warehouses.map(warehouse => ({
                warehouseName: warehouse.name,
                quantity: stockLevels[`${product.id}-${warehouse.id}`] ?? 0
              }));

              return (
                <tr
                  key={product.id}
                  className={`transition-colors duration-150 ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-blue-50`}
                >
                  <td className="px-4 py-3 max-w-xs truncate" title={product.name}>{product.name}</td>
                  <td className="px-4 py-3">{product.sku}</td>
                  <td className="px-4 py-3">{product.category}</td>
                  <td className="px-4 py-3 max-w-xs truncate" title={supplierName}>{supplierName}</td>
                  <td className="px-4 py-3 text-green-700 font-medium">₱{Number(product.cost_price).toLocaleString()}</td>
                  <td className="px-4 py-3 text-blue-700 font-medium">₱{Number(product.selling_price).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      {productStockLevels.map((stock, index) => (
                        <div key={index} className="text-xs text-gray-700">
                          <span className="font-semibold">{stock.warehouseName}:</span> {stock.quantity}
                        </div>
                      ))}
                    </div>
                    <button
                      className="mt-2 bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded shadow transition"
                      onClick={() => openStockModal(product)}
                    >
                      Manage Stock
                    </button>
                  </td>
                  <td className="px-4 py-3 flex flex-col gap-2 sm:flex-row sm:gap-0">
                    <button
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded shadow mr-2 transition"
                      onClick={() => handleEdit(product)}
                    >
                      Edit
                    </button>
                    <button
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded shadow transition"
                      onClick={() => handleDelete(product.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Products;