require('dotenv').config();
const express = require('express');
const path = require('path');

// Dynamic import for node-fetch (ESM module)
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname)));

// API Endpoint to fetch leaderboard
app.get('/api/leaderboard', async (req, res) => {
    const year = process.env.YEAR;
    const sessionToken = process.env.SESSION_TOKEN;
    const leaderboardId = process.env.LEADERBOARD_ID;

    if (!year || !sessionToken || !leaderboardId) {
        return res.status(500).json({ error: 'Missing YEAR, SESSION_TOKEN or LEADERBOARD_ID in .env file' });
    }

    const url = `https://adventofcode.com/${year}/leaderboard/private/view/${leaderboardId}.json`;

    try {
        console.log(`Fetching leaderboard from: ${url}`);
        const response = await fetch(url, {
            headers: {
                'Cookie': `session=${sessionToken}`,
                'User-Agent': 'github.com/anthonybath/aoc-raffle-drawer by anthony@example.com' // Polite User-Agent
            }
        });

        if (!response.ok) {
            throw new Error(`AoC API responded with ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
