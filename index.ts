import express from "express";
import Redis from "ioredis";

const app = express();

app.get("/", (req, res) => {
    res.send('Hello via Bun!');
})

app.listen(3012, () => {
    console.log("Server is running on port 3012");
})