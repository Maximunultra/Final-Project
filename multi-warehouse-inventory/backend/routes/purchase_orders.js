import express from 'express';
import { supabase } from '../server.js';  // Ensure correct import

const router = express.Router();

// Get all purchase orders with optional filtering
router.get('/', async (req, res) => {
  const { supplier_id, status } = req.query;
  
  try {
    let query = supabase.from('purchase_orders').select(`
      *,
      suppliers(id, company_name, category),
      purchase_order_items(
        id,
        product_id,
        products(id, name, sku),
        quantity,
        unit_price
      )
    `);

    // Apply filters if provided
    if (supplier_id) {
      query = query.eq('supplier_id', parseInt(supplier_id));
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching purchase orders:", error);
      return res.status(500).json({ error: 'Error fetching purchase orders', details: error.message });
    }

    res.json(data);
  } catch (error) {
    console.error("Unexpected error fetching purchase orders:", error);
    res.status(500).json({ error: 'Unexpected error fetching purchase orders', details: error.message });
  }
});

// Get a specific purchase order by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        suppliers(id, company_name, category),
        purchase_order_items(
          id,
          product_id,
          products(id, name, sku),
          quantity,
          unit_price,
          received_quantity
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error fetching purchase order ${id}:`, error);
      return res.status(500).json({ error: 'Error fetching purchase order', details: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    res.json(data);
  } catch (error) {
    console.error(`Unexpected error fetching purchase order ${id}:`, error);
    res.status(500).json({ error: 'Unexpected error fetching purchase order', details: error.message });
  }
});

// Create a new purchase order
router.post('/', async (req, res) => {
  const { 
    supplier_id, 
    expected_delivery_date, 
    items 
  } = req.body;

  // Validate input
  if (!supplier_id || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ 
      error: 'Supplier ID and at least one item are required' 
    });
  }

  // Start a Supabase transaction
  try {
    // 1. Create the purchase order
    const { data: po, error: poError } = await supabase
      .from('purchase_orders')
      .insert({
        supplier_id,
        status: 'pending',
        order_date: new Date(),
        expected_delivery_date: expected_delivery_date || null,
        total_amount: items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0),
        created_at: new Date(),
        updated_at: new Date()
      })
      .select()
      .single();

    if (poError) {
      console.error('Error creating purchase order:', poError);
      return res.status(500).json({ 
        error: 'Error creating purchase order', 
        details: poError.message 
      });
    }

    // 2. Add the purchase order items
    const poItems = items.map(item => ({
      purchase_order_id: po.id,
      product_id: item.product_id,
      quantity: item.quantity,
      received_quantity: 0,
      unit_price: item.unit_price,
      created_at: new Date(),
      updated_at: new Date()
    }));

    const { data: poItemsData, error: poItemsError } = await supabase
      .from('purchase_order_items')
      .insert(poItems)
      .select();

    if (poItemsError) {
      console.error('Error creating purchase order items:', poItemsError);
      // In a real application, you might want to delete the purchase order here
      return res.status(500).json({ 
        error: 'Error creating purchase order items', 
        details: poItemsError.message 
      });
    }

    // Fetch the complete purchase order with items to return to the client
    const { data: completePO, error: fetchError } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        suppliers(id, company_name, category),
        purchase_order_items(
          id,
          product_id,
          products(id, name, sku),
          quantity,
          unit_price
        )
      `)
      .eq('id', po.id)
      .single();

    if (fetchError) {
      console.error('Error fetching complete purchase order:', fetchError);
      return res.status(500).json({ 
        error: 'Error fetching complete purchase order', 
        details: fetchError.message,
        purchase_order_id: po.id // Still return the ID for reference
      });
    }

    res.status(201).json(completePO);
  } catch (error) {
    console.error('Unexpected error creating purchase order:', error);
    res.status(500).json({ 
      error: 'Unexpected error creating purchase order', 
      details: error.message 
    });
  }
});

// Update a purchase order status
router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!status || !['pending', 'approved', 'shipped', 'received', 'cancelled'].includes(status)) {
    return res.status(400).json({ 
      error: 'Valid status is required (pending, approved, shipped, received, cancelled)' 
    });
  }

  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .update({ 
        status,
        updated_at: new Date()
      })
      .eq('id', id)
      .select();

    if (error) {
      console.error(`Error updating purchase order ${id} status:`, error);
      return res.status(500).json({ 
        error: 'Error updating purchase order status', 
        details: error.message 
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    res.json(data[0]);
  } catch (error) {
    console.error(`Unexpected error updating purchase order ${id} status:`, error);
    res.status(500).json({ 
      error: 'Unexpected error updating purchase order status', 
      details: error.message 
    });
  }
});

// Receive items from a purchase order (updates stock)
router.post('/:id/receive', async (req, res) => {
  const { id } = req.params;
  const { items, warehouse_id } = req.body;
  
  // Validate input
  if (!warehouse_id || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ 
      error: 'Warehouse ID and received items are required' 
    });
  }

  try {
    // Start by getting all the purchase order items to validate against
    const { data: poItems, error: poItemsError } = await supabase
      .from('purchase_order_items')
      .select('*')
      .eq('purchase_order_id', id);

    if (poItemsError) {
      console.error(`Error fetching purchase order ${id} items:`, poItemsError);
      return res.status(500).json({ 
        error: 'Error fetching purchase order items', 
        details: poItemsError.message 
      });
    }

    if (!poItems || poItems.length === 0) {
      return res.status(404).json({ error: 'Purchase order items not found' });
    }

    // Validate each received item
    for (const item of items) {
      const poItem = poItems.find(pi => pi.id === item.id);
      
      if (!poItem) {
        return res.status(400).json({ 
          error: `Item with ID ${item.id} not found in this purchase order` 
        });
      }
      
      if (item.received_quantity <= 0) {
        return res.status(400).json({ 
          error: `Received quantity must be greater than 0 for item ${item.id}` 
        });
      }

      // Check if received quantity exceeds remaining quantity
      const remainingQuantity = poItem.quantity - poItem.received_quantity;
      if (item.received_quantity > remainingQuantity) {
        return res.status(400).json({ 
          error: `Received quantity exceeds remaining quantity for item ${item.id}` 
        });
      }
    }

    // Process each received item
    for (const item of items) {
      const poItem = poItems.find(pi => pi.id === item.id);
      
      // 1. Update the purchase order item's received quantity
      const { error: updateItemError } = await supabase
        .from('purchase_order_items')
        .update({ 
          received_quantity: poItem.received_quantity + item.received_quantity,
          updated_at: new Date()
        })
        .eq('id', item.id);

      if (updateItemError) {
        console.error(`Error updating received quantity for item ${item.id}:`, updateItemError);
        return res.status(500).json({ 
          error: 'Error updating received quantity', 
          details: updateItemError.message 
        });
      }

      // 2. Update stock levels
      // First check if stock entry exists
      const { data: existingStock, error: stockCheckError } = await supabase
        .from('stock')
        .select('*')
        .eq('product_id', poItem.product_id)
        .eq('warehouse_id', warehouse_id)
        .single();

      if (stockCheckError && stockCheckError.code !== 'PGRST116') {
        console.error(`Error checking existing stock for product ${poItem.product_id}:`, stockCheckError);
        return res.status(500).json({ 
          error: 'Error checking existing stock', 
          details: stockCheckError.message 
        });
      }

      if (existingStock) {
        // Update existing stock entry
        const { error: updateStockError } = await supabase
          .from('stock')
          .update({ 
            quantity: existingStock.quantity + item.received_quantity,
            updated_at: new Date()
          })
          .eq('id', existingStock.id);

        if (updateStockError) {
          console.error(`Error updating stock for product ${poItem.product_id}:`, updateStockError);
          return res.status(500).json({ 
            error: 'Error updating stock', 
            details: updateStockError.message 
          });
        }
      } else {
        // Create new stock entry
        const { error: createStockError } = await supabase
          .from('stock')
          .insert({
            product_id: poItem.product_id,
            warehouse_id: warehouse_id,
            quantity: item.received_quantity,
            created_at: new Date(),
            updated_at: new Date()
          });

        if (createStockError) {
          console.error(`Error creating stock entry for product ${poItem.product_id}:`, createStockError);
          return res.status(500).json({ 
            error: 'Error creating stock entry', 
            details: createStockError.message 
          });
        }
      }
    }

    // 3. Check if all items have been fully received, and update PO status if so
    const { data: updatedItems, error: checkItemsError } = await supabase
      .from('purchase_order_items')
      .select('*')
      .eq('purchase_order_id', id);

    if (checkItemsError) {
      console.error(`Error checking updated items for purchase order ${id}:`, checkItemsError);
      // Continue anyway as the main functionality has succeeded
    } else {
      // Check if all items are fully received
      const isFullyReceived = updatedItems.every(item => item.received_quantity >= item.quantity);
      
      if (isFullyReceived) {
        const { error: updatePOError } = await supabase
          .from('purchase_orders')
          .update({ 
            status: 'received',
            updated_at: new Date()
          })
          .eq('id', id);

        if (updatePOError) {
          console.error(`Error updating purchase order ${id} status to received:`, updatePOError);
          // Continue anyway as the main functionality has succeeded
        }
      }
    }

    // Return updated purchase order with items
    const { data: updatedPO, error: fetchError } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        suppliers(id, company_name, category),
        purchase_order_items(
          id,
          product_id,
          products(id, name, sku),
          quantity,
          unit_price,
          received_quantity
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error(`Error fetching updated purchase order ${id}:`, fetchError);
      return res.status(500).json({ 
        error: 'Items received successfully, but error fetching updated purchase order', 
        details: fetchError.message 
      });
    }

    res.json({
      message: 'Items received successfully',
      purchase_order: updatedPO
    });
  } catch (error) {
    console.error(`Unexpected error receiving items for purchase order ${id}:`, error);
    res.status(500).json({ 
      error: 'Unexpected error receiving items', 
      details: error.message 
    });
  }
});

export default router;