const express = require('express');
const pool = require('./src/config/connection');
const app = express();
app.use(express.json());

// Middleware Global
app.use((req,res, next)=>{
    console.log(`URL: ${req.url}`);
    return next();
})

//função para checar se o body está sendo enviado corretamente
function checkTeams(req,res, next){
    if(!req.body.name){
        return res.status(400).json({ error: "Nome do time é obrigatório"});

    }
    return next();
}
// não permitir criar mais de 8 times
async function checkTeamsLimit(req, res, next) {
    try {
        const result = await pool.query('SELECT COUNT(*) FROM teams');
        const total = Number(result.rows[0].count);

        if (total >= 8) {
            return res.status(400).json({
                error: "Não é possível criar novos times (máximo 8)"
            });
        }

        next();

    } catch (err) {
        return res.status(500).json(err.message);
    }
}


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
app.post('/teams', checkTeams, checkTeamsLimit, async (req, res) => {
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
app.put('/teams/:id',checkTeams, async (req, res) => {
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

// DELETAR TIME
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



// criando um campeonato
app.post('/championship', async (req, res) =>{
    try{
        const {championship_name} = req.body;

        const result_name = await pool.query(
            'INSERT INTO championships (championship_name) VALUES ($1) RETURNING *',
            [championship_name]
        );
        res.json(result_name.rows[0]);
    } catch (err) {
        res.status(500).json(err.message);
    }
});

// visualizando um campeonato
app.get('/championships', async (req, res) =>{
    try{
        const result_name = await pool.query(
            'SELECT * FROM championships',
        );
        res.json(result_name.rows);  // res.json(result_name.rows[0]); para receber somente 1 valor
    } catch (err) {
        res.status(500).json(err.message);
    }
});

//visualizando campeonatos
app.get('/resultados', async (req, res) =>{
    try {
        let query = 'SELECT * FROM matches WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        if (req.query.phase) {
            const phases = Array.isArray(req.query.phase)
            ? req.query.phase
            : [req.query.phase];

            const placeholders = phases.map(() => `$${paramIndex++}`).join(', ');
            query += ` AND phase IN (${placeholders})`;

            params.push(...phases)  ;
        }
        
        const result = await pool.query(query, params);

        res.json({
            data: result.rows,
            count: result.rowCount,
            filters_applied: req.query.phase ? { phase: req.query.phase } : {}
        });
        
        console.log('Query final:', query);
        console.log('Parâmetros:', params);
  
    } catch (err) {
        res.status(500).json(err.message);
        console.error(err);
    }
});
    

/////////////////////////////////  lógica do jogo  \\\\\\\\\\\\\\\\\\\\\\\\\\\\\
const { spawn } = require('child_process');

// Função auxiliar: chama Python e retorna placar
function getRandomScore() {
    return new Promise((resolve, reject) => {
        const python = spawn('python', ['teste.py']);
        let output = '';
        let errorOutput = '';

        python.stdout.on('data', (data) => {
            output += data.toString();
        });

        python.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        python.on('close', (code) => {
            if (code !== 0) {
                return reject(new Error(`Python falhou (code ${code}): ${errorOutput}`));
            }
            const lines = output.trim().split('\n');
            if (lines.length < 2) {
                return reject(new Error('Output inválido do Python'));
            }
            const score1 = parseInt(lines[0], 10);
            const score2 = parseInt(lines[1], 10);
            if (isNaN(score1) || isNaN(score2)) {
                return reject(new Error('Placar inválido retornado'));
            }
            resolve({ score1, score2 });
        });

        python.on('error', reject);
    });
}

// Calcula pontuação acumulada de um time no campeonato até o momento
async function getTeamPoints(teamId, championshipId) {
    const result = await pool.query(`
        SELECT COALESCE(SUM(
            CASE 
                WHEN team_a_id = $1 THEN goals_a - goals_b
                WHEN team_b_id = $1 THEN goals_b - goals_a
                ELSE 0 
            END
        ), 0) AS points
        FROM matches
        WHERE championship_id = $2
    `, [teamId, championshipId]);

    return parseInt(result.rows[0].points, 10) || 0;
}

// Rota principal de simulação
app.post('/championships/:id/simulate', async (req, res) => {
    const { id } = req.params;

    try {
        // 1. Verifica se o campeonato existe e está pendente
        const champRes = await pool.query(
            'SELECT * FROM championships WHERE id = $1',
            [id]
        );
        if (champRes.rows.length === 0) {
            return res.status(404).json({ error: 'Campeonato não encontrado' });
        }
        const championship = champRes.rows[0];
        if (championship.status !== 'CREATED') {
            return res.status(400).json({ error: 'Campeonato já foi simulado ou está em andamento' });
        }

        // 2. Verifica exatamente 8 times
        const countRes = await pool.query('SELECT COUNT(*) FROM teams');
        if (parseInt(countRes.rows[0].count) !== 8) {
            return res.status(400).json({ error: 'Deve haver exatamente 8 times cadastrados' });
        }

        // 3. Pega todos os times (ordenados por data de cadastro para desempate consistente)
        const teamsRes = await pool.query('SELECT id, name FROM teams ORDER BY created_at ASC');
        let teams = teamsRes.rows;

        // Sorteia o chaveamento (shuffle)
        teams = teams.sort(() => Math.random() - 0.5);

        const matchesInserted = [];

        // Função auxiliar para simular um jogo e salvar
        async function playMatch(t1, t2, phase) {
            const { score1, score2 } = await getRandomScore();

            let winnerId, loserId;

            if (score1 > score2) {
                winnerId = t1.id;
                loserId = t2.id;
            } else if (score2 > score1) {
                winnerId = t2.id;
                loserId = t1.id;
            } else {
                // Empate → desempate por pontos acumulados
                const points1 = await getTeamPoints(t1.id, id);
                const points2 = await getTeamPoints(t2.id, id);

                if (points1 > points2) {
                    winnerId = t1.id;
                    loserId = t2.id;
                } else if (points2 > points1) {
                    winnerId = t2.id;
                    loserId = t1.id;
                } else {
                    // Empate nos pontos → time com id menor (inscrito primeiro)
                    winnerId = t1.createad_at < t2.createad_at ? t1.createad_at : t2.createad_at;
                    loserId = t1.createad_at < t2.createad_at ? t2.createad_at : t1.createad_at;
                }
            }

            // Salva o jogo
            const matchRes = await pool.query(`
                INSERT INTO matches (championship_id, phase, team_a_id, team_b_id, goals_a, goals_b, winner_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `, [id, phase, t1.id, t2.id, score1, score2, winnerId]);

            matchesInserted.push(matchRes.rows[0]);

            return { winner: teams.find(t => t.id === winnerId) };
        }

        // Fase 1: Quartas de final (4 jogos)
        const quarterWinners = [];
        for (let i = 0; i < 8; i += 2) {
            const res = await playMatch(teams[i], teams[i + 1], 'quartas');
            quarterWinners.push(res.winner);
        }

        // Fase 2: Semifinais (2 jogos)
        const semiWinners = [];
        const semiLosers = [];
        for (let i = 0; i < 4; i += 2) {
            const res = await playMatch(quarterWinners[i], quarterWinners[i + 1], 'semifinal');
            semiWinners.push(res.winner);
            semiLosers.push(quarterWinners[i === 0 ? 1 : 0]); // perdedor
        }

        // Disputa de 3º lugar
        const thirdPlaceRes = await playMatch(semiLosers[0], semiLosers[1], 'terceiro_lugar');
        const thirdPlace = thirdPlaceRes.winner;

        // Final
        const finalRes = await playMatch(semiWinners[0], semiWinners[1], 'final');
        const champion = finalRes.winner;

        // Atualiza o campeonato com o vencedor e status
        await pool.query(`
            UPDATE championships 
            SET status = 'completed', winner_team_id = $1 
            WHERE id = $2
        `, [champion.id, id]);

        // Retorna resultado resumido
        res.json({
            message: 'Campeonato simulado com sucesso!',
            champion: champion.name,
            vice: semiWinners.find(t => t.id !== champion.id)?.name,
            terceiro: thirdPlace.name,
            matches: matchesInserted.map(m => ({
                phase: m.phase,
                team1: teams.find(t => t.id === m.team_a_id)?.name,
                team2: teams.find(t => t.id === m.team_b_id)?.name,
                placar: `${m.goals_a} x ${m.goals_b}`,
                vencedor: teams.find(t => t.id === m.winner_id)?.name
            }))
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao simular campeonato', details: err.message });
    }
});





app.listen(3000);