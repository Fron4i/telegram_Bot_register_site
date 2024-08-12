const express = require("express")
const cors = require("cors")
const jwt = require("jsonwebtoken")
const bodyParser = require("body-parser")
const https = require("https")
const fs = require("fs")
const dotenv = require("dotenv")
dotenv.config()

const { User, sequelize } = require("../bd/database")

const app = express()
const port = 3000
const secretKey = process.env.JWT_SECRET_KEY

app.use(cors())
app.use(bodyParser.json())

// Функция для форматирования даты и времени
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

// Аутентификация токена
function authenticateToken(req, res, next) {
	const authHeader = req.headers["authorization"]
	const token = authHeader && authHeader.split(" ")[1]
	if (token == null) return res.sendStatus(401)

	jwt.verify(token, secretKey, async (err, user) => {
		if (err) return res.sendStatus(403)

		// Проверка, что токен валиден
		const dbUser = await User.findByPk(user.userId)
		if (!dbUser || dbUser.token !== token || !dbUser.isValid) {
			return res.sendStatus(403)
		}

		req.userId = user.userId
		next()
	})
}

// Регистрация пользователя через бота
app.post("/api/register", async (req, res) => {
	const { id, first_name = "", last_name = "", startToken } = req.body
	console.log("Received registration request:", req.body)

	if (!id || !startToken) {
		console.log("Missing required parameters:", { id, startToken })
		return res.status(400).json({ success: false, message: "Missing required parameters" })
	}

	try {
		// Аннулирование всех предыдущих токенов для этого пользователя
		await User.update({ isValid: false }, { where: { id } })
		console.log(`Invalidated old tokens for user: ${id}`)

		// Создание или обновление пользователя и установка новой сессии как валидной
		const [user, created] = await User.upsert({
			id,
			first_name: first_name || null, // Присваиваем null, если поле пустое
			last_name: last_name || null, // Присваиваем null, если поле пустое
			token: null, // Сбрасываем токен
			isValid: true,
			startToken,
		})

		console.log("User registered successfully:", user.toJSON())

		const userJson = user.toJSON()
		userJson.createdAt = formatDateTimeRU(userJson.createdAt)
		userJson.updatedAt = formatDateTimeRU(userJson.updatedAt)

		res.json({ success: true, user: userJson })
	} catch (error) {
		console.error("Error during registration:", error)
		res.status(500).json({ success: false, message: "Internal server error" })
	}
})

// Проверка стартового токена и генерация основного токена
app.get("/api/check-start-token", async (req, res) => {
	const { token } = req.query
	console.log("Checking start token:", token) // Логируем стартовый токен

	if (!token) {
		console.log("Start token is missing") // Логируем отсутствие стартового токена
		return res.status(400).json({ success: false, message: "Start token is missing" })
	}

	try {
		const user = await User.findOne({ where: { startToken: token } })
		if (user) {
			console.log("User found with start token:", user.toJSON()) // Логируем успешный поиск пользователя

			// Генерация нового authToken
			const authToken = jwt.sign({ userId: user.id }, secretKey, { expiresIn: "12h" })
			user.token = authToken
			user.tokenExpires = new Date(Date.now() + 12 * 60 * 60 * 1000)
			user.startToken = null // Обнуление стартового токена после использования
			await user.save()

			console.log("Auth token generated and user updated:", authToken) // Логируем генерацию authToken и обновление пользователя
			res.json({ success: true, token: authToken })
		} else {
			console.log("Invalid start token") // Логируем ошибку с токеном
			res.status(404).json({ success: false, message: "Invalid start token" })
		}
	} catch (error) {
		console.error("Ошибка при обработке стартового токена:", error)
		res.status(500).json({ success: false, message: "Internal server error" })
	}
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

// Получение нового authToken по userId
app.get("/api/get-token", async (req, res) => {
	const userId = req.query.userId
	const user = await User.findByPk(userId)

	if (user) {
		if (user.tokenExpires < Date.now()) {
			const newToken = jwt.sign({ userId: userId }, secretKey, { expiresIn: "6h" })
			user.token = newToken
			user.tokenExpires = new Date(Date.now() + 6 * 60 * 60 * 1000)
			user.isValid = true // Новый токен валиден
			await user.save()

			// Аннулируем все предыдущие токены пользователя
			await User.update({ isValid: false }, { where: { id: userId, token: { [Sequelize.Op.ne]: newToken } } })

			res.json({ token: newToken })
		} else {
			res.json({ token: user.token })
		}
	} else {
		res.status(404).json({ message: "User not found" })
	}
})

// Создание HTTPS-сервера с SSL-сертификатами
const sslServer = https.createServer(
	{
		key: fs.readFileSync("/etc/letsencrypt/live/car-service.fvds.ru/privkey.pem"),
		cert: fs.readFileSync("/etc/letsencrypt/live/car-service.fvds.ru/fullchain.pem"),
	},
	app
)

// Запуск HTTPS-сервера
sslServer.listen(port, async () => {
	console.log(`API server running on https://car-service.fvds.ru/api/`)
})
