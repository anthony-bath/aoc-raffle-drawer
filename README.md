# Advent of Code Raffle Drawer

A very simple AI generated raffle drawer for Advent of Code.

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and fill in the required values
4. Run the server: `npm start`

## Automation Guidelines

This repo does follow the automation guidelines on the [r/adventofcode community wiki](https://www.reddit.com/r/adventofcode/wiki/faqs/automation). Specifically:

- The leaderboard is cached for 15 minutes in `server.js`
- The User-Agent header in `server.js` is set to me since I maintain this tool, but is configurable in the `.env` file

