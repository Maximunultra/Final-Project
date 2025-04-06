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
      .select('id, product_id, warehouse_id, quantity, last_updated');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching stock levels' });
  }
});

// 🟢 Update stock quantity for a product in a warehouse
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;

  try {
    const { data, error } = await supabase
      .from('stock')
      .update({ quantity, last_updated: new Date() })
      .eq('id', id);

    if (error) throw error;
    res.json({ message: 'Stock updated successfully', stock: data });
  } catch (error) {
    res.status(500).json({ error: 'Error updating stock' });
  }
});

export default router;
