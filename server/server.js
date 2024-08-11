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
	const { id, first_name, last_name, startToken } = req.body
	if (!id || !startToken) {
		return res.status(400).json({ success: false, message: "Missing required parameters" })
	}

	// Аннулируем предыдущие токены пользователя
	await User.update({ isValid: false }, { where: { id } })

	// Создание или обновление пользователя в базе данных
	const [user, created] = await User.upsert({
		id,
		first_name,
		last_name,
		token: null, // Изначально токен отсутствует
		isValid: true, // Новый токен будет валиден
	})

	console.log("User registered successfully:", user.toJSON())

	// Сохранение стартового токена
	user.startToken = startToken
	await user.save()

	const userJson = user.toJSON()
	userJson.createdAt = formatDateTimeRU(userJson.createdAt)
	userJson.updatedAt = formatDateTimeRU(userJson.updatedAt)

	res.json({ success: true, user: userJson })
})

// Проверка стартового токена и генерация основного токена
app.get("/api/check-start-token", async (req, res) => {
	const { token: startToken } = req.query
	if (!startToken) {
		return res.status(400).json({ success: false, message: "Start token is missing" })
	}

	const user = await User.findOne({ where: { startToken } })

	if (user) {
		// Генерация нового authToken
		const authToken = jwt.sign({ userId: user.id }, secretKey, { expiresIn: "6h" })
		user.token = authToken
		user.tokenExpires = new Date(Date.now() + 6 * 60 * 60 * 1000)
		user.startToken = null // Обнуление стартового токена после использования
		await user.save()

		const userJson = user.toJSON()
		userJson.createdAt = formatDateTimeRU(userJson.createdAt)
		userJson.updatedAt = formatDateTimeRU(userJson.updatedAt)
		userJson.tokenExpires = formatDateTimeRU(userJson.tokenExpires)

		res.json({ success: true, token: authToken, user: userJson })
	} else {
		res.status(404).json({ success: false, message: "Invalid start token" })
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
