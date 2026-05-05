# ⚡ React Socket Tester for FastNest

A simple React application to test and interact with WebSocket endpoints built using **FastNest**.

This project helps developers quickly verify real-time communication, debug socket events, and simulate client-side interactions with a FastNest backend.

---

## 🚀 Features

* 🔌 Connect to WebSocket servers
* 📡 Send and receive real-time events
* 🧪 Test FastNest WebSocket gateways
* ⚡ Lightweight and easy to use
* 🎯 Built specifically for debugging and development

---

## 🧠 Use Case

This app is designed to work with **FastNest WebSocket gateways**, allowing you to:

* Test event-based communication (`@SubscribeMessage`)
* Debug server responses
* Simulate real client behavior
* Validate socket connections without building a full frontend

---

## 🛠️ Tech Stack

* React.js
* JavaScript (ES6+)
* WebSocket / Socket.IO (depending on your setup)
* CSS / Tailwind (if used)

---

## 📦 Installation

Clone the repository:

```bash
git clone https://github.com/hamza-elmoudden/reactap_to_test_socket_in_fastnest.git
cd reactap_to_test_socket_in_fastnest
```

Install dependencies:

```bash
npm install
```

---

## ▶️ Running the App

```bash
npm start
```

The app will run on:

```
http://localhost:3000
```

---

## ⚙️ Configuration

If your backend is running on a different URL, update the WebSocket endpoint in your code:

```js
const socket = new WebSocket("ws://localhost:8000/chat");
```

or (if using socket.io):

```js
const socket = io("http://localhost:8000");
```

---

## 🔌 Example FastNest Gateway

```python
@WebSocketGateway("/chat")
class ChatGateway:

    @SubscribeMessage("message")
    async def handle_message(self, client, data):
        return {"event": "reply", "data": data}
```

---

## 📁 Project Structure

```
src/
│── components/     # UI components
│── hooks/          # Custom hooks for socket logic
│── services/       # WebSocket / API logic
│── App.js
│── index.js
```

---

## 🧪 How to Use

1. Start your FastNest backend
2. Run this React app
3. Connect to the WebSocket server
4. Send test events
5. Observe real-time responses

---

## 🐞 Debug Tips

* Make sure the backend is running
* Check correct WebSocket URL (`ws://` or `http://`)
* Verify event names match backend (`SubscribeMessage`)
* Use browser DevTools → Network → WS tab

---

## 🚀 Future Improvements

* UI for dynamic event creation
* Message history tracking
* Multiple connections support
* Authentication support (JWT)

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repo
2. Create your branch (`git checkout -b feature/new-feature`)
3. Commit changes
4. Push and open a PR

---

## 📝 License

MIT License

---

## 👤 Author

**Hamza Elmoudden**

* GitHub: https://github.com/hamza-elmoudden

---

## ⭐ Support

If you find this useful, give it a ⭐ on GitHub!
