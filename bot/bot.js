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

// Обработка контакта пользователя
bot.on("contact", (msg) => {
	const chatId = msg.chat.id
	const contact = msg.contact
	const startToken = startTokenMap.get(chatId) // Получаем startToken для текущего пользователя

	if (!contact || !startToken) {
		bot.sendMessage(chatId, "Не удалось получить контакт или стартовый токен. Попробуйте снова.")
		return
	}

	// Регистрация и отправка данных на основной сервер
	axios
		.post("https://car-service.fvds.ru/api/register", {
			id: contact.user_id,
			first_name: contact.first_name,
			last_name: contact.last_name,
			startToken: startToken, // Отправляем startToken вместе с регистрацией
		})
		.then((response) => {
			const { token } = response.data

			// После успешной регистрации
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
		})
		.catch((error) => {
			console.error("Ошибка при регистрации пользователя:", error)
			bot.sendMessage(chatId, "Произошла ошибка при регистрации. Попробуйте позже.")
		})
})
