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
			allowNull: true, // Поле теперь необязательное
		},
		last_name: {
			type: DataTypes.STRING,
			allowNull: true, // Поле теперь необязательное
		},
		// Остальные поля без изменений
		token: {
			type: DataTypes.STRING,
		},
		startToken: {
			type: DataTypes.STRING,
		},
		tokenExpires: {
			type: DataTypes.DATE,
		},
		isValid: {
			type: DataTypes.BOOLEAN,
			defaultValue: true,
		},
	},
	{
		tableName: "Users",
	}
)

// Синхронизация базы данных (создание таблицы, если ее нет, и обновление структуры)
sequelize
	.sync({ alter: true }) // Включаем логирование запросов к базе данных
	.catch((error) => {
		console.error("Error creating/updating database:", error)
	})

module.exports = { User, sequelize }
