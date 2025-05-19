import express from 'express';
import authorize from '../middleware/authMiddleware.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Get all stock movements with mapped field names for frontend
router.get('/', authorize(['admin', 'manager', 'staff']), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*, products(name), warehouses!destination_warehouse_id(name)')
      .order('transfer_date', { ascending: false });

    if (error) throw error;
    
    // Transform data to match frontend expectations
    const transformedData = data.map(movement => ({
      id: movement.id,
      date: movement.transfer_date,
      productId: movement.product_id,
      type: movement.destination_warehouse_id && movement.source_warehouse_id ? 'transfer' : 
             !movement.source_warehouse_id ? 'receiving' : 'shipping',
      quantity: movement.quantity,
      warehouseId: movement.destination_warehouse_id || movement.warehouse_id,
      sourceWarehouseId: movement.source_warehouse_id || null,
      referenceNumber: movement.reference_number || movement.id.toString(),
      notes: movement.notes || '',
      status: movement.status
    }));

    res.json(transformedData);
  } catch (err) {
    console.error('Error fetching stock movements:', err.message);
    res.status(500).json({ error: 'Failed to fetch stock movements' });
  }
});

// Transfer stock between warehouses
router.post('/transfer', authorize(['admin', 'manager']), async (req, res) => {
  const { product_id, quantity, source_warehouse_id, destination_warehouse_id } = req.body;
  
  // Input validation
  if (!product_id || !quantity || !source_warehouse_id || !destination_warehouse_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  if (parseInt(quantity) <= 0) {
    return res.status(400).json({ error: 'Quantity must be greater than zero' });
  }
  
  if (source_warehouse_id === destination_warehouse_id) {
    return res.status(400).json({ error: 'Source and destination warehouses cannot be the same' });
  }

  try {
    // Start a Supabase transaction
    // Since Supabase doesn't support true transactions, we'll have to handle errors carefully
    
    // Step 1: Check if source warehouse has enough stock
    const { data: stock, error: stockError } = await supabase
      .from('stock')
      .select('quantity')
      .eq('product_id', product_id)
      .eq('warehouse_id', source_warehouse_id)
      .single();

    if (stockError) {
      console.error('Error checking source stock:', stockError);
      return res.status(500).json({ error: 'Failed to check stock availability' });
    }

    if (!stock) {
      return res.status(400).json({ error: 'Product does not exist in the source warehouse' });
    }

    if (stock.quantity < quantity) {
      return res.status(400).json({ error: `Not enough stock. Available: ${stock.quantity}, Requested: ${quantity}` });
    }

    // Step 2: Reduce stock from source warehouse
    const { error: updateSourceError } = await supabase
      .from('stock')
      .update({ quantity: stock.quantity - quantity })
      .eq('product_id', product_id)
      .eq('warehouse_id', source_warehouse_id);

    if (updateSourceError) {
      console.error('Error updating source stock:', updateSourceError);
      return res.status(500).json({ error: 'Failed to update source warehouse stock' });
    }

    // Step 3: Check if product exists in destination warehouse
    const { data: destStock, error: destStockError } = await supabase
      .from('stock')
      .select('quantity')
      .eq('product_id', product_id)
      .eq('warehouse_id', destination_warehouse_id)
      .single();

    // Step 4: Add or update stock in destination warehouse
    let updateDestError;
    if (destStock) {
      // Update existing stock
      const { error } = await supabase
        .from('stock')
        .update({ quantity: destStock.quantity + quantity })
        .eq('product_id', product_id)
        .eq('warehouse_id', destination_warehouse_id);
      
      updateDestError = error;
    } else {
      // Create new stock entry
      const { error } = await supabase
        .from('stock')
        .insert([{ 
          product_id, 
          warehouse_id: destination_warehouse_id, 
          quantity 
        }]);
      
      updateDestError = error;
    }

    if (updateDestError) {
      console.error('Error updating destination stock:', updateDestError);
      
      // Attempt to rollback the source warehouse update
      await supabase
        .from('stock')
        .update({ quantity: stock.quantity })
        .eq('product_id', product_id)
        .eq('warehouse_id', source_warehouse_id);
        
      return res.status(500).json({ error: 'Failed to update destination warehouse stock' });
    }

    // Step 5: Record Stock Movement
    const { error: movementError } = await supabase
      .from('stock_movements')
      .insert([{ 
        product_id, 
        quantity, 
        source_warehouse_id, 
        destination_warehouse_id, 
        status: 'Completed',
        transfer_date: new Date(),
        type: 'transfer',  // Explicitly set the type
        notes: req.body.notes || null,
        reference_number: req.body.referenceNumber || null
      }]);

    if (movementError) {
      console.error('Error recording stock movement:', movementError);
      // The transfer was already completed, so we don't roll back here
      // Just log the error and continue
    }

    res.json({ 
      success: true, 
      message: 'Stock transferred successfully',
      details: {
        product_id,
        quantity,
        source_warehouse_id,
        destination_warehouse_id
      }
    });
    
  } catch (error) {
    console.error('Error in stock transfer:', error);
    res.status(500).json({ error: 'An unexpected error occurred during stock transfer' });
  }
});

export default router;