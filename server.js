const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for your GitHub Pages domain
app.use(cors({
    origin: 'https://arluigi.github.io'
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For LTI form data

// LTI Launch endpoint - handle both GET and POST
app.get('/lti/launch', (req, res) => {
    res.send(`
        <h2>LTI Launch Endpoint</h2>
        <p>This endpoint is ready to receive POST requests from Canvas.</p>
        <p>Status: Server is running correctly</p>
        <p>Time: ${new Date().toISOString()}</p>
    `);
});

app.post('/lti/launch', (req, res) => {
    console.log('LTI Launch received!');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    
    // Extract course info from LTI parameters
    const courseId = req.body.context_id || req.body.custom_canvas_course_id || 'default';
    const userId = req.body.user_id || 'anonymous';
    const userName = req.body.lis_person_name_full || 'User';
    
    // Serve the chat interface with LTI context
    const chatHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>UIUC Course Chat</title>
    <style>
        #chat-container {
            width: 100%;
            height: 600px;
            border: 1px solid #ccc;
            border-radius: 5px;
            display: flex;
            flex-direction: column;
        }
        #messages {
            flex-grow: 1;
            overflow-y: auto;
            padding: 10px;
            background: #f9f9f9;
        }
        #input-container {
            display: flex;
            padding: 10px;
            background: white;
            border-top: 1px solid #ccc;
        }
        #message-input {
            flex-grow: 1;
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 4px;
            margin-right: 10px;
        }
        #send-button {
            padding: 8px 16px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        .message {
            margin: 5px 0;
            padding: 8px;
            border-radius: 4px;
        }
        .user-message {
            background: #e3f2fd;
            margin-left: 20%;
        }
        .bot-message {
            background: #f5f5f5;
            margin-right: 20%;
        }
        .welcome-message {
            background: #e8f5e8;
            text-align: center;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div id="chat-container">
        <div id="messages">
            <div class="message welcome-message">Welcome, ${userName}! Ask me anything about your course.</div>
        </div>
        <div id="input-container">
            <input type="text" id="message-input" placeholder="Type your message...">
            <button id="send-button">Send</button>
        </div>
    </div>

    <script>
        // Configuration
        const config = {
            API_KEY: 'uc_4d34e989356e4e73b5b4a50fea694a3b',
            COURSE_ID: '${courseId}',
            USER_ID: '${userId}'
        };

        const messagesDiv = document.getElementById('messages');
        const messageInput = document.getElementById('message-input');
        const sendButton = document.getElementById('send-button');

        function addMessage(content, isUser = false) {
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${isUser ? 'user-message' : 'bot-message'}\`;
            messageDiv.textContent = content;
            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        async function sendMessage() {
            const message = messageInput.value.trim();
            if (!message) return;

            addMessage(message, true);
            messageInput.value = '';

            const data = {
                model: "Qwen/Qwen2.5-VL-32B-Instruct",
                messages: [
                    {
                        role: "system",
                        content: "You are a helpful AI assistant. Follow instructions carefully. Respond using markdown."
                    },
                    {
                        role: "user",
                        content: message
                    }
                ],
                api_key: config.API_KEY,
                course_name: config.COURSE_ID,
                stream: false,
                temperature: 0.1,
                retrieval_only: false
            };

            try {
                const response = await fetch('/proxy/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                if (!response.ok) {
                    throw new Error(\`API error: \${response.statusText}\`);
                }

                const result = await response.json();
                if (!result.message) {
                    throw new Error('No message in API response');
                }

                addMessage(result.message);
            } catch (error) {
                console.error('Error:', error);
                addMessage(\`Error: \${error.message}\`);
            }
        }

        sendButton.addEventListener('click', sendMessage);
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    </script>
</body>
</html>`;
    
    res.send(chatHtml);
});

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

// Catch-all for debugging
app.use('*', (req, res, next) => {
    console.log(`${req.method} ${req.originalUrl}`);
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    next();
});

app.listen(port, () => {
    console.log(`Proxy server running on port ${port}`);
});