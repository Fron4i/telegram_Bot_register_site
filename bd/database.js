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
		token: {
			type: DataTypes.STRING,
		},
		tokenExpires: {
			type: DataTypes.DATE,
		},
	},
	{
		tableName: "Users", // Указываем имя таблицы в базе данных
	}
)

// Синхронизация базы данных (создание таблицы, если ее нет, и обновление структуры)
sequelize
	.sync({ alter: true }) // alter: true для изменения существующей таблицы
	.then(() => {
		console.log("Database & tables created/updated!")
	})
	.catch((error) => {
		console.error("Error creating/updating database:", error)
	})

module.exports = { User, sequelize }
