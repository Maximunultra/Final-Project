import express from 'express';
import authorize from '../middleware/authMiddleware.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Get all stock movements with mapped field names for frontend
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('stock_movements')
      .select(`
        id,
        quantity,
        status,
        transfer_date,
        products (name),
        source_warehouse:warehouses!stock_movements_source_warehouse_id_fkey (name),
        destination_warehouse:warehouses!stock_movements_destination_warehouse_id_fkey (name)
      `)
      .order('transfer_date', { ascending: false });

    if (error) throw error;

    // Transform for frontend
    const transformed = data.map(m => ({
      id: m.id,
      quantity: m.quantity,
      status: m.status,
      transfer_date: m.transfer_date,
      product_name: m.products?.name || 'Unknown',
      source_warehouse_name: m.source_warehouse?.name || 'Unknown',
      destination_warehouse_name: m.destination_warehouse?.name || 'Unknown',
    }));

    res.json(transformed);
  } catch (err) {
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
    const { data: movementData, error: movementError } = await supabase
      .from('stock_movements')
      .insert([{
        product_id,
        quantity,
        source_warehouse_id,
        destination_warehouse_id,
        status: 'Completed',
        transfer_date: new Date().toISOString()
      }])
      .select();

    if (movementError) {
      console.error('DETAILED ERROR INSERTING STOCK MOVEMENT:', JSON.stringify(movementError));
      // Log the data you're trying to insert
      console.error('Attempted to insert:', {
        product_id, quantity, source_warehouse_id, destination_warehouse_id
      });
      // Return error to frontend
      return res.status(500).json({ error: 'Failed to record stock movement', details: movementError });
    }

    // Log success
    console.log('Successfully inserted stock movement:', movementData);

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