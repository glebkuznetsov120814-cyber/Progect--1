const express = require('express');
const path = require('path');
const fs = require('fs/promises');

const app = express();
const PORT = 8000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const DATA_DIR = path.join(__dirname, 'data');
const ADMIN_PASSWORD = '120814';

async function readJson(filename) {
  const content = await fs.readFile(path.join(DATA_DIR, filename), 'utf-8');
  return JSON.parse(content);
}

async function writeJson(filename, data) {
  await fs.writeFile(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2));
}

app.get('/api/ping', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/api/products', async (req, res) => {
  try {
    const products = await readJson('products.json');
    res.json(products);
  } catch (err) {
    console.error('Failed to read products:', err);
    res.status(500).json({ error: 'Failed to load products' });
  }
});

app.post('/api/custom-print-requests', async (req, res) => {
  try {
    const { email, notes, fileName, fileSize } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const requests = await readJson('custom-print-requests.json');
    const newRequest = {
      id: 'CPR-' + Date.now(),
      email,
      notes: notes || '',
      fileName: fileName || '',
      fileSize: fileSize || '',
      createdAt: new Date().toISOString(),
    };
    requests.push(newRequest);
    await writeJson('custom-print-requests.json', requests);
    res.json({ ok: true, id: newRequest.id });
  } catch (err) {
    console.error('Failed to save request:', err);
    res.status(500).json({ error: 'Failed to save request' });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { customer, items, total } = req.body || {};
    if (!customer || !items || !items.length) {
      return res.status(400).json({ error: 'Invalid order' });
    }
    const orders = await readJson('orders.json');
    const orderNumber = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    const newOrder = { orderNumber, customer, items, total, createdAt: new Date().toISOString() };
    orders.push(newOrder);
    await writeJson('orders.json', orders);
    res.json({ ok: true, orderNumber });
  } catch (err) {
    console.error('Failed to save order:', err);
    res.status(500).json({ error: 'Failed to save order' });
  }
});

function requireAdmin(req, res, next) {
  const password = req.header('X-Admin-Password');
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Wrong password' });
  res.json({ ok: true });
});

app.get('/api/admin/custom-print-requests', requireAdmin, async (req, res) => {
  try {
    const requests = await readJson('custom-print-requests.json');
    res.json(requests);
  } catch (err) { res.status(500).json({ error: 'Failed to load' }); }
});

app.get('/api/admin/orders', requireAdmin, async (req, res) => {
  try {
    const orders = await readJson('orders.json');
    res.json(orders);
  } catch (err) { res.status(500).json({ error: 'Failed to load' }); }
});

app.post('/api/admin/products', requireAdmin, async (req, res) => {
  try {
    const { id, name, description, features, price, image, featured } = req.body || {};
    if (!id || !name || price === undefined) return res.status(400).json({ error: 'id, name, price required' });
    const products = await readJson('products.json');
    if (products.find(p => p.id === id)) return res.status(400).json({ error: 'Product with this id already exists' });
    const newProduct = {
      id, name,
      description: description || '',
      features: Array.isArray(features) ? features : [],
      price: Number(price),
      image: image || '',
      featured: !!featured
    };
    products.push(newProduct);
    await writeJson('products.json', products);
    res.json(newProduct);
  } catch (err) { res.status(500).json({ error: 'Failed to create' }); }
});

app.put('/api/admin/products/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const products = await readJson('products.json');
    const idx = products.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    const updates = req.body || {};
    products[idx] = {
      ...products[idx],
      ...updates,
      id: products[idx].id,
      price: updates.price !== undefined ? Number(updates.price) : products[idx].price,
      featured: updates.featured !== undefined ? !!updates.featured : products[idx].featured,
      features: Array.isArray(updates.features) ? updates.features : products[idx].features
    };
    await writeJson('products.json', products);
    res.json(products[idx]);
  } catch (err) { res.status(500).json({ error: 'Failed to update' }); }
});

app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const products = await readJson('products.json');
    const filtered = products.filter(p => p.id !== id);
    if (filtered.length === products.length) return res.status(404).json({ error: 'Not found' });
    await writeJson('products.json', filtered);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Failed to delete' }); }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
