const express = require("express")
const cors = require("cors")
const jwt = require("jsonwebtoken")
const bodyParser = require("body-parser")
require("dotenv").config() // Загружаем переменные окружения из .env файла

const app = express()
const port = 3000

const secretKey = process.env.JWT_SECRET_KEY // Например: 'ваш_секретный_ключ'

app.use(cors())
app.use(bodyParser.json())

const users = {} // Хранение информации о пользователях и токенах

function authenticateToken(req, res, next) {
	const authHeader = req.headers["authorization"]
	const token = authHeader && authHeader.split(" ")[1]
	if (token == null) return res.sendStatus(401) // Если токен отсутствует

	jwt.verify(token, secretKey, (err, user) => {
		if (err) return res.sendStatus(403) // Если токен недействителен
		req.userId = user.userId
		next()
	})
}

// Регистрация пользователя
app.post("/api/register", (req, res) => {
	const { id, first_name, last_name } = req.body
	if (!id) {
		return res.status(400).json({ success: false, message: "Missing Telegram user ID" })
	}

	const user = { id, first_name, last_name }
	users[id] = { ...user, token: null, tokenExpires: null }
	console.log("User registered successfully:", user)

	// Создание нового токена
	const token = jwt.sign({ userId: user.id }, secretKey, { expiresIn: "6h" })
	users[id].token = token
	users[id].tokenExpires = Date.now() + 6 * 60 * 60 * 1000 // Время истечения токена в миллисекундах

	res.json({ success: true, token, user })
})

// Получение статуса пользователя
app.get("/api/status", authenticateToken, (req, res) => {
	const userId = req.userId
	const user = users[userId]
	if (user) {
		res.json({ success: true, user })
	} else {
		res.json({ success: false, message: "User not found" })
	}
})

// Получение токена по userId
app.get("/api/get-token", (req, res) => {
	const userId = req.query.userId
	const user = users[userId]

	if (user) {
		// Проверка истечения токена
		if (user.tokenExpires < Date.now()) {
			// Токен истек, создаем новый
			const newToken = jwt.sign({ userId: userId }, secretKey, { expiresIn: "6h" })
			users[userId].token = newToken
			users[userId].tokenExpires = Date.now() + 6 * 60 * 60 * 1000 // Обновляем время истечения
			res.json({ token: newToken })
		} else {
			// Возвращаем текущий токен
			res.json({ token: user.token })
		}
	} else {
		res.status(404).json({ message: "User not found" })
	}
})

app.listen(port, () => {
	console.log(`API server running on http://127.0.0.1:${port}`)
})
