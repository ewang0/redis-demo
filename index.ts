import express from "express";
import Redis from "ioredis";
import path from 'path';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors());

const redis = new Redis();

// Global click counter
const CLICK_COUNTER_KEY = "global:clickCount"

// Move these lines outside the rateLimiter function
app.use(express.static(path.join(__dirname)))

// API endpoint to get the current count
app.get('/api/count', async (req, res) => {
  try {
    const count = await redis.get(CLICK_COUNTER_KEY)
    res.json({ count:parseInt(count || '0')})
  } catch (err) {
    console.error('Error getting count:', err);
    res.status(500).json({ error: 'Failed to get count' })
  }
})

// API endpoint to update the count
app.post('/api/click', async (req: any, res: any) => {
  try {
    const ip = req.ip
    const userClicksKey = `user:${ip}:clicks`
    const now = Date.now()
    const windowSize = 10000 // 10 seconds in milliseconds
    
    // Add current timestamp to the list
    await redis.lpush(userClicksKey, now)
    
    // Set expiration on the key to clean up automatically (a bit longer than window)
    await redis.expire(userClicksKey, 15) // 15 seconds
    
    // Get all timestamps in the list
    const timestamps = await redis.lrange(userClicksKey, 0, -1)
    
    // Filter out timestamps older than our window
    const validTimestamps = timestamps.filter(ts => {
      return now - parseInt(ts) < windowSize
    })
    
    // Remove old timestamps (optimization)
    if (validTimestamps.length < timestamps.length) {
      await redis.ltrim(userClicksKey, 0, validTimestamps.length - 1)
    }
    
    // Check if user has exceeded rate limit
    if (validTimestamps.length > 10) {
      // Calculate time until oldest request expires
      const oldestValidTimestamp = Math.min(...validTimestamps.map(ts => parseInt(ts)))
      const retryAfter = Math.ceil((oldestValidTimestamp + windowSize - now) / 1000)
      
      return res.status(429).json({ 
        error: 'Click limit exceeded', 
        message: 'Maximum 10 clicks per 10 seconds allowed. Retry after: ' + retryAfter + ' seconds.',
        retryAfter: retryAfter,
        currentClicks: validTimestamps.length
      })
    }
    
    // Process the click
    const newCount = await redis.incr(CLICK_COUNTER_KEY)
    
    res.json({ 
      count: newCount,
      userClicks: validTimestamps.length,
      clicksRemaining: Math.max(0, 10 - validTimestamps.length)
    })
  } catch (err) {
    console.error('Error updating count:', err)
    res.status(500).json({ error: 'Failed to update count'})
  }
})

// Serve the index.html file for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3012;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})

export { app }