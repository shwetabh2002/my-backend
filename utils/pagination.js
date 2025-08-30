const getPaginationOptions = (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const skip = (page - 1) * limit;
  
  return {
    page,
    limit,
    skip,
    sort: query.sort || { createdAt: -1 }
  };
};

const createPaginationResponse = (data, total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  
  return {
    data,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: total,
      itemsPerPage: limit,
      hasNextPage,
      hasPrevPage,
      nextPage: hasNextPage ? page + 1 : null,
      prevPage: hasPrevPage ? page - 1 : null
    }
  };
};

const validatePaginationParams = (query) => {
  const errors = [];
  
  if (query.page && (isNaN(query.page) || parseInt(query.page) < 1)) {
    errors.push('Page must be a positive integer');
  }
  
  if (query.limit && (isNaN(query.limit) || parseInt(query.limit) < 1 || parseInt(query.limit) > 100)) {
    errors.push('Limit must be between 1 and 100');
  }
  
  return errors;
};

module.exports = {
  getPaginationOptions,
  createPaginationResponse,
  validatePaginationParams
};
