const express = require("express");

const {
    registrar,
    login
} = require("../controllers/authController");

const router = express.Router();

/**
 * ==========================
 * AUTENTICAÇÃO
 * ==========================
 */

router.post("/registrar", registrar);

router.post("/login", login);

module.exports = router;