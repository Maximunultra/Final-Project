import express from 'express';
import authorize from '../middleware/authMiddleware.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

router.post('/transfer', authorize(['admin', 'manager']), async (req, res) => {
  const { product_id, quantity, source_warehouse_id, destination_warehouse_id } = req.body;

  // Check if source warehouse has enough stock
  const { data: stock, error: stockError } = await supabase
    .from('stock')
    .select('quantity')
    .eq('product_id', product_id)
    .eq('warehouse_id', source_warehouse_id)
    .single();

  if (stockError || !stock || stock.quantity < quantity) {
    return res.status(400).json({ error: 'Not enough stock' });
  }

  // Reduce stock from source warehouse
  await supabase
    .from('stock')
    .update({ quantity: stock.quantity - quantity })
    .eq('product_id', product_id)
    .eq('warehouse_id', source_warehouse_id);

  // Add stock to destination warehouse
  const { data: destStock } = await supabase
    .from('stock')
    .select('quantity')
    .eq('product_id', product_id)
    .eq('warehouse_id', destination_warehouse_id)
    .single();

  if (destStock) {
    await supabase
      .from('stock')
      .update({ quantity: destStock.quantity + quantity })
      .eq('product_id', product_id)
      .eq('warehouse_id', destination_warehouse_id);
  } else {
    await supabase
      .from('stock')
      .insert([{ product_id, warehouse_id: destination_warehouse_id, quantity }]);
  }

  // Record Stock Movement
  await supabase
    .from('stock_movements')
    .insert([{ product_id, quantity, source_warehouse_id, destination_warehouse_id, status: 'Completed' }]);

  res.json({ success: true, message: 'Stock transferred successfully' });
});

export default router;
