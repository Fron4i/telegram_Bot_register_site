// server/apiserver.js

const express = require("express")
const cors = require("cors")
const app = express()
const port = 3000

app.use(cors())
app.use(express.json())

// Простое хранилище для данных пользователей
const users = {}

app.post("/api/register", (req, res) => {
	const user = req.body
	users[user.id] = user
	console.log("User registered successfully:", user)
	res.json({ success: true, message: "User registered" })
})

app.get("/api/status", (req, res) => {
	const userId = req.query.id
	const user = users[userId]
	if (user) {
		res.json({ success: true, user })
	} else {
		res.json({ success: false, message: "User not found" })
	}
})

app.listen(port, () => {
	console.log(`API server running on http://127.0.0.1:${port}`)
})
