import express from 'express';

const app = express();
const PORT = 3001;

// ✅ CRÍTICO: Añadir estos middlewares ANTES de las rutas
app.use(express.json());                        // Para parsear JSON
app.use(express.urlencoded({ extended: true })); // Para parsear form data

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth-service' });
});

// Login endpoint
app.post('/login', (req, res) => {
  console.log('📥 Login request received:', req.body); // ← Ahora req.body funcionará
  
  res.json({ 
    status: 'ok', 
    service: 'login',
    body: req.body  // Mostrar el body recibido
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Auth Service running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Login:  POST http://localhost:${PORT}/login`);
});