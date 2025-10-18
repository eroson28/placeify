const config = require('./dbConfig');
const { Pool } = require('pg');

const pool = new Pool(config);

pool.on('error', (err, client) => {
    console.error('Database connection pool error:', err);
    // You can remove the process.exit(1) if you prefer not to crash the app on error
});

const getTileInfo = async (rowNum, colNum) => {
    try {
        const client = await pool.connect();
        const query = 'SELECT * FROM grid WHERE rownum = $1 AND colnum = $2';
        const result = await client.query(query, [rowNum, colNum]);
        client.release();
        return result.rows;
    } catch (error) {
        console.error("Database error in getTileInfo:", error);
        throw error;
    }
};

const getAllTilesFromDB = async () => {
    try {
        const client = await pool.connect();
        const result = await client.query("SELECT * FROM grid");
        client.release();
        return result.rows;
    } catch (error) {
        console.error("Database error in getAllTilesFromDB:", error);
        throw error;
    }
};

const updateTile = async ({ rowNum, colNum, link, username, lastUpdated }) => {
    try {
        const client = await pool.connect();
        const query = `
            UPDATE grid
            SET
                link = $1,
                username = $2,
                lastupdated = $3
            WHERE
                rownum = $4 AND colnum = $5;
        `;
        const values = [link, username, lastUpdated, rowNum, colNum];
        const result = await client.query(query, values);
        client.release();
        return result.rowCount;
    } catch (error) {
        console.error("Database error in updateTile:", error);
        throw error;
    }
};

module.exports = {
    getTileInfo,
    getAllTilesFromDB,
    updateTile
};