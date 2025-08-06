const dotenv = require("dotenv");
dotenv.config();

const config = {
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
};

module.exports = config;