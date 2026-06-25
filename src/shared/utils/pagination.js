const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export const getPagination = ({ page = 1, pageSize = DEFAULT_PAGE_SIZE } = {}) => {
  const normalizedPage = Math.max(Number(page) || 1, 1);
  const normalizedPageSize = Math.min(
    Math.max(Number(pageSize) || DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE,
  );

  return {
    page: normalizedPage,
    pageSize: normalizedPageSize,
    limit: normalizedPageSize,
    offset: (normalizedPage - 1) * normalizedPageSize,
  };
};

export const getPaginationMeta = ({ page, pageSize, count }) => ({
  page,
  pageSize,
  totalItems: count,
  totalPages: Math.ceil(count / pageSize),
});
