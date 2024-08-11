//const fs = require("fs")
//const https = require("https")
//const express = require("express")
//const WebSocket = require("ws")
//const bodyParser = require("body-parser")

//const keyPath = "/etc/letsencrypt/live/car-service.fvds.ru/privkey.pem"
//const certPath = "/etc/letsencrypt/live/car-service.fvds.ru/fullchain.pem"

//// Создание HTTPS-сервера
//const app = express()
//app.use(bodyParser.json()) // Парсинг JSON тела запросов

//const httpsServer = https.createServer(
//	{
//		key: fs.readFileSync(keyPath),
//		cert: fs.readFileSync(certPath),
//	},
//	app
//)

//// Создание WebSocket-сервера
//const wss = new WebSocket.Server({
//	server: httpsServer,
//	verifyClient: (info, done) => {
//		done(true) // Всегда принимать соединение
//	},
//})

//const pendingResponses = new Map() // Хранилище для отложенных ответов

//wss.on("connection", (ws) => {
//	console.log("WebSocket клиент подключен")

//	ws.on("message", (message) => {
//		const messageString = message.toString() // Преобразование буфера в строку
//		const parsedMessage = JSON.parse(messageString) // Парсинг JSON строки

//		console.log("Получено сообщение =>", parsedMessage)

//		if (parsedMessage.type === "START_TOKEN") {
//			const startToken = parsedMessage.token

//			if (pendingResponses.has(startToken)) {
//				// Отправка отложенного ответа по startToken
//				const response = pendingResponses.get(startToken)
//				ws.send(JSON.stringify(response))
//				console.log("Отправка отложенного ответа для startToken:", startToken)

//				// Удаление отложенного ответа после отправки
//				pendingResponses.delete(startToken)
//			} else {
//				console.log("Нет отложенных ответов для startToken:", startToken)
//			}
//		} else if (parsedMessage.type === "TOKEN") {
//			const token = parsedMessage.token
//			const startToken = parsedMessage.startToken
//			const userId = parsedMessage.userId

//			console.log("Получен токен:", token, "для пользователя с userId:", userId)

//			if (startToken) {
//				// Сохранение токена для отложенной отправки по startToken
//				pendingResponses.set(startToken, {
//					type: "TOKEN",
//					token: token,
//					userId: userId,
//				})
//				console.log("Токен сохранен для startToken:", startToken)
//			} else if (userId) {
//				// Сохранение токена для отложенной отправки по userId
//				pendingResponses.set(userId, {
//					type: "TOKEN",
//					token: token,
//					userId: userId,
//				})
//				console.log("Токен сохранен для userId:", userId)
//			}

//			// Отправка подтверждения получения сообщения обратно клиенту
//			ws.send("Сообщение получено")
//		}
//	})

//	ws.on("close", () => {
//		console.log("WebSocket клиент отключен")
//	})
//})

//// Запуск HTTPS-сервера и WebSocket-сервера на одном порту
//httpsServer.listen(8081, () => {
//	console.log("HTTP сервер и WebSocket сервер запущены на https://car-service.fvds.ru/api/message")
//})
