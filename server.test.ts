import { describe, expect, it } from "bun:test";

describe("Click Route", () => {
  const baseUrl = "http://localhost:3012";

  it("should handle GET requests to /api/count", async () => {
    const response = await fetch(`${baseUrl}/api/count`);
    console.log('response', response);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('count');
  });

  it("should handle POST requests to /api/click", async () => {
    const response = await fetch(`${baseUrl}/api/click`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('count');
    expect(data).toHaveProperty('userClicks');
    expect(data).toHaveProperty('clicksRemaining');
  });

  it("should return rate limit error after too many requests", async () => {
    // Send multiple requests to trigger rate limiting
    for (let i = 0; i < 11; i++) {
      await fetch(`${baseUrl}/api/click`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
    }
    
    // This request should be rate limited
    const response = await fetch(`${baseUrl}/api/click`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    
    expect(response.status).toBe(429); // Too Many Requests
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data).toHaveProperty('retryAfter');
  });
});
