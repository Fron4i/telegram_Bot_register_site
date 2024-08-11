const { Sequelize, DataTypes } = require("sequelize")

// Создание подключения к базе данных
const sequelize = new Sequelize({
	dialect: "sqlite",
	storage: "database.sqlite",
	logging: false, // Отключение логирования
})

// Определение модели пользователя с явным указанием имени таблицы
const User = sequelize.define(
	"User",
	{
		id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
		},
		first_name: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		last_name: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		// Поле для хранения основного токена (authToken)
		token: {
			type: DataTypes.STRING,
		},
		// Поле для хранения стартового токена
		startToken: {
			type: DataTypes.STRING,
		},
		// Поле для хранения даты истечения основного токена
		tokenExpires: {
			type: DataTypes.DATE,
		},
		// Поле для указания, является ли основной токен валидным
		isValid: {
			type: DataTypes.BOOLEAN,
			defaultValue: true, // По умолчанию токен валиден
		},
	},
	{
		tableName: "Users", // Указываем имя таблицы в базе данных
	}
)

// Синхронизация базы данных (создание таблицы, если ее нет, и обновление структуры)
sequelize
	.sync({ alter: true }) // Включаем логирование запросов к базе данных
	.catch((error) => {
		console.error("Error creating/updating database:", error)
	})

module.exports = { User, sequelize }
