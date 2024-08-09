const WebSocket = require("ws")

const wss = new WebSocket.Server({ port: 8081 })
const pendingResponses = new Map() // Хранение отложенных ответов

wss.on("connection", (ws) => {
	console.log("Новый клиент подключен")

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
				pendingResponses.delete(startToken)
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
		} else if (parsedMessage.type === "USER_ID") {
			const userId = parsedMessage.userId
			console.log("Получен userId:", userId)

			if (pendingResponses.has(userId)) {
				// Отправка отложенного ответа по userId
				const response = pendingResponses.get(userId)
				ws.send(JSON.stringify(response))
				console.log("Отправка отложенного ответа для userId:", userId)

				// Удаление отложенного ответа после отправки
				pendingResponses.delete(userId)
			} else {
				console.log("Нет отложенных ответов для userId:", userId)
			}
		}
	})

	ws.on("close", () => {
		console.log("Клиент отключился")
	})
})
