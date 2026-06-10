import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// Mocks must be declared before importing app to ensure correct hoisting
jest.mock('../src/models/User');
jest.mock('../src/models/Footprint');
jest.mock('../src/services/gemini.service', () => ({
  __esModule: true,
  analyzeCarbonFootprintText: jest.fn().mockResolvedValue({
    energyEmission: 5.4,
    transportEmission: 8.2,
    foodEmission: 3.5,
    suggestions: ['Conserve water and turn off lighting when leaving.'],
  }),
}));

const app = require('../src/app').default;
import { User } from '../src/models/User';
import { Footprint } from '../src/models/Footprint';

describe('Footprint API Integration Tests', () => {
  let mockToken: string;
  const mockUserId = '6523098f98d7f65f048d0df1';

  beforeAll(() => {
    const secret = process.env.JWT_SECRET || 'secret';
    mockToken = jwt.sign(
      { id: mockUserId, email: 'test@example.com', role: 'user' },
      secret,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/footprint/calculate', () => {
    it('should return 401 Unauthorized if the Authorization bearer token is missing', async () => {
      const response = await request(app)
        .post('/api/footprint/calculate')
        .send({ text: 'I rode electric scooters and consumed vegetables.' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No token provided');
    });

    it('should return 400 Bad Request if validation fails when input text is too short', async () => {
      const response = await request(app)
        .post('/api/footprint/calculate')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ text: 'ok' }); // Min required length is 3

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Input Validation Failed');
    });

    it('should return 201 Created and emit computed carbon metrics and tips when authentication and validation succeed', async () => {
      const mockSave = jest.fn().mockResolvedValue({
        _id: '6523098f98d7f65f048d0df2',
        userId: mockUserId,
        energyEmission: 5.4,
        transportEmission: 8.2,
        foodEmission: 3.5,
        totalEmission: 17.1,
        suggestions: ['Conserve water and turn off lighting when leaving.'],
      });

      // Stub Footprint model constructor instantiation
      (Footprint as unknown as jest.Mock).mockImplementation(() => ({
        save: mockSave,
        _id: '6523098f98d7f65f048d0df2',
        userId: mockUserId,
        energyEmission: 5.4,
        transportEmission: 8.2,
        foodEmission: 3.5,
        totalEmission: 17.1,
        suggestions: ['Conserve water and turn off lighting when leaving.'],
      }));

      // Stub User findByIdAndUpdate to record points addition
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({
        _id: mockUserId,
        totalPoints: 10,
      });

      const response = await request(app)
        .post('/api/footprint/calculate')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ text: 'I drove my gasoline car for 30 km and kept my house AC running.' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('successfully');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.energyEmission).toBeGreaterThanOrEqual(0);
      expect(response.body.data.transportEmission).toBeGreaterThanOrEqual(0);
      expect(response.body.data.foodEmission).toBeGreaterThanOrEqual(0);
      expect(response.body.data.totalEmission).toBeGreaterThanOrEqual(0);
      expect(response.body.data.suggestions).toBeInstanceOf(Array);
      expect(response.body.data.pointsAwarded).toBe(10);

      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUserId,
        { $inc: { totalPoints: 10 } }
      );
    });
  });

  describe('GET /api/footprint/history', () => {
    it('should return 401 Unauthorized if the Authorization bearer token is missing', async () => {
      const response = await request(app).get('/api/footprint/history');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 200 OK and list of historical logs for authenticated user', async () => {
      const mockLogs = [
        {
          _id: '6523098f98d7f65f048d0df3',
          userId: mockUserId,
          energyEmission: 2.1,
          transportEmission: 4.5,
          foodEmission: 0.8,
          totalEmission: 7.4,
          suggestions: [],
        },
      ];

      const mockLean = jest.fn().mockResolvedValue(mockLogs);
      const mockSort = jest.fn().mockReturnValue({ lean: mockLean });
      (Footprint.find as jest.Mock).mockReturnValue({ sort: mockSort });

      const response = await request(app)
        .get('/api/footprint/history')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data[0].totalEmission).toBe(7.4);
    });
  });

  describe('GET /api/footprint/challenges', () => {
    it('should return 401 Unauthorized if the Authorization bearer token is missing', async () => {
      const response = await request(app).get('/api/footprint/challenges');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 200 OK and list active challenges for authenticated user', async () => {
      const response = await request(app)
        .get('/api/footprint/challenges')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data[0]).toHaveProperty('title');
      expect(response.body.data[0]).toHaveProperty('pointsReward');
    });
  });
});
