const express = require("express");
const http = require("http");
const db = require("./db");
const { Server } = require("socket.io");
const cors = require("cors");

let app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

app.use(cors());           
app.use(express.json());

io.on("connection", (socket) => {

    console.log("user connected to the server");

    // 🔑 SOCKET LOGIN EVENT (Agar aap socket ke through login karna chahte hain)
    socket.on("login", (data) => {
        const { name, password } = data;

        const query = "SELECT * FROM users WHERE username = ? AND password = ?";
        db.query(query, [name, password], (err, results) => {
            if (err) {
                console.error("Login database error:", err);
                socket.emit("login_response", { success: false, message: "Database error" });
                return;
            }

            if (results.length > 0) {
                const user = results[0];
                socket.userId = user.unique_id;

                socket.emit("login_response", {
                    success: true,
                    unique_id: user.unique_id,
                    username: user.username,
                    message: "Login successful"
                });
                console.log(`User logged in via socket: ${user.username}`);
            } else {
                socket.emit("login_response", {
                    success: false,
                    message: "Incorrect username or password"
                });
            }
        });
    });

    socket.on("message", (data) => {
        console.log("Join request:", data);

        if (data.type === "join_request") {
            const userId = data.user_unique_id;
            const groupId = String(data.group_unique_id);

            socket.join(groupId);

            console.log(`User ${userId} joined group ${groupId}`);
            console.log("ROOM MEMBERS:", io.sockets.adapter.rooms.get(groupId));
        }
    });

    socket.on("send_message", (data) => {
        console.log("Message received:", data);

        const sql = `
            INSERT INTO messages
            (message_unique_id, sender_unique_id, group_unique_id, message)
            VALUES (?, ?, ?, ?)
        `;

        db.query(sql, [
            data.message_unique_id,
            data.sender_unique_id,
            data.group_unique_id,
            data.message
        ], (err, result) => {
            if (err) {
                console.error("Message save error:", err);
                return;
            }

            console.log("Message database mein save ho gaya");

            // Group ke users ko live message bhejo
            io.to(String(data.group_unique_id))
              .emit("receive_message", data);
        });
    });

    socket.on("disconnect", () => {
        console.log("user disconnected:", socket.id);
    });

});

// --- REST API ROUTES ---

app.get("/sign", (req, res) => {
    res.send("sign page");
});

// 🔑 EXPRESS POST ROUTE FOR LOGIN (Agar aap fetch/API ke through login karna chahte hain)
app.post("/login", (req, res) => {
    const { name, password } = req.body;

    const query = "SELECT * FROM users WHERE username = ? AND password = ?";
    db.query(query, [name, password], (err, results) => {
        if (err) {
            console.error("Login error:", err);
            return res.status(500).json({ success: false, message: "Database error" });
        }

        if (results.length > 0) {
            const user = results[0];
            res.json({
                success: true,
                unique_id: user.unique_id,
                username: user.username,
                message: "Login successful"
            });
        } else {
            res.status(401).json({ success: false, message: "Incorrect username or password" });
        }
    });
});

app.post("/message", (req, res) => {
    console.log("Frontend se message (Sign up):", req.body);

    const username = req.body.name;
    const password = req.body.password;
    const unique_id = Date.now();

    const sql = `
        INSERT INTO users (unique_id, username, password)
        VALUES (?, ?, ?)
    `;

    db.query(sql, [unique_id, username, password], (err, result) => {
        if (err) {
            console.log("Database error:", err);
            return res.status(500).json({
                success: false,
                message: "Data save nahi hua"
            });
        }

        res.json({
            success: true,
            message: "User MySQL me save ho gaya",
            unique_id: unique_id,
            username: username
        });
    });
});

app.post("/groups", (req, res) => {
    console.log(req.body);

    const group_name = req.body.group_name;
    const unique_id = req.body.unique_id;
    const group_unique_id = Date.now();

    const sql = `
        INSERT INTO user_groups(unique_id, group_name, group_unique_id)
        VALUES (?, ?, ?)
    `;

    db.query(sql, [unique_id, group_name, group_unique_id], (err, result) => {
        if (err) {
            console.error("MySQL Error:", err);
            return res.status(500).json({
                success: false,
                message: "Database me save nahi hua"
            });
        }

        console.log("Group ID:", group_unique_id);

        res.json({
            success: true,
            message: "Group MySQL me save ho gaya",
            group_unique_id: group_unique_id
        });
    });
});

app.get("/sendgroup", (req, res) => {
    const sql = `
        SELECT DISTINCT group_unique_id, group_name
        FROM user_groups
    `;

    db.query(sql, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                message: "Database error"
            });
        }

        res.json({
            success: true,
            groups: result
        });
    });
});

app.get("/sendmsg", (req, res) => {
    const groupId = req.query.group_unique_id;

    if (!groupId) {
        return res.status(400).json({
            success: false,
            message: "group_unique_id required"
        });
    }

    const sql = `
        SELECT 
            message_unique_id,
            sender_unique_id,
            group_unique_id,
            message
        FROM messages
        WHERE group_unique_id = ?
        ORDER BY message_unique_id ASC
    `;

    db.query(sql, [groupId], (err, results) => {
        if (err) {
            console.error("Message fetch error:", err);
            return res.status(500).json({
                success: false,
                message: "Database error"
            });
        }

        res.json({
            success: true,
            messages: results
        });
    });
});
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});