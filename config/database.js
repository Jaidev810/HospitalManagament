const mysql = require('mysql');

const connection = mysql.createConnection({
    host : process.env.DB_Host,
    user: process.env.DB_USER,
    password : process.env.DB_PASS,
    database: process.env.MYSQL_DB,
    multipleStatements: true
});


module.exports = connection;