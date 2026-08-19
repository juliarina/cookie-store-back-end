import { describe, expect, it } from 'vitest';
import { parsePagination, buildPaginationMeta } from '../../src/utils/pagination.js';

describe('parsePagination', () => {
  it('returns defaults when no input', () => {
    expect(parsePagination()).toEqual({ page: 1, limit: 20, skip: 0 });
  });

  it('normalizes invalid values to defaults', () => {
    expect(parsePagination({ page: 0, limit: 0 })).toEqual({ page: 1, limit: 20, skip: 0 });
    expect(parsePagination({ page: -3, limit: 500 })).toEqual({ page: 1, limit: 20, skip: 0 });
    expect(parsePagination({ page: 2.5, limit: 10.7 })).toEqual({ page: 1, limit: 20, skip: 0 });
  });

  it('computes skip correctly', () => {
    expect(parsePagination({ page: 3, limit: 10 })).toEqual({ page: 3, limit: 10, skip: 20 });
  });

  it('respects maxLimit', () => {
    expect(parsePagination({ page: 1, limit: 50, maxLimit: 25 })).toEqual({
      page: 1,
      limit: 20,
      skip: 0,
    });
  });
});

describe('buildPaginationMeta', () => {
  it('reports hasNext true when there are more rows', () => {
    expect(buildPaginationMeta({ page: 1, limit: 20, total: 25 })).toEqual({
      page: 1,
      limit: 20,
      total: 25,
      hasNext: true,
    });
  });

  it('reports hasNext false at the end', () => {
    expect(buildPaginationMeta({ page: 2, limit: 20, total: 40 })).toEqual({
      page: 2,
      limit: 20,
      total: 40,
      hasNext: false,
    });
  });
});