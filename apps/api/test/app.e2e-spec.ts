import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Smoke Tests for ComplianceOS API
 * These tests verify the basic functionality of the application.
 *
 * Prerequisites:
 * - Database must be running and migrated
 * - Run: make docker-up && make db-migrate
 */
describe('ComplianceOS API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  }, 30000); // 30 second timeout for app initialization

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    it('/health (GET) - should return healthy status', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
        });
    });
  });

  describe('Authentication', () => {
    it('/api/auth/login (POST) - should reject invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'invalid@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('/api/auth/login (POST) - should accept valid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'Admin123!',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.user).toBeDefined();
          expect(res.body.user.email).toBe('admin@example.com');
        });
    });
  });

  describe('Protected Routes', () => {
    let accessToken: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'Admin123!',
        });
      accessToken = response.body.accessToken;
    });

    it('/api/obligations (GET) - should require authentication', () => {
      return request(app.getHttpServer())
        .get('/api/obligations')
        .expect(401);
    });

    it('/api/obligations (GET) - should return obligations with valid token', () => {
      return request(app.getHttpServer())
        .get('/api/obligations')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('/api/readiness/score (GET) - should return readiness score', () => {
      return request(app.getHttpServer())
        .get('/api/readiness/score')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('overallScore');
          expect(res.body).toHaveProperty('readinessLevel');
        });
    });

    it('/api/controls (GET) - should return controls list', () => {
      return request(app.getHttpServer())
        .get('/api/controls')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('/api/artifacts (GET) - should return artifacts list', () => {
      return request(app.getHttpServer())
        .get('/api/artifacts')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });
});
