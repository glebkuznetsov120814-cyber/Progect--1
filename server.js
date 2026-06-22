const express = require('express');
const path = require('path');
const fs = require('fs/promises');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const ADMIN_PASSWORD = '120814';

async function readJson(filename) {
  const filePath = path.join(DATA_DIR, filename);

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    if (err.code === 'ENOENT') {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(filePath, '[]');
      return [];
    }

    throw err;
  }
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

app.get('/api/reviews/:productId', async (req, res) => {
  try {
    const reviews = await readJson('reviews.json');
    const approvedReviews = reviews
      .filter(review => review.productId === req.params.productId && review.status === 'approved')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const totalCount = approvedReviews.length;
    const averageRating = totalCount
      ? Number((approvedReviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / totalCount).toFixed(1))
      : 0;

    res.json({ averageRating, totalCount, reviews: approvedReviews });
  } catch (err) {
    console.error('Failed to read reviews:', err);
    res.status(500).json({ error: 'Failed to load reviews' });
  }
});

app.post('/api/reviews', async (req, res) => {
  try {
    const { productId, customerName, rating, reviewText } = req.body || {};
    const name = String(customerName || '').trim();
    const text = String(reviewText || '').trim();
    const parsedRating = Number(rating);

    if (!productId || !name || rating === undefined || !text) {
      return res.status(400).json({ error: 'Product, name, rating, and review are required' });
    }

    if (name.length > 60) {
      return res.status(400).json({ error: 'Name must be 60 characters or less' });
    }

    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ error: 'Rating must be an integer from 1 to 5' });
    }

    if (text.length > 500) {
      return res.status(400).json({ error: 'Review must be 500 characters or less' });
    }

    const products = await readJson('products.json');
    if (!products.find(product => product.id === productId)) {
      return res.status(400).json({ error: 'Product not found' });
    }

    const reviews = await readJson('reviews.json');
    const newReview = {
      id: `rev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      productId,
      customerName: name,
      rating: parsedRating,
      reviewText: text,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    reviews.push(newReview);
    await writeJson('reviews.json', reviews);
    res.status(201).json({ success: true, message: 'Review submitted for moderation' });
  } catch (err) {
    console.error('Failed to save review:', err);
    res.status(500).json({ error: 'Failed to submit review' });
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

app.get('/api/admin/reviews', requireAdmin, async (req, res) => {
  try {
    const [reviews, products] = await Promise.all([readJson('reviews.json'), readJson('products.json')]);
    const productNames = new Map(products.map(product => [product.id, product.name]));
    const withProducts = reviews
      .map(review => ({ ...review, productName: productNames.get(review.productId) || review.productId }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(withProducts);
  } catch (err) {
    console.error('Failed to load admin reviews:', err);
    res.status(500).json({ error: 'Failed to load reviews' });
  }
});

async function updateReviewStatus(id, status, res) {
  try {
    const reviews = await readJson('reviews.json');
    const idx = reviews.findIndex(review => review.id === id);

    if (idx === -1) {
      return res.status(404).json({ error: 'Review not found' });
    }

    reviews[idx] = { ...reviews[idx], status };
    await writeJson('reviews.json', reviews);
    res.json(reviews[idx]);
  } catch (err) {
    console.error('Failed to update review:', err);
    res.status(500).json({ error: 'Failed to update review' });
  }
}

app.put('/api/admin/reviews/:id/approve', requireAdmin, async (req, res) => {
  await updateReviewStatus(req.params.id, 'approved', res);
});

app.put('/api/admin/reviews/:id/reject', requireAdmin, async (req, res) => {
  await updateReviewStatus(req.params.id, 'rejected', res);
});

app.delete('/api/admin/reviews/:id', requireAdmin, async (req, res) => {
  try {
    const reviews = await readJson('reviews.json');
    const filtered = reviews.filter(review => review.id !== req.params.id);

    if (filtered.length === reviews.length) {
      return res.status(404).json({ error: 'Review not found' });
    }

    await writeJson('reviews.json', filtered);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete review:', err);
    res.status(500).json({ error: 'Failed to delete review' });
  }
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
