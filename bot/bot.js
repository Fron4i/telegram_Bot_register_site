const TelegramBot = require("node-telegram-bot-api")
const axios = require("axios")

// Создание бота
const token = "7252583854:AAEMmFsQKr9LoQ7fVC3fiNLO60WWjIO_irE"
const bot = new TelegramBot(token, { polling: true })

// Хранилище для стартовых токенов
const startTokenMap = new Map()

// Обработка команды /start с параметрами
bot.onText(/\/start(?:@.+)?\s*(.+)?/, (msg, match) => {
	const chatId = msg.chat.id
	const startToken = match[1]
	console.log(`Received start command from chat ${chatId} with token: ${startToken}`)

	if (startToken) {
		startTokenMap.set(chatId, startToken)
	}

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
	const startToken = startTokenMap.get(chatId)
	console.log(`Received contact from chat ${chatId}:`, contact)

	if (!contact || !startToken) {
		console.log("Contact or startToken is missing")
		bot.sendMessage(chatId, "Не удалось получить контакт или стартовый токен. Попробуйте снова.")
		return
	}

	axios
		.post("https://car-service.fvds.ru/api/register", {
			id: contact.user_id,
			first_name: contact.first_name || "", // Если first_name отсутствует, передаем пустую строку
			last_name: contact.last_name || "", // Если last_name отсутствует, передаем пустую строку
			startToken: startToken,
		})
		.then((response) => {
			console.log("User registered via bot:", response.data)
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
			startTokenMap.delete(chatId)
		})
		.catch((error) => {
			console.error("Ошибка при регистрации пользователя через бот:", error)
			bot.sendMessage(chatId, "Произошла ошибка при регистрации. Попробуйте позже.")
		})
})
