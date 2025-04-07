import express from 'express';
import { supabase } from '../server.js';
import { authenticate } from '../middleware/auth.js';
const router = express.Router();

// 1. Get all orders
router.get("/", authenticate,async (req, res) => {
  try {
    const { data, error } = await supabase.from('orders').select('*');
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Error fetching orders" });
  }
});

// 2. Create a new order
router.post("/", authenticate,async (req, res) => {
  const { product_id, quantity, status } = req.body;
  
  try {
    const { data, error } = await supabase.from('orders').insert([
      { product_id, quantity, status }
    ]);
    
    if (error) throw error;

    res.json({ message: "Order placed successfully", order: data });
  } catch (error) {
    res.status(500).json({ error: "Error placing order" });
  }
});

// 3. Update an order status
router.put("/:id",authenticate,  async (req, res) => {
  const { id } = req.params;
  const { status, fulfillment_date } = req.body;

  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ status, fulfillment_date })
      .eq('id', id);
    
    if (error) throw error;

    res.json({ message: "Order status updated", order: data });
  } catch (error) {
    res.status(500).json({ error: "Error updating order status" });
  }
});

// 4. Delete an order
router.delete("/:id", authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);
    
    if (error) throw error;

    res.json({ message: "Order deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error deleting order" });
  }
});

export default router;
