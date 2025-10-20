import express from 'express';

const app = express();
const PORT = 3005;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'admin-service' });
});

app.listen(PORT, () => {
  console.log(`Admin Service running on port ${PORT}`);
});
