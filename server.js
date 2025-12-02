require('dotenv').config();
const express = require('express');
const path = require('path');

// Dynamic import for node-fetch (ESM module)
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname)));

const fs = require('fs').promises;

// API Endpoint to fetch leaderboard
app.get('/api/leaderboard', async (req, res) => {
    const year = process.env.YEAR;
    const sessionToken = process.env.SESSION_TOKEN;
    const leaderboardId = process.env.LEADERBOARD_ID;
    const CACHE_FILE = '.cache.json';
    const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes in ms

    if (!year || !sessionToken || !leaderboardId) {
        console.error('Missing environment variables:', { year, leaderboardId, hasToken: !!sessionToken });
        return res.status(500).json({ error: 'Missing YEAR, SESSION_TOKEN or LEADERBOARD_ID in .env file' });
    }

    // Check cache
    try {
        const cacheRaw = await fs.readFile(CACHE_FILE, 'utf8');
        const cache = JSON.parse(cacheRaw);
        const now = Date.now();
        
        if (now - cache.timestamp < CACHE_DURATION) {
            console.log('Serving from cache');
            let data = cache.data;
            
            // Filter excluded members
            const excludedIds = (process.env.EXCLUDED_MEMBER_IDS || '').split(',').map(id => id.trim());
            if (excludedIds.length > 0) {
                console.log(`Excluding members: ${excludedIds.join(', ')}`);
                const filteredMembers = {};
                Object.entries(data.members).forEach(([id, member]) => {
                    if (!excludedIds.includes(id)) {
                        filteredMembers[id] = member;
                    }
                });
                data.members = filteredMembers;
            }
            
            return res.json(data);
        }
    } catch (err) {
        // Cache doesn't exist or is invalid, ignore
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
        
        // Save to cache
        await fs.writeFile(CACHE_FILE, JSON.stringify({
            timestamp: Date.now(),
            data: data
        }));

        // Filter excluded members
        const excludedIds = (process.env.EXCLUDED_MEMBER_IDS || '').split(',').map(id => id.trim());
        if (excludedIds.length > 0) {
            console.log(`Excluding members: ${excludedIds.join(', ')}`);
            const filteredMembers = {};
            Object.entries(data.members).forEach(([id, member]) => {
                if (!excludedIds.includes(id)) {
                    filteredMembers[id] = member;
                }
            });
            data.members = filteredMembers;
        }

        res.json(data);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
