const fs = require("fs")
const https = require("https")
const WebSocket = require("ws")

const keyPath = "/etc/letsencrypt/live/car-service.fvds.ru/privkey.pem"
const certPath = "/etc/letsencrypt/live/car-service.fvds.ru/fullchain.pem"

// Создание HTTPS-сервера
const httpsServer = https.createServer({
	key: fs.readFileSync(keyPath),
	cert: fs.readFileSync(certPath),
})

// Создание WebSocket-сервера, используя HTTPS-сервер
const wss = new WebSocket.Server({
	server: httpsServer,
	verifyClient: (info, done) => {
		done(true) // Всегда принимать соединение
	},
})

// Хранилище отложенных ответов
const pendingResponses = new Map()

wss.on("connection", (ws) => {
	ws.on("message", (message) => {
		const messageString = message.toString() // Преобразование буфера в строку
		const parsedMessage = JSON.parse(messageString) // Парсинг JSON строки

		console.log("Получено сообщение =>", parsedMessage)

		if (parsedMessage.type === "START_TOKEN") {
			const startToken = parsedMessage.token
			console.log("Получен startToken:", startToken)

			if (pendingResponses.has(startToken)) {
				// Отправка отложенного ответа по startToken
				const response = pendingResponses.get(startToken)
				ws.send(JSON.stringify(response))
				console.log("Отправка отложенного ответа для startToken:", startToken)

				// Удаление отложенного ответа после отправки
				//pendingResponses.delete(startToken)
			} else {
				console.log("Нет отложенных ответов для startToken:", startToken)
			}
		} else if (parsedMessage.type === "TOKEN") {
			const token = parsedMessage.token
			const startToken = parsedMessage.startToken
			const userId = parsedMessage.userId

			console.log("Получен токен:", token, "для пользователя с userId:", userId)

			if (startToken) {
				// Сохранение токена для отложенной отправки по startToken
				pendingResponses.set(startToken, {
					type: "TOKEN",
					token: token,
					userId: userId,
				})
				console.log("Токен сохранен для startToken:", startToken)
			} else if (userId) {
				// Сохранение токена для отложенной отправки по userId
				pendingResponses.set(userId, {
					type: "TOKEN",
					token: token,
					userId: userId,
				})
				console.log("Токен сохранен для userId:", userId)
			}
		}
	})
})

// Запуск HTTPS-сервера и WebSocket-сервера на одном порту
httpsServer.listen(8081, () => {
	console.log("WebSocket сервер запущен на wss://car-service.fvds.ru/ws/")
})
