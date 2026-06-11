import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

// Mock User model
jest.mock('../src/models/User');

const app = require('../src/app').default;
import { User } from '../src/models/User';

describe('Auth API Integration Tests', () => {
  afterAll(async () => {
    await mongoose.disconnect();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper to mock chainable Mongoose queries (like .select)
  const mockQuery = (resolvedValue: any) => {
    const promise = Promise.resolve(resolvedValue);
    (promise as any).select = jest.fn().mockReturnValue(promise);
    return promise;
  };

  describe('POST /api/auth/register', () => {
    it('should successfully register a new user and return a token', async () => {
      const mockUserData = {
        _id: '6523098f98d7f65f048d0df1',
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'user',
        totalPoints: 0,
      };

      // Mock User.findOne to return null (user doesn't exist)
      (User.findOne as jest.Mock).mockReturnValue(mockQuery(null));

      // Mock user constructor and save
      const mockSave = jest.fn().mockResolvedValue(mockUserData);
      (User as unknown as jest.Mock).mockImplementation(() => ({
        save: mockSave,
        ...mockUserData,
      }));

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.name).toBe('Jane Doe');
    });

    it('should return 400 Bad Request if email validation fails', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Jane Doe',
          email: 'not-an-email',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Input Validation Failed');
    });

    it('should return 400 Bad Request if user email already exists', async () => {
      const mockUserData = {
        _id: '6523098f98d7f65f048d0df1',
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'user',
        totalPoints: 0,
      };

      // Mock User.findOne to return existing user
      (User.findOne as jest.Mock).mockReturnValue(mockQuery(mockUserData));

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should return 401 Unauthorized for invalid login credentials', async () => {
      // Mock User.findOne to return null (user not found)
      (User.findOne as jest.Mock).mockReturnValue(mockQuery(null));

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should successfully log in an existing user and return a token', async () => {
      const mockUserData = {
        _id: '6523098f98d7f65f048d0df1',
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'user',
        totalPoints: 10,
        comparePassword: jest.fn().mockResolvedValue(true),
      };

      // Mock User.findOne to return the mock user object
      (User.findOne as jest.Mock).mockReturnValue(mockQuery(mockUserData));

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'jane@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.name).toBe('Jane Doe');
      expect(response.body.user.totalPoints).toBe(10);
    });

    it('should return 400 Bad Request if email or password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: '',
          password: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 Unauthorized if password comparison fails', async () => {
      const mockUserData = {
        _id: '6523098f98d7f65f048d0df1',
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'user',
        totalPoints: 10,
        comparePassword: jest.fn().mockResolvedValue(false),
      };

      (User.findOne as jest.Mock).mockReturnValue(mockQuery(mockUserData));

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'jane@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return 401 Unauthorized if token is missing', async () => {
      const response = await request(app).get('/api/auth/me');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 200 OK and current user details if token is valid', async () => {
      const secret = process.env.JWT_SECRET || 'secret';
      const mockUserId = '6523098f98d7f65f048d0df1';
      const mockToken = jwt.sign(
        { id: mockUserId, email: 'jane@example.com', role: 'user' },
        secret,
        { expiresIn: '1h' }
      );

      const mockUserData = {
        _id: mockUserId,
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'user',
        totalPoints: 10,
        completedChallenges: ['1'],
      };

      (User.findById as jest.Mock).mockResolvedValue(mockUserData);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.name).toBe('Jane Doe');
      expect(response.body.user.completedChallenges).toContain('1');
    });
  });

  describe('GET /api/auth/leaderboard', () => {
    it('should return 401 Unauthorized if token is missing', async () => {
      const response = await request(app).get('/api/auth/leaderboard');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 200 OK and leaderboard data if token is valid', async () => {
      const secret = process.env.JWT_SECRET || 'secret';
      const mockUserId = '6523098f98d7f65f048d0df1';
      const mockToken = jwt.sign(
        { id: mockUserId, email: 'jane@example.com', role: 'user' },
        secret,
        { expiresIn: '1h' }
      );

      const mockLeaderboard = [
        { name: 'Jane Doe', totalPoints: 100 },
        { name: 'Bob Smith', totalPoints: 80 },
      ];

      const mockLean = jest.fn().mockResolvedValue(mockLeaderboard);
      const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
      const mockSort = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSelect = jest.fn().mockReturnValue({ sort: mockSort });
      (User.find as jest.Mock).mockReturnValue({ select: mockSelect });

      const response = await request(app)
        .get('/api/auth/leaderboard')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data[0].name).toBe('Jane Doe');
      expect(response.body.data[0].totalPoints).toBe(100);
    });
  });
});
