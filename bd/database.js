const { Sequelize, DataTypes } = require("sequelize")

// Создаем подключение к базе данных SQLite
const sequelize = new Sequelize({
	dialect: "sqlite",
	storage: "database.sqlite",
})

// Определение модели пользователя
const User = sequelize.define("User", {
	id: {
		type: DataTypes.STRING,
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
})

// Синхронизация базы данных (создание таблицы, если ее нет)
sequelize.sync()

module.exports = { User, sequelize }
