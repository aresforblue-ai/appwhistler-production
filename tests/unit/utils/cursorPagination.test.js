const { encodeCursor, decodeCursor, isValidCursor } = require('../../../src/backend/utils/cursor');
const { executePaginationQuery } = require('../../../src/backend/utils/pagination');

describe('cursor utilities', () => {
  test('encodeCursor and decodeCursor round-trip values with timestamp', () => {
    const record = { id: 'abc', created_at: '2024-01-01T00:00:00.000Z' };
    const cursor = encodeCursor(record);
    const decoded = decodeCursor(cursor);
    expect(decoded.id).toBe('abc');
    expect(decoded.createdAt.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    expect(isValidCursor(cursor)).toBe(true);
  });

  test('encodeCursor handles records without timestamp', () => {
    const cursor = encodeCursor({ id: '123' });
    const decoded = decodeCursor(cursor);
    expect(decoded.createdAt).toBeNull();
    expect(decoded.id).toBe('123');
  });

  test('decodeCursor rejects malformed values', () => {
    expect(() => decodeCursor('@@bad@@')).toThrow('Invalid cursor format');
    expect(isValidCursor('@@bad@@')).toBe(false);
  });
});

describe('executePaginationQuery', () => {
  test('returns sliced rows with page info', async () => {
    const rows = [
      { id: '1', created_at: new Date('2024-01-01T00:00:00Z') },
      { id: '2', created_at: new Date('2024-01-02T00:00:00Z') },
      { id: '3', created_at: new Date('2024-01-03T00:00:00Z') }
    ];

    const pool = {
      query: jest.fn().mockResolvedValue({ rows })
    };

    const result = await executePaginationQuery({
      pool,
      baseQuery: 'SELECT * FROM apps WHERE is_verified = true',
      baseParams: [],
      first: 2,
      orderField: 'created_at'
    });

    expect(pool.query).toHaveBeenCalled();
    expect(result.rows).toHaveLength(2);
    expect(result.hasNextPage).toBe(true);
    expect(result.startCursor).toEqual(rows[0]);
    expect(result.endCursor).toEqual(rows[1]);
  });

  test('throws when both first and last are provided', async () => {
    await expect(
      executePaginationQuery({
        pool: { query: jest.fn() },
        baseQuery: 'SELECT 1',
        baseParams: [],
        first: 1,
        last: 1
      })
    ).rejects.toThrow('Cannot use both `first` and `last` parameters');
  });
});
