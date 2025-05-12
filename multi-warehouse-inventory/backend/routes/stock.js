import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// 🟢 Get stock levels with flexible querying
router.get('/', async (req, res) => {
  const { product_id, warehouse_id } = req.query;

  try {
    let query = supabase.from('stock').select('*');

    // Apply filters if provided
    if (product_id) {
      query = query.eq('product_id', parseInt(product_id));
    }
    if (warehouse_id) {
      query = query.eq('warehouse_id', parseInt(warehouse_id));
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching stock levels:", error);
      return res.status(500).json({ error: 'Error fetching stock levels', details: error.message });
    }

    if (!data || data.length === 0) {
      // Return an empty array instead of a 404 error
      return res.json([]);
    }

    res.json(data);
  } catch (error) {
    console.error("Unexpected error fetching stock levels:", error);
    res.status(500).json({ error: 'Unexpected error fetching stock levels', details: error.message });
  }
});

// 🟢 Create or update stock entry
router.post('/', async (req, res) => {
  const { product_id, warehouse_id, quantity } = req.body;

  // Validate input
  if (!product_id || !warehouse_id || quantity === undefined) {
    return res.status(400).json({ error: 'Product ID, Warehouse ID, and Quantity are required' });
  }

  try {
    // Check if a stock entry already exists for this product and warehouse
    const { data: existingStock, error: checkError } = await supabase
      .from('stock')
      .select('*')
      .eq('product_id', product_id)
      .eq('warehouse_id', warehouse_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing stock:', checkError);
      return res.status(500).json({ error: 'Error checking existing stock', details: checkError.message });
    }

    let result;
    if (existingStock) {
      // Update existing stock
      const { data, error } = await supabase
        .from('stock')
        .update({ 
          quantity: quantity, 
          updated_at: new Date() 
        })
        .eq('product_id', product_id)
        .eq('warehouse_id', warehouse_id)
        .select();

      if (error) {
        console.error('Error updating stock:', error);
        return res.status(500).json({ error: 'Error updating stock', details: error.message });
      }

      result = data;
    } else {
      // Create new stock entry
      const { data, error } = await supabase
        .from('stock')
        .insert({
          product_id,
          warehouse_id,
          quantity,
          created_at: new Date(),
          updated_at: new Date()
        })
        .select();

      if (error) {
        console.error('Error creating stock entry:', error);
        return res.status(500).json({ error: 'Error creating stock entry', details: error.message });
      }

      result = data;
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('Unexpected error managing stock:', error);
    res.status(500).json({ error: 'Unexpected error managing stock', details: error.message });
  }
});

// 🟢 Update stock entry by ID
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { quantity, product_id, warehouse_id } = req.body;

  // Validate input
  if (quantity === undefined || quantity === null) {
    return res.status(400).json({ error: 'Quantity is required' });
  }

  try {
    // Prepare update object
    const updateData = { 
      quantity, 
      updated_at: new Date() 
    };

    // Optional: update product_id or warehouse_id if provided
    if (product_id) updateData.product_id = product_id;
    if (warehouse_id) updateData.warehouse_id = warehouse_id;

    // Perform the update
    const { data, error } = await supabase
      .from('stock')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      console.error(`Error updating stock ${id}:`, error);
      return res.status(500).json({ error: 'Error updating stock', details: error.message });
    }

    if (!data || data.length === 0) {
      // If no data returned, it might mean the record doesn't exist
      return res.status(404).json({ error: 'Stock entry not found' });
    }

    res.json(data[0]);
  } catch (error) {
    console.error(`Unexpected error updating stock ${id}:`, error);
    res.status(500).json({ error: 'Unexpected error updating stock', details: error.message });
  }
});

export default router;