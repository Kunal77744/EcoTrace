import { rateLimiter } from '../src/middlewares/rateLimiter';
import { Request, Response, NextFunction } from 'express';

describe('Rate Limiter Middleware Unit Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction = jest.fn();

  beforeEach(() => {
    mockRequest = {
      ip: '127.0.0.1',
      socket: {} as any,
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  it('should allow requests within limit and increment count', () => {
    // Call 1
    rateLimiter(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(nextFunction).toHaveBeenCalledTimes(1);
    expect(mockResponse.status).not.toHaveBeenCalled();

    // Call 2
    rateLimiter(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(nextFunction).toHaveBeenCalledTimes(2);
  });

  it('should reject requests with 429 when limit is exceeded', () => {
    (mockRequest as any).ip = '127.0.0.2'; // Use a fresh IP to avoid shared rate limit state from previous test
    // Make 60 requests (the limit)
    for (let i = 0; i < 60; i++) {
      rateLimiter(mockRequest as Request, mockResponse as Response, nextFunction);
    }
    expect(nextFunction).toHaveBeenCalledTimes(60);

    // 61st request should be blocked
    rateLimiter(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(mockResponse.status).toHaveBeenCalledWith(429);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('Too many requests'),
      })
    );
  });
});
