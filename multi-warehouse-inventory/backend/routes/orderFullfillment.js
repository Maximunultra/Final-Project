import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import authorize from '../middleware/authMiddleware.js';

dotenv.config();
const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Global timeout for database operations
const DB_OPERATION_TIMEOUT = 10000; // 10 seconds

// Helper function to execute a database operation with timeout
const executeWithTimeout = async (operation, timeoutMs = DB_OPERATION_TIMEOUT) => {
  return Promise.race([
    operation,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database operation timed out')), timeoutMs)
    )
  ]);
};

// 1. Reserve stock when an order is placed
router.post('/reserve', authorize, async (req, res) => {
  const { order_id, product_id, quantity, warehouse_id } = req.body;
  
  if (!order_id || !product_id || !quantity || !warehouse_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  try {
    // Begin by checking available stock with timeout
    const { data: stockData, error: stockError } = await executeWithTimeout(
      supabase
        .from('stock')
        .select('quantity')
        .eq('product_id', product_id)
        .eq('warehouse_id', warehouse_id)
        .single()
    );
    
    if (stockError) {
      console.error('Error checking stock:', stockError);
      return res.status(500).json({ error: 'Failed to check stock availability' });
    }
    
    if (!stockData) {
      return res.status(404).json({ error: 'Product not found in specified warehouse' });
    }
    
    const availableQuantity = stockData.quantity;
    
    // Check if we have enough stock
    if (availableQuantity < quantity) {
      // Create a backorder record with timeout
      const { error: backorderError } = await executeWithTimeout(
        supabase
          .from('backorders')
          .insert([{
            order_id,
            product_id,
            quantity_needed: quantity,
            quantity_available: availableQuantity,
            warehouse_id,
            status: 'Pending',
            created_at: new Date()
          }])
      );
      
      if (backorderError) {
        console.error('Error creating backorder:', backorderError);
        return res.status(500).json({ error: 'Failed to create backorder' });
      }
      
      // Update the order status to indicate backorder with timeout
      const { error: orderUpdateError } = await executeWithTimeout(
        supabase
          .from('orders')
          .update({ status: 'Backordered' })
          .eq('id', order_id)
      );
      
      if (orderUpdateError) {
        console.error('Error updating order status:', orderUpdateError);
        return res.status(500).json({ error: 'Failed to update order status' });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Insufficient stock. Order placed on backorder.',
        backorder: true,
        available: availableQuantity,
        needed: quantity
      });
    }
    
    // Use batch operations for better performance
    // Create reservation and update stock in parallel
    const [reservationResult, stockUpdateResult] = await Promise.all([
      executeWithTimeout(
        supabase
          .from('stock_reservations')
          .insert([{
            order_id,
            product_id,
            warehouse_id,
            quantity,
            status: 'Reserved',
            reservation_date: new Date(),
            expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
          }])
      ),
      executeWithTimeout(
        supabase
          .from('stock')
          .update({ 
            quantity: availableQuantity - quantity,
            updated_at: new Date()
          })
          .eq('product_id', product_id)
          .eq('warehouse_id', warehouse_id)
      )
    ]);
    
    const { error: reservationError } = reservationResult;
    const { error: stockUpdateError } = stockUpdateResult;
    
    if (reservationError) {
      console.error('Error creating reservation:', reservationError);
      return res.status(500).json({ error: 'Failed to reserve stock' });
    }
    
    if (stockUpdateError) {
      console.error('Error updating stock:', stockUpdateError);
      // Try to rollback the reservation if stock update fails
      await supabase
        .from('stock_reservations')
        .delete()
        .eq('order_id', order_id)
        .eq('product_id', product_id);
        
      return res.status(500).json({ error: 'Failed to update stock quantity' });
    }
    
    // Update the order status in the background
    // We don't need to wait for this to complete to return success
    supabase
      .from('orders')
      .update({ status: 'Processing' })
      .eq('id', order_id)
      .then(({ error }) => {
        if (error) {
          console.error('Error updating order status:', error);
        }
      });
    
    return res.status(200).json({
      success: true,
      message: 'Stock reserved successfully',
      details: {
        order_id,
        product_id,
        quantity,
        warehouse_id
      }
    });
    
  } catch (error) {
    console.error('Error in stock reservation:', error);
    return res.status(500).json({ 
      error: 'An unexpected error occurred during stock reservation',
      details: error.message
    });
  }
});

// 2. Ship order (deduct reserved stock)
router.post('/ship', authorize, async (req, res) => {
  const { order_id, actual_ship_date } = req.body;
  
  if (!order_id) {
    return res.status(400).json({ error: 'Order ID is required' });
  }
  
  const shipDate = actual_ship_date || new Date();
  
  try {
    // Get the reservation details for this order with timeout
    const { data: reservations, error: reservationError } = await executeWithTimeout(
      supabase
        .from('stock_reservations')
        .select('*')
        .eq('order_id', order_id)
        .eq('status', 'Reserved')
    );
    
    if (reservationError) {
      console.error('Error fetching reservations:', reservationError);
      return res.status(500).json({ error: 'Failed to fetch reservation details' });
    }
    
    if (!reservations || reservations.length === 0) {
      return res.status(404).json({ error: 'No active reservations found for this order' });
    }
    
    const updatePromises = [];
    const movementPromises = [];
    
    // Create promises for all database operations
    for (const reservation of reservations) {
      // Update reservation status to Shipped
      updatePromises.push(
        executeWithTimeout(
          supabase
            .from('stock_reservations')
            .update({ 
              status: 'Shipped',
              ship_date: shipDate
            })
            .eq('id', reservation.id)
        )
      );
      
      // Record shipment in stock_movements table
      movementPromises.push(
        executeWithTimeout(
          supabase
            .from('stock_movements')
            .insert([{
              product_id: reservation.product_id,
              quantity: reservation.quantity,
              source_warehouse_id: reservation.warehouse_id,
              destination_warehouse_id: null, // null indicates shipped to customer
              status: 'Shipped',
              transfer_date: shipDate,
              order_id: order_id
            }])
        )
      );
    }
    
    // Execute all reservation updates in parallel
    const updateResults = await Promise.all(updatePromises);
    
    // Check for errors in updates
    for (const { error } of updateResults) {
      if (error) {
        console.error('Error updating reservation:', error);
        return res.status(500).json({ error: 'Failed to update reservation status' });
      }
    }
    
    // Execute stock movement insertions in parallel (not critical for success)
    Promise.all(movementPromises).catch(error => {
      console.error('Error recording stock movements:', error);
      // We continue even if recording movements fails
    });
    
    // Update order status to Shipped with timeout
    const { error: orderUpdateError } = await executeWithTimeout(
      supabase
        .from('orders')
        .update({ 
          status: 'Shipped',
          fulfillment_date: shipDate
        })
        .eq('id', order_id)
    );
    
    if (orderUpdateError) {
      console.error('Error updating order status:', orderUpdateError);
      return res.status(500).json({ error: 'Failed to update order status' });
    }
    
    res.status(200).json({
      success: true,
      message: 'Order shipped successfully',
      details: {
        order_id,
        ship_date: shipDate
      }
    });
    
  } catch (error) {
    console.error('Error in order shipment process:', error);
    res.status(500).json({ 
      error: 'An unexpected error occurred during order shipment',
      details: error.message
    });
  }
});

// 3. Process backorders when stock becomes available
router.post('/process-backorders', authorize, async (req, res) => {
  const { product_id, warehouse_id } = req.body;
  
  if (!product_id || !warehouse_id) {
    return res.status(400).json({ error: 'Product ID and Warehouse ID are required' });
  }
  
  try {
    // Get current stock level with timeout
    const { data: stockData, error: stockError } = await executeWithTimeout(
      supabase
        .from('stock')
        .select('quantity')
        .eq('product_id', product_id)
        .eq('warehouse_id', warehouse_id)
        .single()
    );
    
    if (stockError) {
      console.error('Error checking stock:', stockError);
      return res.status(500).json({ error: 'Failed to check stock availability' });
    }
    
    if (!stockData) {
      return res.status(404).json({ error: 'Stock not found for specified product and warehouse' });
    }
    
    const availableQuantity = stockData.quantity;
    
    // Get pending backorders for this product at this warehouse, ordered by creation date
    const { data: backorders, error: backorderError } = await executeWithTimeout(
      supabase
        .from('backorders')
        .select('*')
        .eq('product_id', product_id)
        .eq('warehouse_id', warehouse_id)
        .eq('status', 'Pending')
        .order('created_at', { ascending: true })
    );
    
    if (backorderError) {
      console.error('Error fetching backorders:', backorderError);
      return res.status(500).json({ error: 'Failed to fetch backorders' });
    }
    
    if (!backorders || backorders.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No pending backorders found for this product and warehouse'
      });
    }
    
    let remainingStock = availableQuantity;
    const fulfilledBackorders = [];
    const partialBackorders = [];
    const unfulfillableBackorders = [];
    
    // Process backorders - we'll use batching for performance
    const operations = [];
    
    // Process backorders in order (FIFO)
    for (const backorder of backorders) {
      if (remainingStock <= 0) {
        unfulfillableBackorders.push(backorder.id);
        continue;
      }
      
      const quantityNeeded = backorder.quantity_needed;
      
      if (remainingStock >= quantityNeeded) {
        // Can fulfill this backorder completely
        operations.push({
          type: 'fulfill',
          backorder,
          quantity: quantityNeeded
        });
        
        remainingStock -= quantityNeeded;
        fulfilledBackorders.push(backorder.id);
      } else {
        // Can only partially fulfill this backorder
        partialBackorders.push(backorder.id);
      }
    }
    
    // Execute fulfillment operations in batches for better performance
    if (operations.length > 0) {
      // Create reservations in a single batch
      const reservations = operations.map(op => ({
        order_id: op.backorder.order_id,
        product_id: op.backorder.product_id,
        warehouse_id: op.backorder.warehouse_id,
        quantity: op.quantity,
        status: 'Reserved',
        reservation_date: new Date(),
        expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }));
      
      const { error: reservationError } = await executeWithTimeout(
        supabase
          .from('stock_reservations')
          .insert(reservations)
      );
      
      if (reservationError) {
        console.error('Error creating reservations:', reservationError);
        return res.status(500).json({ error: 'Failed to create reservations' });
      }
      
      // Update backorder statuses in a single batch
      const { error: backorderUpdateError } = await executeWithTimeout(
        supabase
          .from('backorders')
          .update({ 
            status: 'Fulfilled',
            fulfilled_date: new Date()
          })
          .in('id', fulfilledBackorders)
      );
      
      if (backorderUpdateError) {
        console.error('Error updating backorders:', backorderUpdateError);
        // Try to rollback reservations
        await supabase
          .from('stock_reservations')
          .delete()
          .in('order_id', operations.map(op => op.backorder.order_id));
          
        return res.status(500).json({ error: 'Failed to update backorder statuses' });
      }
      
      // Update order statuses - we'll do this in the background
      const orderIds = operations.map(op => op.backorder.order_id);
      supabase
        .from('orders')
        .update({ status: 'Processing' })
        .in('id', orderIds)
        .then(({ error }) => {
          if (error) {
            console.error('Error updating order statuses:', error);
          }
        });
    }
    
    // Update the stock quantity
    if (availableQuantity !== remainingStock) {
      const { error: stockUpdateError } = await executeWithTimeout(
        supabase
          .from('stock')
          .update({ 
            quantity: remainingStock,
            updated_at: new Date()
          })
          .eq('product_id', product_id)
          .eq('warehouse_id', warehouse_id)
      );
      
      if (stockUpdateError) {
        console.error('Error updating stock:', stockUpdateError);
        return res.status(500).json({ error: 'Failed to update stock quantity' });
      }
    }
    
    res.status(200).json({
      success: true,
      message: 'Backorders processed successfully',
      details: {
        fulfilled: fulfilledBackorders,
        partial: partialBackorders,
        unfulfillable: unfulfillableBackorders,
        remaining_stock: remainingStock
      }
    });
    
  } catch (error) {
    console.error('Error processing backorders:', error);
    res.status(500).json({ 
      error: 'An unexpected error occurred while processing backorders',
      details: error.message
    });
  }
});

// 4. Check reservation status
router.get('/reservations/:order_id', authorize, async (req, res) => {
  const { order_id } = req.params;
  
  try {
    const { data, error } = await executeWithTimeout(
      supabase
        .from('stock_reservations')
        .select('*')
        .eq('order_id', order_id)
    );
    
    if (error) {
      console.error('Error fetching reservations:', error);
      return res.status(500).json({ error: 'Failed to fetch reservation details' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error checking reservation status:', error);
    res.status(500).json({ 
      error: 'An unexpected error occurred',
      details: error.message
    });
  }
});

// 5. Check backorder status
router.get('/backorders/:order_id', authorize, async (req, res) => {
  const { order_id } = req.params;
  
  try {
    const { data, error } = await executeWithTimeout(
      supabase
        .from('backorders')
        .select('*')
        .eq('order_id', order_id)
    );
    
    if (error) {
      console.error('Error fetching backorders:', error);
      return res.status(500).json({ error: 'Failed to fetch backorder details' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error checking backorder status:', error);
    res.status(500).json({ 
      error: 'An unexpected error occurred',
      details: error.message
    });
  }
});

export default router;