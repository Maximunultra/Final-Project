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

// POST a new product with stock
router.post('/', async (req, res) => {
  const { 
    name, 
    sku, 
    category, 
    supplier_id, 
    cost_price, 
    selling_price, 
    warehouse_id, // New field for warehouse
    initial_quantity // New field for initial stock quantity
  } = req.body;

  const client = supabase;

  try {
    // Start a transaction
    const productInsert = await client
      .from('products')
      .insert([{
        name,
        sku,
        category,
        supplier_id,
        cost_price,
        selling_price,
      }])
      .select(); // Return the inserted product

    if (productInsert.error) throw productInsert.error;

    // Get the newly created product ID
    const newProductId = productInsert.data[0].id;

    // Insert stock if warehouse_id and initial_quantity are provided
    if (warehouse_id && initial_quantity !== undefined) {
      const stockInsert = await client
        .from('stock')
        .insert([{
          product_id: newProductId,
          warehouse_id,
          quantity: initial_quantity
        }]);

      if (stockInsert.error) throw stockInsert.error;
    }

    res.status(201).json({
      product: productInsert.data[0],
      message: warehouse_id 
        ? 'Product and initial stock added successfully' 
        : 'Product added successfully without initial stock'
    });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ 
      message: 'Error adding product', 
      error: error.message 
    });
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
    // First, delete associated stock entries
    const stockDeleteResult = await supabase
      .from('stock')
      .delete()
      .eq('product_id', id);

    if (stockDeleteResult.error) throw stockDeleteResult.error;

    // Then delete the product
    const { data, error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(200).json({ message: 'Product and associated stock deleted successfully', data });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting product', error });
  }
});

export default router;