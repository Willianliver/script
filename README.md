# Meu Campeonato - Simulador de Torneio Eliminatório

Projeto desenvolvido para o **teste técnico back-end da Irroba**.

Implementação em **Node.js + Express + PostgreSQL**, com integração a um script Python para geração de placares (diferencial solicitado).

## Sobre o Projeto

O sistema simula um torneio eliminatório com **8 times**, começando nas quartas de final, seguindo as regras do enunciado:

- 4 jogos nas quartas → 2 nas semifinais → disputa de 3º lugar → final
- Perdedor eliminado
- Placar gerado via script Python (`teste.py`) – simulação de modelo externo de IA/ML
- Critérios de desempate em caso de empate no placar:
  1. Maior pontuação acumulada (gols marcados +1, gols sofridos -1)
  2. Time inscrito primeiro (menor `created_at`)
- Todos os resultados são persistidos no banco (tabelas `teams`, `championships`, `matches`)
- Possível recuperar campeonatos anteriores

## Tecnologias Utilizadas

- Node.js + Express (API REST)
- PostgreSQL (banco relacional)
- Python 3 (script `teste.py` para placar aleatório)
- Jest (testes unitários básicos)

## Critérios Atendidos

- Lógica completa do torneio eliminatório
- Limite exato de 8 times
- Conhecimento em Git (commits atômicos e mensagens descritivas)
- Boas práticas (middlewares, async/await, tratamento de erros, queries parametrizadas)
- Padrão REST (rotas claras, status HTTP corretos)
- Conhecimento em SQL (joins, agregações, COALESCE, índices sugeridos)
- Chamada ao script Python (diferencial implementado)
- Filtro dinâmico por fase na rota de resultados

**Diferenciais não implementados (devido ao tempo):**

- Testes de integração
- Containerização (Docker)
- Critério de desempate alternativo (ex: pênaltis)

## Como Executar o Projeto (passo a passo)

1. **Pré-requisitos**

   - Node.js ≥ 16
   - PostgreSQL instalado e rodando
   - Python 3 instalado (para o script de placar)
2. **Clone o repositório**

   ```bash
   git clone https://github.com/Willianliver/script.git
   ```


* **Instale as dependências**
  Bash

  ```
  npm install
  ```
* **Configure o banco de dados**
  Crie o banco meu_campeonato e rode o script SQL abaixo (ou use migrations):
  SQL

  ```
  CREATE TABLE teams (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE championships (
      id SERIAL PRIMARY KEY,
      championship_name VARCHAR(100) NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      winner_team_id INTEGER REFERENCES teams(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE matches (
      id SERIAL PRIMARY KEY,
      championship_id INTEGER REFERENCES championships(id),
      phase VARCHAR(50) NOT NULL,
      team_a_id INTEGER REFERENCES teams(id),
      team_b_id INTEGER REFERENCES teams(id),
      goals_a INTEGER,
      goals_b INTEGER,
      winner_id INTEGER REFERENCES teams(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  ```
* **Configure o arquivo .env** (opcional, mas recomendado)
  Crie .env na raiz:
  text

  ```
  DB_HOST=localhost
  DB_PORT=5432
  DB_NAME=meu_campeonato
  DB_USER=postgres
  DB_PASSWORD=sua_senha
  ```

  No arquivo de conexão (src/config/connection.js), use dotenv se quiser.
* **Coloque o script Python**
  Crie teste.py na raiz:
  Python

  ```
  import random
  print(random.randrange(0, 8))
  print(random.randrange(0, 8))
  ```
* **Inicie o servidor**
  Bash

  ```
  node index.js
  ```

  API disponível em: [http://localhost:3000](http://localhost:3000)

## Rotas Principais

| Método | Rota                        | Descrição                       | Body / Params                           | Exemplo de uso  |
| ------- | --------------------------- | --------------------------------- | --------------------------------------- | --------------- |
| POST    | /teams                      | Cadastra um time (máx. 8)        | { "name": "Time A" }                    | Cria time       |
| GET     | /teams                      | Lista todos os times              | -                                       | Ver lista       |
| POST    | /championship               | Cria um campeonato                | { "championship_name": "Torneio 2025" } | Cria campeonato |
| GET     | /championships              | Lista todos os campeonatos        | -                                       | Ver histórico  |
| POST    | /championships/:id/simulate | Simula o torneio completo         | :id = ID do campeonato                  | Simula jogo     |
| GET     | /resultados?phase=quartas   | Lista partidas filtradas por fase | ?phase=quartas (ou múltiplos)          | Filtra fases    |

    

## Testes Unitários

```
npm test
```


## Autor

Willian
Desenvolvido para teste técnico back-end Irroba – Fevereiro 2026
