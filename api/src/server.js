require('dotenv').config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const contaRoutes = require("./routes/contaRoutes");
const pool = require("./database/db");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/conta", contaRoutes);

const PORT = 3000;

app.listen(PORT, async () => {

    try {

        const result = await pool.query(
            "SELECT NOW()"
        );

        console.log("✅ PostgreSQL conectado!");
        console.log(result.rows[0]);

    } catch (error) {

        console.error(error);

    }

    console.log(
        `🚀 Servidor rodando na porta ${PORT}`
    );

});