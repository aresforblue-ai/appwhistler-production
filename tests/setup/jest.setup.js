process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '5432';
process.env.DB_NAME = process.env.DB_NAME || 'appwhistler_test';
process.env.DB_USER = process.env.DB_USER || 'postgres';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || 'http://localhost:3000';
process.env.HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY || 'test-hf-key';
process.env.GOOGLE_FACT_CHECK_API_KEY = process.env.GOOGLE_FACT_CHECK_API_KEY || '';
process.env.SENTRY_DSN = process.env.SENTRY_DSN || '';
process.env.SENTRY_TRACES_SAMPLE_RATE = process.env.SENTRY_TRACES_SAMPLE_RATE || '0';
process.env.INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID || '';
process.env.ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || '';

jest.spyOn(console, 'error').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});

afterAll(() => {
	console.error.mockRestore();
	console.warn.mockRestore();
});
