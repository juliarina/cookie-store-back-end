interface PaginationOptions {
  page?: number;
  limit?: number;
  maxLimit?: number;
}

interface PaginationResult {
  page: number;
  limit: number;
  skip: number;
}

export const parsePagination = ({
  page = 1,
  limit = 20,
  maxLimit = 100,
}: PaginationOptions = {}): PaginationResult => {
  const parsedPage = Number.isInteger(page) && page >= 1 ? page : 1;
  const parsedLimit = Number.isInteger(limit) && limit >= 1 && limit <= maxLimit ? limit : 20;
  return { page: parsedPage, limit: parsedLimit, skip: (parsedPage - 1) * parsedLimit };
};

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

export const buildPaginationMeta = ({ page, limit, total }: PaginationMeta) => ({
  page,
  limit,
  total,
  hasNext: page * limit < total,
});
