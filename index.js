require('dotenv').config();

const express = require('express');
const app = express();

// Acessando as variáveis
const port = process.env.PORT || 3000;
const dbHost = process.env.DB_HOST;

console.log(`Servidor rodando na porta: ${port}`);
console.log(`Conectando ao banco: ${dbHost}`);

app.listen(port);
