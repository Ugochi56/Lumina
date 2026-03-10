const { WebSocketServer } = require('ws');

// Store connected clients mapped by userId
const clients = new Map();

function initWebSocketServer(server) {
    const wss = new WebSocketServer({ server });

    wss.on('connection', (ws, req) => {
        // Get userId from session via query param
        const params = new URLSearchParams(req.url.replace('/?', ''));
        const userId = params.get('userId');

        if (userId) {
            clients.set(userId, ws);
        }

        ws.on('close', () => {
            if (userId) clients.delete(userId);
        });
    });

    console.log("WebSocket Server initialized");
}

// Export helper to push messages from routes
function notifyUser(userId, data) {
    const ws = clients.get(String(userId));
    if (ws && ws.readyState === 1) { // 1 === WebSocket.OPEN
        ws.send(JSON.stringify(data));
    }
}

module.exports = {
    initWebSocketServer,
    notifyUser
};
