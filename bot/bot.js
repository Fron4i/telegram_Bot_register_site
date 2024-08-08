const TelegramBot = require("node-telegram-bot-api")
const axios = require("axios")

const token = "7252583854:AAEMmFsQKr9LoQ7fVC3fiNLO60WWjIO_irE"
const bot = new TelegramBot(token, { polling: true })

bot.onText(/\/start (.+)/, (msg, match) => {
	const chatId = msg.chat.id
	const userId = match[1]

	if (userId === "register") {
		bot.sendMessage(chatId, "Пожалуйста, поделитесь своим контактом для регистрации.", {
			reply_markup: {
				one_time_keyboard: true,
				keyboard: [
					[
						{
							text: "Поделиться контактом",
							request_contact: true,
						},
					],
				],
			},
		})
	}
})

bot.on("contact", (msg) => {
	const chatId = msg.chat.id
	const contact = msg.contact

	console.log("Received contact:", contact) // Логирование полученных данных

	axios
		.post("http://127.0.0.1:3000/api/register", {
			id: contact.user_id,
			phone_number: contact.phone_number,
			first_name: contact.first_name,
			last_name: contact.last_name,
		})
		.then((response) => {
			console.log("Response from server:", response.data) // Логирование ответа сервера
			bot.sendMessage(chatId, "Вы успешно зарегистрированы. Вернитесь на сайт для завершения регистрации.", {
				reply_markup: {
					inline_keyboard: [[{ text: "Вернуться на сайт", url: "http://127.0.0.1:5500/telegram_Bot_register_site/website/index.html" }]],
				},
			})
		})
		.catch((error) => {
			console.error("Error registering user:", error) // Логирование ошибки
			bot.sendMessage(chatId, "Произошла ошибка при регистрации. Попробуйте позже.")
		})
})
