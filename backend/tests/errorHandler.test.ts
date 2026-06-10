import { errorHandler } from '../src/middlewares/errorHandler';
import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodIssue } from 'zod';
import mongoose from 'mongoose';

describe('Error Handler Middleware Unit Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should format Zod schema validation errors', () => {
    const issues: ZodIssue[] = [
      {
        code: 'too_small',
        minimum: 3,
        type: 'string',
        inclusive: true,
        exact: false,
        message: 'Must be 3 chars',
        path: ['body', 'name'],
      },
    ];
    const zodError = new ZodError(issues);

    errorHandler(zodError, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Input Validation Failed',
      })
    );
  });

  it('should format Mongoose ValidationError', () => {
    const validationError = new mongoose.Error.ValidationError();
    validationError.addError('email', new mongoose.Error.ValidatorError({
      message: 'Email path required',
      path: 'email',
      type: 'required',
    }));

    errorHandler(validationError, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Database Validation Failed',
      })
    );
  });

  it('should format Mongoose CastError', () => {
    const castError = new mongoose.Error.CastError('ObjectId', 'invalid-id', 'userId');

    errorHandler(castError, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Invalid identifier value: 'invalid-id' for field 'userId'",
      })
    );
  });

  it('should format MongoDB duplicate key error (code 11000)', () => {
    const mongoError = {
      code: 11000,
      keyValue: { email: 'test@example.com' },
    };

    errorHandler(mongoError, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(409);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Conflict: A record with this 'email' already exists.",
      })
    );
  });

  it('should format generic errors with statusCode or fallback to 500', () => {
    const genericError = new Error('Custom DB Fail');
    (genericError as any).statusCode = 502;

    errorHandler(genericError, mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(502);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Custom DB Fail',
      })
    );
  });
});
