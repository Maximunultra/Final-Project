import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Get all thresholds
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('product_thresholds')
      .select('*');

    if (error) {
      console.error("Error fetching thresholds:", error);
      return res.status(500).json({ error: 'Error fetching thresholds', details: error.message });
    }

    res.json(data || []);
  } catch (error) {
    console.error("Unexpected error fetching thresholds:", error);
    res.status(500).json({ error: 'Unexpected error fetching thresholds', details: error.message });
  }
});

// Get threshold for specific product
router.get('/:product_id', async (req, res) => {
  const { product_id } = req.params;
  
  try {
    const { data, error } = await supabase
      .from('product_thresholds')
      .select('*')
      .eq('product_id', product_id)
      .maybeSingle();

    if (error) {
      console.error(`Error fetching threshold for product ${product_id}:`, error);
      return res.status(500).json({ error: 'Error fetching threshold', details: error.message });
    }

    if (!data) {
      return res.status(404).json({ message: 'No threshold set for this product' });
    }

    res.json(data);
  } catch (error) {
    console.error(`Unexpected error fetching threshold for product ${product_id}:`, error);
    res.status(500).json({ error: 'Unexpected error fetching threshold', details: error.message });
  }
});

// Create or update a threshold
router.post('/', async (req, res) => {
  const { product_id, threshold } = req.body;

  // Validate input
  if (!product_id || threshold === undefined) {
    return res.status(400).json({ error: 'Product ID and threshold value are required' });
  }

  if (threshold < 0) {
    return res.status(400).json({ error: 'Threshold cannot be negative' });
  }

  try {
    // Check if the product exists first
    const { data: productData, error: productError } = await supabase
      .from('products')
      .select('id')
      .eq('id', product_id)
      .maybeSingle();

    if (productError) {
      console.error('Error checking product existence:', productError);
      return res.status(500).json({ error: 'Error checking product existence', details: productError.message });
    }

    if (!productData) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if threshold already exists for this product
    const { data: existingThreshold, error: checkError } = await supabase
      .from('product_thresholds')
      .select('*')
      .eq('product_id', product_id)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing threshold:', checkError);
      return res.status(500).json({ error: 'Error checking existing threshold', details: checkError.message });
    }

    let result;
    if (existingThreshold) {
      // Update existing threshold
      const { data, error } = await supabase
        .from('product_thresholds')
        .update({ 
          threshold: threshold, 
          updated_at: new Date() 
        })
        .eq('product_id', product_id)
        .select();

      if (error) {
        console.error('Error updating threshold:', error);
        return res.status(500).json({ error: 'Error updating threshold', details: error.message });
      }

      result = data;
    } else {
      // Create new threshold
      const { data, error } = await supabase
        .from('product_thresholds')
        .insert({
          product_id,
          threshold,
          created_at: new Date(),
          updated_at: new Date()
        })
        .select();

      if (error) {
        console.error('Error creating threshold:', error);
        return res.status(500).json({ error: 'Error creating threshold', details: error.message });
      }

      result = data;
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('Unexpected error managing threshold:', error);
    res.status(500).json({ error: 'Unexpected error managing threshold', details: error.message });
  }
});

// Delete a threshold
router.delete('/:product_id', async (req, res) => {
  const { product_id } = req.params;

  try {
    const { error } = await supabase
      .from('product_thresholds')
      .delete()
      .eq('product_id', product_id);

    if (error) {
      console.error(`Error deleting threshold for product ${product_id}:`, error);
      return res.status(500).json({ error: 'Error deleting threshold', details: error.message });
    }

    res.json({ message: 'Threshold deleted successfully' });
  } catch (error) {
    console.error(`Unexpected error deleting threshold for product ${product_id}:`, error);
    res.status(500).json({ error: 'Unexpected error deleting threshold', details: error.message });
  }
});

export default router;