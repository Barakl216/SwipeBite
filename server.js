npm install express socket.io axios
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;
const WOLT_API = "https://wolt-restaurant-api.herokuapp.com/discovery";

let sessions = {};

// Create a session
app.post('/create-session', (req, res) => {
    const sessionId = Math.random().toString(36).substr(2, 9);
    sessions[sessionId] = { participants: [], restaurants: [], swipes: {}, chat: [] };
    res.json({ sessionId });
});

// Fetch restaurants
app.get('/restaurants/:sessionId', async (req, res) => {
    const { lat, lon } = req.query;
    const { sessionId } = req.params;
    try {
        const response = await axios.get(`${WOLT_API}?lat=${lat}&lon=${lon}`);
        sessions[sessionId].restaurants = response.data;
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch restaurants" });
    }
});

// WebSocket connection
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-session', ({ sessionId, userId }) => {
        if (sessions[sessionId]) {
            sessions[sessionId].participants.push(userId);
            socket.join(sessionId);
            io.to(sessionId).emit('update-participants', sessions[sessionId].participants);
        }
    });

    socket.on('swipe', ({ sessionId, userId, restaurantId, action }) => {
        const session = sessions[sessionId];
        if (!session) return;

        if (!session.swipes[restaurantId]) session.swipes[restaurantId] = {};
        session.swipes[restaurantId][userId] = action;

        const participants = session.participants;
        const votes = session.swipes[restaurantId];

        if (participants.every((id) => votes[id] === 'like')) {
            io.to(sessionId).emit('match-found', restaurantId);
        } else if (Object.keys(votes).length === participants.length) {
            io.to(sessionId).emit('no-match', restaurantId);
        }
    });

    socket.on('send-message', ({ sessionId, userId, message }) => {
        if (sessions[sessionId]) {
            sessions[sessionId].chat.push({ userId, message });
            io.to(sessionId).emit('new-message', { userId, message });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
