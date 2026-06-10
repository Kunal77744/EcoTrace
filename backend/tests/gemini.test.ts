import { GoogleGenAI } from '@google/genai';

// Mock the GoogleGenAI library
jest.mock('@google/genai', () => {
  const mockGenerateContent = jest.fn();
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      models: {
        generateContent: mockGenerateContent,
      },
    })),
  };
});

describe('Gemini Service Tests', () => {
  let mockGenerateContent: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    // Get the mocked generateContent function from a mock instance
    const clientInstance = new GoogleGenAI({ apiKey: 'key' }) as any;
    mockGenerateContent = clientInstance.models.generateContent as jest.Mock;
  });

  it('should use fallback mock mode when GEMINI_API_KEY is not defined', async () => {
    jest.isolateModules(async () => {
      const originalKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;
      const { analyzeCarbonFootprintText } = require('../src/services/gemini.service');
      
      const result = await analyzeCarbonFootprintText('I drove my car and turned on AC.');
      expect(result.transportEmission).toBe(15.6);
      expect(result.energyEmission).toBe(10.0);
      expect(result.foodEmission).toBe(0); // not mentioned
      
      process.env.GEMINI_API_KEY = originalKey;
    });
  });

  it('should call Gemini API when client is initialized and return parsed structured response', async () => {
    jest.isolateModules(async () => {
      process.env.GEMINI_API_KEY = 'mock-key';
      const { analyzeCarbonFootprintText } = require('../src/services/gemini.service');
      
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({
          energyEmission: 4.2,
          transportEmission: 0,
          foodEmission: 1.5,
          suggestions: ['Eat organic', 'Turn off lights'],
        }),
      });

      const result = await analyzeCarbonFootprintText('I ate steak and kept the AC running.');
      expect(result.energyEmission).toBe(4.2);
      expect(result.transportEmission).toBe(0);
      expect(result.foodEmission).toBe(1.5);
      expect(result.suggestions).toContain('Eat organic');
    });
  });

  it('should handle API exceptions gracefully by using the fallback mock generator', async () => {
    jest.isolateModules(async () => {
      process.env.GEMINI_API_KEY = 'mock-key';
      const { analyzeCarbonFootprintText } = require('../src/services/gemini.service');
      
      mockGenerateContent.mockRejectedValue(new Error('API quota exceeded'));

      const result = await analyzeCarbonFootprintText('I eat steak and kept the AC running.');
      // Should fallback to mock values
      expect(result.energyEmission).toBe(10.0);
      expect(result.foodEmission).toBe(6.2);
    });
  });
});
