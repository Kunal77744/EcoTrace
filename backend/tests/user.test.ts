import { User } from '../src/models/User';
import mongoose from 'mongoose';

describe('User Model Schema Hook and Methods', () => {
  beforeAll(async () => {
    // Disable command buffering so mongoose fails immediately instead of hanging
    mongoose.set('bufferCommands', false);
    try {
      await mongoose.connect('mongodb://127.0.0.1:27017/test-nonexistent', {
        serverSelectionTimeoutMS: 100,
      });
    } catch (err) {
      // Expected connection failure
    }
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('should hash the password before saving and correctly compare passwords', async () => {
    const user = new User({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'mypassword123',
    });

    // Verify it is plain text before save
    expect(user.password).toBe('mypassword123');

    // Attempt save (will run pre-save hook and then fail due to no database connection)
    try {
      await user.save();
    } catch (error) {
      // Catch connection/buffering error, which is expected
    }

    // The password should be hashed now
    expect(user.password).not.toBe('mypassword123');
    expect(user.password?.startsWith('$2a$') || user.password?.startsWith('$2b$')).toBe(true);

    // Test comparePassword method
    const isMatch = await user.comparePassword('mypassword123');
    expect(isMatch).toBe(true);

    const isNotMatch = await user.comparePassword('wrongpassword');
    expect(isNotMatch).toBe(false);
  });
});
