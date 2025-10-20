import express from 'express';

const app = express();
const PORT = 3003;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'order-service' });
});

app.listen(PORT, () => {
  console.log(`Order Service running on port ${PORT}`);
});
