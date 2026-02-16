const express = require('express');
const pool = require('./src/config/connection');
const app = express();
app.use(express.json());

const times = ['São Paulo', 'Flamengo', 'Palmeiras', 'Remo', 'Vitória', 'CRB', 'Botafgo', 'Vasco']
app.get('/times', (req,res) => {
    return res.json(times);
});

// Acessando as variáveis
app.get('/times/:index',(req, res) => {
    const {index} = req.params;
    return res.json(times[index]);
});

// Teste real banco
app.get('/db-test', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json(err.message);
    }
});

// criando um time
app.post('/teams', async (req, res) => {
    try {
        const { name } = req.body;

        const result = await pool.query(
            'INSERT INTO teams (name) VALUES ($1) RETURNING *',
            [name]
        );

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json(err.message);
    }
});

//receber os valores da tabela times
app.get('/teams', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM teams',
           
        );

        res.json(result.rows);
    } catch (err) {
        res.status(500).json(err.message);
    }
});

//atualizar curso
app.put('/teams/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        const result = await pool.query(
            'UPDATE teams SET name = $1 WHERE id = $2 RETURNING *',
            [name, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json('Time não encontrado');
        }

        res.json(result.rows[0]);

    } catch (err) {
        res.status(500).json(err.message);
    }
});


app.delete('/teams/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'DELETE FROM teams WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json('Time não encontrado');
        }

        res.json(result.rows[0]);

    } catch (err) {
        res.status(500).json(err.message);
    }
});
    
app.listen(3000);