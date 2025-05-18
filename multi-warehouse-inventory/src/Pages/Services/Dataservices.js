// services/dataService.js - API service functions for fetching inventory data

import axios from 'axios';

// API base URL - should be configured via environment variables in a real app
const API_BASE_URL = 'http://localhost:5000/api';

/**
 * Fetch all products from the API
 * @returns {Promise<Array>} Products data
 */
export const fetchProductsData = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/products`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};

/**
 * Fetch stock levels from all warehouses
 * @returns {Promise<Array>} Stock data
 */
export const fetchStockData = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/stock`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching stock data:', error);
    throw error;
  }
};

/**
 * Fetch threshold settings for all products
 * @returns {Promise<Object>} Thresholds data object with product_id as keys
 */
export const fetchThresholdsData = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/thresholds`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      }
    });
    
    // Convert array to object with product_id as keys for easier lookup
    const thresholdsMap = {};
    response.data.forEach(item => {
      thresholdsMap[item.product_id] = item.threshold;
    });
    
    return thresholdsMap;
  } catch (error) {
    console.error('Error fetching thresholds:', error);
    throw error;
  }
};

/**
 * Update threshold for a specific product
 * @param {number} productId - Product ID
 * @param {number} threshold - New threshold value
 * @returns {Promise<Object>} Updated threshold data
 */
export const updateProductThreshold = async (productId, threshold) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/thresholds`, {
      product_id: productId,
      threshold: threshold
    }, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error updating threshold:', error);
    throw error;
  }
};

/**
 * Fetch stock movements history with optional date filtering
 * @param {Object} dateRange - Optional date range object with startDate and endDate
 * @returns {Promise<Array>} Stock movements data
 */
export const fetchStockMovementsData = async (dateRange = null) => {
  try {
    let params = {};
    if (dateRange) {
      params = {
        start_date: dateRange.startDate,
        end_date: dateRange.endDate
      };
    }
    
    const response = await axios.get(`${API_BASE_URL}/stock_movements`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      params
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    throw error;
  }
};

/**
 * Fetch warehouse information
 * @returns {Promise<Array>} Warehouses data
 */
export const fetchWarehousesData = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/warehouses`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching warehouses:', error);
    throw error;
  }
};

export default {
  fetchProductsData,
  fetchStockData,
  fetchThresholdsData,
  updateProductThreshold,
  fetchStockMovementsData,
  fetchWarehousesData
};