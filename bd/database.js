const { Sequelize, DataTypes } = require("sequelize")

// Create the Sequelize connection with logging disabled
const sequelize = new Sequelize({
	dialect: "sqlite",
	storage: "database.sqlite",
	logging: false, // Disable logging
})

// Определение модели пользователя
const User = sequelize.define("User", {
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
})

// Синхронизация базы данных (создание таблицы, если ее нет)
sequelize.sync()

module.exports = { User, sequelize }
