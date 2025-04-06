// backend/routes/products.js

import express from 'express';
import supabase from '../supabaseClient.js';

const router = express.Router();

// GET all products
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('products').select('*');
    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products', error });
  }
});

// POST a new product
router.post('/', async (req, res) => {
  const { name, sku, category, supplier_id, cost_price, selling_price } = req.body;

  try {
    const { data, error } = await supabase.from('products').insert([
      {
        name,
        sku,
        category,
        supplier_id,
        cost_price,
        selling_price,
      },
    ]);

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ message: 'Error adding product', error });
  }
});

// PUT (Update) a product by id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, sku, category, supplier_id, cost_price, selling_price } = req.body;

  try {
    const { data, error } = await supabase
      .from('products')
      .update({ name, sku, category, supplier_id, cost_price, selling_price })
      .eq('id', id);

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: 'Error updating product', error });
  }
});

// DELETE a product by id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
    res.status(200).json({ message: 'Product deleted successfully', data });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting product', error });
  }
});

export default router;
