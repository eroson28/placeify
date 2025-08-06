const config = require('./dbConfig'),
sql = require('mssql');

const getTileInfo = async(rowNum, colNum) => {
    try {
        let pool = await sql.connect(config);
        let tiles = await pool.request().query("SELECT * FROM grid WHERE rowNum = " + rowNum + "AND colNum = " + colNum);
        console.log(tiles);
        return tiles.recordset;
    } catch (error) {
        console.log(error);
    }
}

const getAllTilesFromDB = async () => {
    try {
        let pool = await sql.connect(config);
        let tiles = await pool.request().query("SELECT * FROM grid");
        return tiles.recordset;
    } catch (error) {
        console.error("Database error: ", error);
        throw error;
    }
};

const updateTile = async ({ rowNum, colNum, link, username, lastUpdated }) => {
    try {
        let pool = await sql.connect(config);
        const result = await pool.request()
            .input('rowNum', sql.Int, rowNum)
            .input('colNum', sql.Int, colNum)
            .input('link', sql.NVarChar, link)
            .input('username', sql.NVarChar, username)
            .input('lastUpdated', sql.DateTime, lastUpdated)
            .query(`
                UPDATE grid
                SET
                    link = @link,
                    username = @username,
                    lastUpdated = @lastUpdated
                WHERE
                    rowNum = @rowNum AND colNum = @colNum
            `);
        return result.rowsAffected;
    } catch (error) {
        console.error("Database error in updateTile:", error);
        throw error;
    }
};

module.exports = {
    getTileInfo,
    getAllTilesFromDB,
    updateTile
}