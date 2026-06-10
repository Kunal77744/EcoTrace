import { connectDB } from '../src/config/db';
import mongoose from 'mongoose';

jest.mock('mongoose', () => {
  const mockConnection = {
    on: jest.fn(),
  };
  return {
    connect: jest.fn(),
    connection: mockConnection,
  };
});

describe('Database Connection Tests', () => {
  let mockExit: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined): never => {
      throw new Error(`process.exit called with ${code}`);
    });
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    mockExit.mockRestore();
    jest.restoreAllMocks();
  });

  it('should call mongoose.connect if MONGODB_URI is defined', async () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/testdb';
    (mongoose.connect as jest.Mock).mockResolvedValue(true);

    await connectDB();

    expect(mongoose.connect).toHaveBeenCalledWith('mongodb://localhost:27017/testdb');
    expect(mongoose.connection.on).toHaveBeenCalledWith('connected', expect.any(Function));
    expect(mongoose.connection.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(mongoose.connection.on).toHaveBeenCalledWith('disconnected', expect.any(Function));

    // Manually trigger callbacks to ensure 100% coverage
    const calls = (mongoose.connection.on as jest.Mock).mock.calls;
    
    const connectedCall = calls.find(c => c[0] === 'connected');
    if (connectedCall) connectedCall[1]();

    const errorCall = calls.find(c => c[0] === 'error');
    if (errorCall) errorCall[1](new Error('Test DB Error'));

    const disconnectedCall = calls.find(c => c[0] === 'disconnected');
    if (disconnectedCall) disconnectedCall[1]();
  });

  it('should call process.exit(1) if MONGODB_URI is missing', async () => {
    delete process.env.MONGODB_URI;

    await expect(connectDB()).rejects.toThrow('process.exit called with 1');
    expect(mongoose.connect).not.toHaveBeenCalled();
  });

  it('should call process.exit(1) if mongoose.connect throws an error', async () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/testdb';
    (mongoose.connect as jest.Mock).mockRejectedValue(new Error('Connection timed out'));

    await expect(connectDB()).rejects.toThrow('process.exit called with 1');
  });
});
