const express = require("express")
const cors = require("cors")
const jwt = require("jsonwebtoken")
const bodyParser = require("body-parser")

const dotenv = require("dotenv")
dotenv.config()

const { User, sequelize } = require("../bd/database")

const app = express()
const port = 3000

const secretKey = process.env.JWT_SECRET_KEY
app.use(cors())
app.use(bodyParser.json())

function formatDateTimeRU(date) {
	const options = {
		year: "numeric",
		month: "numeric",
		day: "numeric",
		hour: "numeric",
		minute: "numeric",
		second: "numeric",
		timeZone: "Europe/Moscow",
	}
	return new Date(date).toLocaleString("ru-RU", options)
}

function authenticateToken(req, res, next) {
	const authHeader = req.headers["authorization"]
	const token = authHeader && authHeader.split(" ")[1]
	if (token == null) return res.sendStatus(401)

	jwt.verify(token, secretKey, (err, user) => {
		if (err) return res.sendStatus(403)
		req.userId = user.userId
		next()
	})
}

// Функция для вывода всех данных из базы данных
async function displayAllUsers() {
	try {
		const users = await User.findAll() // Получение всех пользователей
		console.log("All registered users:")
		users.forEach((user) => {
			const userJson = user.toJSON()
			userJson.createdAt = formatDateTimeRU(userJson.createdAt)
			userJson.updatedAt = formatDateTimeRU(userJson.updatedAt)
			userJson.tokenExpires = formatDateTimeRU(userJson.tokenExpires)
			console.log(userJson) // Вывод каждого пользователя
		})
	} catch (error) {
		console.error("Error retrieving users:", error)
	}
}

// Регистрация пользователя
app.post("/api/register", async (req, res) => {
	const { id, first_name, last_name } = req.body
	if (!id) {
		return res.status(400).json({ success: false, message: "Missing Telegram user ID" })
	}

	// Создание или обновление пользователя в базе данных
	const [user, created] = await User.upsert({
		id,
		first_name,
		last_name,
	})

	console.log("User registered successfully:", user.toJSON())

	// Создание нового токена
	const token = jwt.sign({ userId: user.id }, secretKey, { expiresIn: "6h" })
	user.token = token
	user.tokenExpires = new Date(Date.now() + 6 * 60 * 60 * 1000)
	await user.save()

	const userJson = user.toJSON()
	userJson.createdAt = formatDateTimeRU(userJson.createdAt)
	userJson.updatedAt = formatDateTimeRU(userJson.updatedAt)
	userJson.tokenExpires = formatDateTimeRU(userJson.tokenExpires)

	res.json({ success: true, token, user: userJson })
})

// Получение статуса пользователя
app.get("/api/status", authenticateToken, async (req, res) => {
	const userId = req.userId
	const user = await User.findByPk(userId)
	if (user) {
		const userJson = user.toJSON()
		userJson.createdAt = formatDateTimeRU(userJson.createdAt)
		userJson.updatedAt = formatDateTimeRU(userJson.updatedAt)
		userJson.tokenExpires = formatDateTimeRU(userJson.tokenExpires)
		res.json({ success: true, user: userJson })
	} else {
		res.json({ success: false, message: "User not found" })
	}
})

// Получение токена по userId
app.get("/api/get-token", async (req, res) => {
	const userId = req.query.userId
	const user = await User.findByPk(userId)

	if (user) {
		if (user.tokenExpires < Date.now()) {
			const newToken = jwt.sign({ userId: userId }, secretKey, { expiresIn: "6h" })
			user.token = newToken
			user.tokenExpires = new Date(Date.now() + 6 * 60 * 60 * 1000)
			await user.save()
			res.json({ token: newToken })
		} else {
			res.json({ token: user.token })
		}
	} else {
		res.status(404).json({ message: "User not found" })
	}
})

// Запуск сервера и вывод всех данных из БД
app.listen(port, async () => {
	console.log(`API server running on https://car-service.fvds.ru:${port}`)
	await displayAllUsers()
})
