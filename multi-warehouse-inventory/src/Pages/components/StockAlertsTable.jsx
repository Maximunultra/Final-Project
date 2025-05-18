// components/StockAlertsTable.jsx - Component for displaying low stock alerts
import React from 'react';

const StockAlertsTable = ({ alerts, updateThreshold }) => {
  return (
    <div className="mb-8">
      <h3 className="text-lg font-medium mb-3">Current Alerts ({alerts.length})</h3>
      {alerts.length === 0 ? (
        <p className="text-gray-500 italic">No low stock alerts at this time.</p>
      ) : (
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
              {alerts.map(alert => (
                <tr key={alert.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{alert.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{alert.sku}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium text-red-600">{alert.currentStock}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{alert.threshold}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      Low Stock
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button 
                      onClick={() => updateThreshold(alert.id, alert.threshold + 5)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      Increase Threshold
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StockAlertsTable;