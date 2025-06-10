const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for your GitHub Pages domain
app.use(cors({
    origin: 'https://arluigi.github.io'
}));

app.use(express.json());

app.post('/proxy/chat', async (req, res) => {
    try {
        const response = await fetch('https://uiuc.chat/api/chat-api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: 'Failed to forward request to UIUC chat API' });
    }
});

app.listen(port, () => {
    console.log(`Proxy server running on port ${port}`);
});