import express from 'express';

const app = express();
const PORT = 3007;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'performance-service' });
});

app.listen(PORT, () => {
  console.log(`Performance Service running on port ${PORT}`);
});
