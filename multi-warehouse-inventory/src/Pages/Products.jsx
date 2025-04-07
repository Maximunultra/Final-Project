import axios from 'axios';
import { useEffect, useState } from 'react';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [editProduct, setEditProduct] = useState(null);
  const [stockLevels, setStockLevels] = useState({});

  useEffect(() => {
    // Fetch products and stock levels together
    const fetchProductsAndStock = async () => {
      try {
        const productsResponse = await axios.get('http://localhost:5000/api/products');
        setProducts(productsResponse.data);

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

    fetchProductsAndStock();
  }, []);

  const updateStock = async (productId) => {
    const newQuantity = prompt("Enter new stock quantity:");
    if (!newQuantity) return;

    try {
      await axios.put(`http://localhost:5000/api/stock/${productId}`, {
        quantity: parseInt(newQuantity),
      });

      alert('Stock updated successfully');
      window.location.reload(); // Refresh stock levels
    } catch (error) {
      console.error('Error updating stock:', error);
    }
  };

  const handleEdit = (product) => {
    setEditProduct(product);
  };

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
      });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditProduct((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDelete = (productId) => {
    axios.delete(`http://localhost:5000/api/products/${productId}`)
      .then(() => {
        setProducts((prev) => prev.filter(product => product.id !== productId));
      })
      .catch(error => {
        console.error('Error deleting product:', error);
      });
  };

  return (
    <>
    
    <div>
      <h1 className="text-2xl font-bold">Product Management</h1>

      {/* Edit Product Form */}
      {editProduct && (
        <div className="mt-4 p-4 border border-gray-300 rounded-lg">
          <h2 className="text-xl font-semibold">Edit Product</h2>
          <form onSubmit={handleSave}>
            <input type="text" name="name" value={editProduct.name} onChange={handleChange} className="w-full p-2 mt-2 mb-4 border border-gray-300 rounded" placeholder="Product Name" />
            <input type="text" name="sku" value={editProduct.sku} onChange={handleChange} className="w-full p-2 mb-4 border border-gray-300 rounded" placeholder="SKU" />
            <input type="text" name="category" value={editProduct.category} onChange={handleChange} className="w-full p-2 mb-4 border border-gray-300 rounded" placeholder="Category" />
            <input type="text" name="supplier" value={editProduct.supplier} onChange={handleChange} className="w-full p-2 mb-4 border border-gray-300 rounded" placeholder="Supplier" />
            <input type="number" name="cost_price" value={editProduct.cost_price} onChange={handleChange} className="w-full p-2 mb-4 border border-gray-300 rounded" placeholder="Cost Price" />
            <input type="number" name="selling_price" value={editProduct.selling_price} onChange={handleChange} className="w-full p-2 mb-4 border border-gray-300 rounded" placeholder="Selling Price" />
            <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">Save</button>
            <button type="button" className="bg-gray-500 text-white px-4 py-2 rounded ml-2" onClick={() => setEditProduct(null)}>Cancel</button>
          </form>
        </div>
      )}

      {/* Product Table */}
      <table className="min-w-full table-auto mt-4">
        <thead className="bg-gray-200">
          <tr>
            <th className="px-4 py-2">Product Name</th>
            <th className="px-4 py-2">SKU</th>
            <th className="px-4 py-2">Category</th>
            <th className="px-4 py-2">Supplier</th>
            <th className="px-4 py-2">Cost Price</th>
            <th className="px-4 py-2">Selling Price</th>
            <th className="px-4 py-2">Stock Level</th>
            <th className="px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.length === 0 ? (
            <tr>
              <td colSpan="8" className="text-center py-4">No products available.</td>
            </tr>
          ) : (
            products.map((product) => (
              <tr key={product.id}>
                <td className="px-4 py-2">{product.name}</td>
                <td className="px-4 py-2">{product.sku}</td>
                <td className="px-4 py-2">{product.category}</td>
                <td className="px-4 py-2">{product.supplier}</td>
                <td className="px-4 py-2">{product.cost_price}</td>
                <td className="px-4 py-2">{product.selling_price}</td>
                <td className="px-4 py-2">
                  {stockLevels[`${product.id}-1`] ?? 'N/A'} {/* Assuming warehouse_id = 1 for now */}
                  <button className="bg-yellow-500 text-white px-4 py-1 ml-2 rounded" onClick={() => updateStock(product.id)}>Update Stock</button>
                </td>
                <td className="px-4 py-2">
                  <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={() => handleEdit(product)}>Edit</button>
                  <button className="bg-red-500 text-white px-4 py-2 ml-2 rounded" onClick={() => handleDelete(product.id)}>Delete</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
    </>
  );

};

export default Products;
