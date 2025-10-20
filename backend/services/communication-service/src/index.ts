import express from 'express';

const app = express();
const PORT = 3006;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'communication-service' });
});

app.listen(PORT, () => {
  console.log(`Communication Service running on port ${PORT}`);
});
