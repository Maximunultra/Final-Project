import express from 'express';
import { supabase } from '../server.js';  // Ensure correct import

const router = express.Router();

// Get all suppliers
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('suppliers').select('*');
    
    if (error) {
      console.error("Error fetching suppliers:", error);
      return res.status(500).json({ error: 'Error fetching suppliers', details: error.message });
    }
    
    res.json(data);
  } catch (error) {
    console.error("Unexpected error fetching suppliers:", error);
    res.status(500).json({ error: 'Unexpected error fetching suppliers', details: error.message });
  }
});

// Get a specific supplier by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Error fetching supplier ${id}:`, error);
      return res.status(500).json({ error: 'Error fetching supplier', details: error.message });
    }
    
    if (!data) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    
    res.json(data);
  } catch (error) {
    console.error(`Unexpected error fetching supplier ${id}:`, error);
    res.status(500).json({ error: 'Unexpected error fetching supplier', details: error.message });
  }
});

// Create a new supplier
router.post('/', async (req, res) => {
  const { company_name, contact_info, category, product_name, price } = req.body;
  
  // Validate input
  if (!company_name) {
    return res.status(400).json({ error: 'Supplier company name is required' });
  }
  
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .insert({
        company_name,
        contact_info: contact_info || null,
        category: category || null,
        product_name: product_name || null,
        price: price || null,
        created_at: new Date(),
        updated_at: new Date()
      })
      .select();
    
    if (error) {
      console.error('Error creating supplier:', error);
      return res.status(500).json({ error: 'Error creating supplier', details: error.message });
    }
    
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Unexpected error creating supplier:', error);
    res.status(500).json({ error: 'Unexpected error creating supplier', details: error.message });
  }
});

// Update a supplier
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { company_name, contact_info, category, product_name, price } = req.body;
  
  // Validate input
  if (!company_name) {
    return res.status(400).json({ error: 'Supplier company name is required' });
  }
  
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .update({
        company_name,
        contact_info: contact_info || null,
        category: category || null,
        product_name: product_name || null,
        price: price || null,
        updated_at: new Date()
      })
      .eq('id', id)
      .select();
    
    if (error) {
      console.error(`Error updating supplier ${id}:`, error);
      return res.status(500).json({ error: 'Error updating supplier', details: error.message });
    }
    
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    
    res.json(data[0]);
  } catch (error) {
    console.error(`Unexpected error updating supplier ${id}:`, error);
    res.status(500).json({ error: 'Unexpected error updating supplier', details: error.message });
  }
});

// Delete a supplier
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check if this supplier has any associated products or purchase orders
    const { data: productsWithSupplier, error: productsError } = await supabase
      .from('products')
      .select('id')
      .eq('supplier_id', id)
      .limit(1);
    
    if (productsError) {
      console.error(`Error checking supplier ${id} products:`, productsError);
      return res.status(500).json({ error: 'Error checking supplier products', details: productsError.message });
    }
    
    const { data: poWithSupplier, error: poError } = await supabase
      .from('purchase_orders')
      .select('id')
      .eq('supplier_id', id)
      .limit(1);
    
    if (poError) {
      console.error(`Error checking supplier ${id} purchase orders:`, poError);
      return res.status(500).json({ error: 'Error checking supplier purchase orders', details: poError.message });
    }
    
    // Prevent deletion if supplier is referenced
    if (productsWithSupplier?.length > 0) {
      return res.status(400).json({ error: 'Cannot delete supplier with associated products' });
    }
    
    if (poWithSupplier?.length > 0) {
      return res.status(400).json({ error: 'Cannot delete supplier with associated purchase orders' });
    }
    
    // Delete the supplier
    const { error: deleteError } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);
    
    if (deleteError) {
      console.error(`Error deleting supplier ${id}:`, deleteError);
      return res.status(500).json({ error: 'Error deleting supplier', details: deleteError.message });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error(`Unexpected error deleting supplier ${id}:`, error);
    res.status(500).json({ error: 'Unexpected error deleting supplier', details: error.message });
  }
});

export default router;