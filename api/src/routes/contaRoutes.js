const express = require("express");


const {
    buscarConta,
    depositar,
    sacar,
    transferir,
    consultarExtrato
} = require("../controllers/contaController");

const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

/**
 * ===================================================
 * ROTAS DA CONTA
 * ===================================================
 */

// Buscar dados da conta
router.get(
    "/",
    authMiddleware,
    buscarConta
);

/**
 * ===================================================
 * DEPÓSITO
 * ===================================================
 */
router.post(
    "/depositar",
    authMiddleware,
    depositar
);

router.post(
    "/sacar",
    authMiddleware,
    sacar
);

router.post(
    "/transferir",
    authMiddleware,
    transferir
);

router.get(
    "/extrato",
    authMiddleware,
    consultarExtrato
)

module.exports = router;