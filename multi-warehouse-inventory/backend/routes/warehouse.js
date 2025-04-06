import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

//  Fetch all warehouses
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('warehouses').select('*');
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching warehouses' });
  }
});

//  Add a new warehouse
router.post('/', async (req, res) => {
  const { name, location, capacity } = req.body;

  try {
    const { data, error } = await supabase
      .from('warehouses')
      .insert([{ name, location, capacity }]);

    if (error) throw error;
    res.status(201).json({ message: 'Warehouse added', warehouse: data });
  } catch (error) {
    res.status(500).json({ error: 'Error adding warehouse' });
  }
});

//  Delete a warehouse
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase.from('warehouses').delete().eq('id', id);
    if (error) throw error;
    res.json({ message: 'Warehouse deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting warehouse' });
  }
});

export default router;
