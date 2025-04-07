import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// 🟢 Get stock levels for all products
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('stock')
      .select('id, product_id, warehouse_id, quantity, created_at, updated_at'); // Specify columns explicitly

    if (error) {
      console.error("Error fetching stock levels:", error);  // Log error for debugging
      return res.status(500).json({ error: 'Error fetching stock levels' });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'No stock levels found' });  // Handle empty data case
    }

    res.json(data);
  } catch (error) {
    console.error("Error fetching stock levels:", error);
    res.status(500).json({ error: 'Error fetching stock levels' });
  }
});

// 🟢 Update stock quantity for a product in a warehouse
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;

  console.log(`Updating stock with ID: ${id} and new quantity: ${quantity}`);  // Log the incoming data for debugging

  try {
    // First, check if the stock exists in the database
    const { data: existingStock, error: fetchError } = await supabase
      .from('stock')
      .select('*')
      .eq('id', id)
      .single();  // We want a single row, since we're fetching by ID

    if (fetchError) {
      console.error("Error fetching stock item:", fetchError);
      return res.status(500).json({ error: 'Error checking stock item' });
    }

    if (!existingStock) {
      return res.status(404).json({ error: 'Stock item not found' });  // Handle case where the ID doesn't exist
    }

    // Proceed with the update if the stock item exists
    const { data, error } = await supabase
      .from('stock')
      .update({ quantity, updated_at: new Date() })
      .eq('id', id);

    if (error) {
      console.error("Error updating stock:", error);  // Log error for debugging
      return res.status(500).json({ error: 'Error updating stock', details: error.message });  // Add detailed error message
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Stock item update failed, no data returned' });
    }

    console.log("Stock updated successfully:", data);  // Log successful update
    res.json({ message: 'Stock updated successfully', stock: data });
  } catch (error) {
    console.error("Unexpected error:", error);  // Log unexpected errors
    res.status(500).json({ error: 'Error updating stock', details: error.message });
  }
});




export default router;
