const express = require('express');
const app = express();
const PORT = 3001;

// Basic middleware
app.use(express.json());

// Simple route
app.get('/test', (req, res) => {
  res.json({ message: 'Test server working!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});

module.exports = app;
