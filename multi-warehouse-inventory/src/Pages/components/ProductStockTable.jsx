// components/ProductStockTable.jsx - Component for displaying all products with their stock levels
import React from 'react';

const ProductStockTable = ({ products, updateThreshold }) => {
  return (
    <div>
      <h3 className="text-lg font-medium mb-3">All Products Stock Levels</h3>
      <div className="bg-white shadow overflow-hidden rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Threshold</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map(product => (
              <tr key={product.id}>
                <td className="px-6 py-4 whitespace-nowrap">{product.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{product.sku}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={product.totalStock < product.threshold ? "font-medium text-red-600" : ""}>
                    {product.totalStock}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <input 
                      type="number"
                      min="0"
                      value={product.threshold}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value) && value >= 0) {
                          // This will be handled by the parent component
                        }
                      }}
                      onBlur={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value) && value >= 0) {
                          updateThreshold(product.id, value);
                        }
                      }}
                      className="w-16 p-1 text-center border rounded mr-2"
                    />
                    <span className="text-xs text-gray-500">units</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {product.totalStock < product.threshold ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      Low Stock
                    </span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      OK
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => updateThreshold(product.id, product.threshold - 1)}
                      disabled={product.threshold <= 0}
                      className={`text-xs px-2 py-1 rounded ${
                        product.threshold <= 0 
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      -
                    </button>
                    <button 
                      onClick={() => updateThreshold(product.id, product.threshold + 1)}
                      className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
                    >
                      +
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductStockTable;