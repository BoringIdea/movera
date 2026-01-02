import { ApiResponse, PaginationInfo, PaginatedData } from '../interfaces';

export class ResponseUtil {
  /**
   * Create a successful response
   */
  static success<T>(data: T, message?: string): ApiResponse<T> {
    return {
      data,
      success: true,
      message,
    };
  }

  /**
   * Create a successful paginated response
   */
  static successPaginated<T>(
    items: T[],
    total: number,
    page: number,
    pageSize: number,
    message?: string,
  ): ApiResponse<T[]> {
    const totalPages = Math.ceil(total / pageSize);
    const hasMore = page < totalPages;

    const pagination: PaginationInfo = {
      total,
      page,
      pageSize,
      hasMore,
      totalPages,
    };

    return {
      data: items,
      success: true,
      message,
      pagination,
    };
  }

  /**
   * Create an error response
   */
  static error<T = null>(message: string, data: T = null as T): ApiResponse<T> {
    return {
      data,
      success: false,
      message,
    };
  }

  /**
   * Calculate pagination info
   */
  static calculatePagination(
    total: number,
    offset: number,
    limit: number,
  ): {
    page: number;
    pageSize: number;
    totalPages: number;
    hasMore: boolean;
  } {
    const page = Math.floor(offset / limit) + 1;
    const pageSize = limit;
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    return {
      page,
      pageSize,
      totalPages,
      hasMore,
    };
  }
}
