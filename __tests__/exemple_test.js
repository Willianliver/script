// __tests__/getTeamPoints.test.js  (ou o nome que você usou)

jest.mock('../src/config/connection', () => ({
  query: jest.fn(),
}));

const pool = require('../src/config/connection');
const { getTeamPoints } = require('../index');  // ajuste o caminho se necessário

describe('getTeamPoints - Cálculo de pontuação acumulada', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('retorna 0 quando não há jogos (rows vazio)', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });  // ← já está ok, mas confirme

    const points = await getTeamPoints(5, 1);
    expect(points).toBe(0);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test('calcula corretamente: marcou 4, sofreu 1 → +3 pontos', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ points: '3' }]   // ← formato exato que a função espera
    });

    const points = await getTeamPoints(10, 2);
    expect(points).toBe(3);
  });

  test('usa COALESCE para retornar 0 em NULL', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ points: null }]  // ← formato correto
    });

    const points = await getTeamPoints(7, 3);
    expect(points).toBe(0);
  });

  test('chama a query com parâmetros corretos', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });  // ← adiciona mock vazio aqui!

    await getTeamPoints(42, 99);

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('team_a_id = $1'),
      [42, 99]
    );
  });
});