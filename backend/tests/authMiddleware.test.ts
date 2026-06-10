import { auth, authorize } from '../src/middlewares/auth';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

describe('Auth Middleware Unit Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction = jest.fn();

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  describe('auth middleware', () => {
    it('should return 401 if authorization header is missing', () => {
      mockRequest.headers = {};
      auth(mockRequest as Request, mockResponse as Response, nextFunction);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 if token is invalid or signature mismatch', () => {
      mockRequest.headers = { authorization: 'Bearer invalidtoken' };
      auth(mockRequest as Request, mockResponse as Response, nextFunction);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should decorate request and call next if token is valid', () => {
      const payload = { id: 'user123', email: 'test@example.com', role: 'user' as const };
      const secret = process.env.JWT_SECRET || 'secret';
      const token = jwt.sign(payload, secret);

      mockRequest.headers = { authorization: `Bearer ${token}` };
      auth(mockRequest as Request, mockResponse as Response, nextFunction);
      expect(mockRequest.user).toMatchObject(payload);
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('authorize middleware', () => {
    it('should return 401 if user is missing on request', () => {
      const middleware = authorize(['admin']);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 403 if user role is not authorized', () => {
      mockRequest.user = { id: 'u1', email: 'u1@test.com', role: 'user' };
      const middleware = authorize(['admin']);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should call next if user role is authorized', () => {
      mockRequest.user = { id: 'u1', email: 'u1@test.com', role: 'admin' };
      const middleware = authorize(['admin']);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
    });
  });
});
