import express from 'express';

const app = express();
const PORT = 3004;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'product-service' });
});

app.listen(PORT, () => {
  console.log(`Product Service running on port ${PORT}`);
});
