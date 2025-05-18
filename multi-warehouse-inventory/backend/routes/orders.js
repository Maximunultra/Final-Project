import express from 'express';
import { supabase } from '../server.js';
import authorize from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Create a new order and reserve stock
 */
router.post("/", async (req, res) => {
  const { product_id, quantity, status = 'Pending', warehouse_id } = req.body;

  if (!product_id || !quantity || !warehouse_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Create a transaction by using supabase client
  try {
    // Setting a timeout for the fulfillment API call
    const FULFILLMENT_TIMEOUT_MS = 5000; // 5 seconds timeout

    // 1. Insert order directly - more efficient to avoid multiple DB calls
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          product_id,
          quantity,
          status,
          order_date: new Date()
        }
      ])
      .select();

    if (orderError || !orderData || orderData.length === 0) {
      throw new Error(orderError?.message || "Failed to create order");
    }

    const order_id = orderData[0].id;
    
    // 2. Create a Promise with timeout for the stock reservation
    const reservationPromise = new Promise(async (resolve, reject) => {
      // Set a timeout to prevent the request from hanging indefinitely
      const timeoutId = setTimeout(() => {
        reject(new Error("Stock reservation timed out"));
      }, FULFILLMENT_TIMEOUT_MS);
      
      try {
        // Perform the reservation request
        const reservationResponse = await fetch(`http://localhost:5000/api/fulfillment/reserve`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.authorization
          },
          body: JSON.stringify({ order_id, product_id, quantity, warehouse_id })
        });
        
        // Clear the timeout as the response was received
        clearTimeout(timeoutId);
        
        // Check if the response is ok
        if (!reservationResponse.ok) {
          const errorData = await reservationResponse.json();
          reject(new Error(`Reservation failed: ${errorData.error || 'Unknown error'}`));
          return;
        }
        
        const reservationResult = await reservationResponse.json();
        resolve(reservationResult);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
    
    // Execute the reservation with timeout handling
    try {
      const reservationResult = await reservationPromise;
      
      res.status(201).json({
        order: orderData[0],
        fulfillment: reservationResult
      });
    } catch (error) {
      console.error("Reservation error:", error);
      
      // If reservation fails, try to clean up the order
      const { error: deleteError } = await supabase
        .from('orders')
        .delete()
        .eq('id', order_id);
      
      if (deleteError) {
        console.error("Error deleting order after reservation failure:", deleteError);
      }
      
      return res.status(500).json({ 
        error: "Failed to reserve stock", 
        details: error.message,
        message: "The order was created but stock reservation timed out. Please try again."
      });
    }
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ error: "Error placing order", details: error.message });
  }
});

/**
 * Delete an order and clean up reservations
 */
router.delete("/:id", authorize, async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Check reservations
    const { data: reservations, error: reservationCheckError } = await supabase
      .from('stock_reservations')
      .select('*')
      .eq('order_id', id);

    if (reservationCheckError) throw reservationCheckError;

    // 2. Return stock for each reserved item
    for (const reservation of reservations || []) {
      if (reservation.status === 'Reserved') {
        const { data: stockData, error: stockError } = await supabase
          .from('stock')
          .select('quantity')
          .eq('product_id', reservation.product_id)
          .eq('warehouse_id', reservation.warehouse_id)
          .single();

        if (stockError) throw stockError;

        const newQuantity = stockData.quantity + reservation.quantity;

        const { error: stockUpdateError } = await supabase
          .from('stock')
          .update({ quantity: newQuantity, updated_at: new Date() })
          .eq('product_id', reservation.product_id)
          .eq('warehouse_id', reservation.warehouse_id);

        if (stockUpdateError) throw stockUpdateError;

        await supabase
          .from('stock_reservations')
          .update({ status: 'Cancelled' })
          .eq('id', reservation.id);
      }
    }

    // 3. Cancel backorders
    await supabase
      .from('backorders')
      .update({ status: 'Cancelled' })
      .eq('order_id', id);

    // 4. Delete the order
    const { error: deleteError } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    res.json({ message: "Order and related reservations deleted successfully" });
  } catch (error) {
    console.error("Error in delete process:", error);
    res.status(500).json({ error: "Error deleting order", details: error.message });
  }
});

/**
 * Ship an order
 */
router.post("/:id/ship", authorize, async (req, res) => {
  const { id } = req.params;
  const { ship_date } = req.body;
  const SHIPPING_TIMEOUT_MS = 5000; // 5 seconds timeout

  try {
    // Create a Promise with timeout for shipping
    const shipPromise = new Promise(async (resolve, reject) => {
      // Set a timeout to prevent the request from hanging indefinitely
      const timeoutId = setTimeout(() => {
        reject(new Error("Order shipping timed out"));
      }, SHIPPING_TIMEOUT_MS);
      
      try {
        const shipResponse = await fetch(`http://localhost:5000/api/fulfillment/ship`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.authorization
          },
          body: JSON.stringify({
            order_id: id,
            actual_ship_date: ship_date || new Date()
          })
        });
        
        // Clear the timeout as the response was received
        clearTimeout(timeoutId);
        
        // Check if the response is ok
        if (!shipResponse.ok) {
          const errorData = await shipResponse.json();
          reject(new Error(`Shipping failed: ${errorData.error || 'Unknown error'}`));
          return;
        }
        
        const shipResult = await shipResponse.json();
        resolve({ status: shipResponse.status, data: shipResult });
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
    
    // Execute the shipping with timeout handling
    try {
      const { status, data: shipResult } = await shipPromise;
      res.status(status).json(shipResult);
    } catch (error) {
      console.error("Shipping error:", error);
      return res.status(500).json({ 
        error: "Failed to ship order", 
        details: error.message,
        message: "The shipping process timed out. Please try again."
      });
    }
  } catch (error) {
    console.error("Error shipping order:", error);
    res.status(500).json({ error: "Error shipping order", details: error.message });
  }
});

/**
 * Get orders with pagination and filtering
 */
router.get("/", authorize, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, product_id } = req.query;
    const offset = (page - 1) * limit;
    
    // Build query with filters
    let query = supabase
      .from('orders')
      .select('*, products(name)')
      .range(offset, offset + limit - 1)
      .order('order_date', { ascending: false });
    
    // Apply filters if provided
    if (status) {
      query = query.eq('status', status);
    }
    
    if (product_id) {
      query = query.eq('product_id', product_id);
    }
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    res.json({
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count
      }
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Error fetching orders", details: error.message });
  }
});

/**
 * Get order by ID with related data
 */
router.get("/:id", authorize, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the order with product details
    const { data: order, error } = await supabase
      .from('orders')
      .select('*, products(name, description, sku)')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    // Get reservations
    const { data: reservations } = await supabase
      .from('stock_reservations')
      .select('*')
      .eq('order_id', id);
    
    // Get backorders if any
    const { data: backorders } = await supabase
      .from('backorders')
      .select('*')
      .eq('order_id', id);
    
    res.json({
      order,
      reservations: reservations || [],
      backorders: backorders || []
    });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({ error: "Error fetching order details", details: error.message });
  }
});

export default router;