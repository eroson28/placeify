const dotenv = require("dotenv");
dotenv.config();

const config = {
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    server: 'DESKTOP-L342PMS',
    database: 'Spotiplace',
    options: {
        trustServerCertificate: true,
        trustedConnection: false,
        enableArithAbort: true
    },
    port: 1433,
}

module.exports = config;