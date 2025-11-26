const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sequelize = require('./sequelize');
const userRoutes = require('./routes/users');
const orderRoutes = require('./routes/orders');
const { authenticateToken } = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use('/api/users', userRoutes); // Registration, login
app.use('/api/orders', authenticateToken, orderRoutes); // Lists, forms, stats

// Error handler
app.use((err, req, res, next) => {
  res.status(500).json({error: err.message});
});

const PORT = process.env.PORT || 4000;
sequelize.sync().then(() => {
  app.listen(PORT, () => console.log(`Backend running on ${PORT}`));
});