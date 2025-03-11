import express, { type Request, type Response, type NextFunction } from "express";
import Redis from "ioredis";
import path from 'path';

const app = express();
app.use(express.json());

const redis = new Redis();

// Global click counter
const CLICK_COUNTER_KEY = "global:clickCount"

// Rate limiting middleware
const rateLimiter = async (req: any, res: any, next: any) => {
  const ip = req.ip
  const key = `ratelimit:${ip}`

  try {
    // Increment the counter for this IP
    const count = await redis.incr(key)

    // set the expiration time to 60 seconds
    if(count === 1) {
      await redis.expire(key, 60)
    }

    // if the count is greater than 10, return a 429 error
    const ttl = await redis.ttl(key)

    res.setHeader('X-RateLimit-Limit', 10)
    res.setHeader('X-RateLimit-Remaining', Math.max(0, 10 - count))
    res.setHeader('X-RateLimit-Reset', ttl)

    if(count > 10) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests, please try again later.'
      })
    }
    
    next();
  } catch (err) {
    console.error('Rate limiting error:', err)
    next()
  }
}

// Move these lines outside the rateLimiter function
app.use(express.static(path.join(__dirname)))

// Register the middleware correctly
app.use('/api/', rateLimiter)

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
    const userClickKey = `user:${ip}:clicks`
    
    // Check if user has exceeded click limit
    const userClicks = await redis.incr(userClickKey)
    
    // Set expiration on first click
    if (userClicks === 1) {
      await redis.expire(userClickKey, 10) // 10 seconds window
    }
    
    // If user has clicked more than 10 times in 10 seconds
    if (userClicks > 10) {
      const ttl = await redis.ttl(userClickKey)
      const response = res.status(429).json({ 
        error: 'Click limit exceeded', 
        message: 'Maximum 10 clicks per 10 seconds allowed',
        resetIn: ttl
      }) 
      return response
    }
    
    const { count } = req.body;
    let newCount;

    if (typeof count === 'number') {
      newCount = await redis.set(CLICK_COUNTER_KEY, count, 'GET')
    } else {
      newCount = await redis.incr(CLICK_COUNTER_KEY)
    }

    res.json({ 
      count: parseInt(newCount as string) || 0,
      userClicks,
      clicksRemaining: Math.max(0, 10 - userClicks)
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

// Add server startup code
app.listen(3012, () => {
  console.log("Server is running on port 3012")
})