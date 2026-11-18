//Importer l'ORM
import { Sequelize } from "sequelize";

//Importer les informations de connexion (.env)
//dotenv.config() remplit aussi process.env (utilise plus tard pour TOKEN_SECRET)
import dotenv from "dotenv"
dotenv.config()

const { DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_DIALECT } = process.env

//Creation de la connexion
const database = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
    host: DB_HOST,
    dialect: DB_DIALECT,
    port: DB_PORT,
    logging: false //Mettre console.log pour voir les requetes SQL generees
})

export default database
