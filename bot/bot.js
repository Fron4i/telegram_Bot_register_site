const TelegramBot = require("node-telegram-bot-api")
const axios = require("axios")
const WebSocket = require("ws")

const token = "7252583854:AAEMmFsQKr9LoQ7fVC3fiNLO60WWjIO_irE"
const bot = new TelegramBot(token, { polling: true })
const ws = new WebSocket("wss://car-service.fvds.ru/ws/")

// Хранилище для startToken
const startTokenMap = new Map()

// Обработка команды /start с параметрами
bot.onText(/\/start(?:@.+)?\s*(.+)?/, (msg, match) => {
	const chatId = msg.chat.id
	const startToken = match[1] // Извлекаем startToken из параметров команды

	if (startToken) {
		startTokenMap.set(chatId, startToken)
	}

	// Запрашиваем контакт пользователя
	bot.sendMessage(chatId, "Поделитесь своим контактом для регистрации.", {
		reply_markup: {
			one_time_keyboard: true,
			keyboard: [[{ text: "Поделиться контактом", request_contact: true }]],
		},
	})
})
const messageQueue = []

ws.on("open", () => {
	console.log("Подключено к серверу WebSocket")

	// Отправляем все сообщения из очереди
	while (messageQueue.length > 0) {
		const message = messageQueue.shift()

		console.log("Запросы в очереди ", message)

		ws.send(message)
	}
})

ws.on("error", (error) => {
	console.error("Ошибка WebSocket соединения:", error)
})

bot.on("contact", (msg) => {
	const chatId = msg.chat.id
	const contact = msg.contact
	const startToken = startTokenMap.get(chatId) // Получаем startToken для текущего пользователя

	axios
		.post("https://car-service.fvds.ru/api/register", {
			id: contact.user_id,
			first_name: contact.first_name,
			last_name: contact.last_name,
		})
		.then((response) => {
			const { token } = response.data

			const message = JSON.stringify({
				type: "TOKEN",
				token: token,
				startToken: startToken,
				userId: contact.user_id,
			})

			// Если WebSocket соединение не активно, добавляем сообщение в очередь
			if (ws.readyState === WebSocket.OPEN) {
				ws.send(message)
			} else {
				console.log("WebSocket соединение не активно, добавляем сообщение в очередь")
				messageQueue.push(message)
			}

			bot.sendMessage(chatId, "Вы успешно зарегистрированы. Пожалуйста, вернитесь на сайт.", {
				reply_markup: {
					inline_keyboard: [
						[
							{
								text: "Перейти на сайт",
								url: "https://car-service.fvds.ru", // Замените на URL вашего сайта
							},
						],
					],
				},
			})

			// Удаляем startToken после использования
			startTokenMap.delete(chatId)
		})
		.catch((error) => {
			console.error("Ошибка при регистрации пользователя:", error)
			bot.sendMessage(chatId, "Произошла ошибка при регистрации. Попробуйте позже.")
		})
})
