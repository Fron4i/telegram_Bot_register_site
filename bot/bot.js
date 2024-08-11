const TelegramBot = require("node-telegram-bot-api")
const axios = require("axios")
const WebSocket = require("ws")

const token = "7252583854:AAEMmFsQKr9LoQ7fVC3fiNLO60WWjIO_irE"
const bot = new TelegramBot(token, { polling: true })
const ws = new WebSocket("wss://car-service.fvds.ru/ws/")

// Хранилище для startToken
const startTokenMap = new Map()
const pendingMessages = new Map() // Хранилище для отслеживания отправленных сообщений

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

			console.log("Отправил от бота:", startToken, token)

			if (ws.readyState === WebSocket.OPEN) {
				ws.send(message)
				console.log("Сообщение отправлено через WebSocket:", message)

				// Устанавливаем таймер для ожидания подтверждения
				const confirmationTimeout = setTimeout(() => {
					console.error("Подтверждение получения сообщения не получено в течение тайм-аута")
				}, 2000) // 5 секундный таймер

				// Храним идентификатор чата и таймер
				pendingMessages.set(chatId, confirmationTimeout)

				ws.addEventListener("message", function onMessage(event) {
					if (event.data === "Сообщение получено") {
						clearTimeout(confirmationTimeout)
						console.log("Подтверждение получения сообщения получено")

						// Отменяем обработку, если подтверждение получено
						ws.removeEventListener("message", onMessage)
						bot.sendMessage(chatId, "Вы успешно зарегистрированы. Пожалуйста, вернитесь на сайт.", {
							reply_markup: {
								inline_keyboard: [
									[
										{
											text: "Перейти на сайт",
											url: "https://car-service.fvds.ru",
										},
									],
								],
							},
						})

						// Удаляем startToken после использования
						startTokenMap.delete(chatId)
					}
				})
			} else {
				console.error("WebSocket не открыт. Текущий статус:", ws.readyState)
			}
		})
		.catch((error) => {
			console.error("Ошибка при регистрации пользователя:", error)
			bot.sendMessage(chatId, "Произошла ошибка при регистрации. Попробуйте позже.")
		})
})
