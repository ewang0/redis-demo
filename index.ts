import express from "express";
import Redis from "ioredis";
import path from 'path';

const app = express();
app.use(express.json());

// Global click counter
let clickCount = 0;

// Serve static files from the current directory
app.use(express.static(path.join(__dirname)));

// API endpoint to get the current count
app.get('/api/count', (req, res) => {
  res.json({ count: clickCount });
});

// API endpoint to update the count
app.post('/api/click', (req, res) => {
  const { count } = req.body;
  if (typeof count === 'number') {
    clickCount = count;
  } else {
    clickCount++;
  }
  res.json({ count: clickCount });
});

// Serve the index.html file for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(3012, () => {
    console.log("Server is running on port 3012");
})