npx create-react-app food-ordering
cd food-ordering
npm install socket.io-client axios
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

const socket = io("http://localhost:3000");

function App() {
    const [sessionId, setSessionId] = useState(null);
    const [restaurants, setRestaurants] = useState([]);
    const [currentRestaurant, setCurrentRestaurant] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");

    useEffect(() => {
        // Join session
        const queryParams = new URLSearchParams(window.location.search);
        const session = queryParams.get('session');
        const user = Math.random().toString(36).substr(2, 5); // Generate userId
        setSessionId(session);
        socket.emit('join-session', { sessionId: session, userId: user });

        // Fetch restaurants
        if (session) {
            axios.get(`http://localhost:3000/restaurants/${session}?lat=52.5200&lon=13.4050`) // Example coordinates
                .then(response => setRestaurants(response.data))
                .catch(err => console.error(err));
        }

        // Listen to chat messages
        socket.on('new-message', (message) => {
            setChatMessages((prev) => [...prev, message]);
        });

        // Listen for matches
        socket.on('match-found', (restaurantId) => {
            alert(`Match Found! Restaurant: ${restaurantId}`);
        });

        socket.on('no-match', () => {
            alert("No consensus reached!");
        });
    }, []);

    const handleSwipe = (action) => {
        if (restaurants.length > 0) {
            const restaurant = restaurants.shift();
            setCurrentRestaurant(restaurant);
            socket.emit('swipe', {
                sessionId,
                userId: 'user1', // Replace with dynamic userId
                restaurantId: restaurant.id,
                action
            });
        }
    };

    const sendMessage = () => {
        socket.emit('send-message', { sessionId, userId: 'user1', message: newMessage });
        setNewMessage("");
    };

    return (
        <div style={{ textAlign: "center", padding: "20px", backgroundColor: "#be95be" }}>
            <h1>Food Ordering Decision Maker</h1>
            <div>
                {currentRestaurant ? (
                    <div>
                        <h2>{currentRestaurant.name}</h2>
                        <button onClick={() => handleSwipe('like')}>Like</button>
                        <button onClick={() => handleSwipe('dislike')}>Dislike</button>
                    </div>
                ) : (
                    <p>Loading restaurants...</p>
                )}
            </div>
            <div style={{ marginTop: "20px" }}>
                <h3>Chat</h3>
                <div>
                    {chatMessages.map((msg, index) => (
                        <p key={index}><strong>{msg.userId}:</strong> {msg.message}</p>
                    ))}
                </div>
                <input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                />
                <button onClick={sendMessage}>Send</button>
            </div>
        </div>
    );
}

export default App;
