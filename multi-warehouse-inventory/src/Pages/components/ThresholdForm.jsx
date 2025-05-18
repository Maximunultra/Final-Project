// components/ThresholdForm.jsx - Component for setting new thresholds
import React from 'react';

const ThresholdForm = ({ products, newThreshold, setNewThreshold, handleThresholdSubmit }) => {
  return (
    <div className="bg-gray-50 p-4 rounded-lg mb-6">
      <form onSubmit={handleThresholdSubmit} className="flex flex-wrap gap-4">
        <div className="flex-1">
          <label className="block mb-1 text-sm font-medium">Product</label>
          <select 
            value={newThreshold.product_id} 
            onChange={(e) => setNewThreshold({...newThreshold, product_id: e.target.value})}
            className="w-full p-2 border rounded"
            required
          >
            <option value="">Select a product</option>
            {products.map(product => (
              <option key={product.id} value={product.id}>
                {product.name} (SKU: {product.sku})
              </option>
            ))}
          </select>
        </div>
        <div className="w-32">
          <label className="block mb-1 text-sm font-medium">Threshold</label>
          <input 
            type="number" 
            min="0"
            value={newThreshold.threshold} 
            onChange={(e) => setNewThreshold({...newThreshold, threshold: e.target.value})}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <div className="flex items-end">
          <button type="submit" className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">
            Save Threshold
          </button>
        </div>
      </form>
    </div>
  );
};

export default ThresholdForm;