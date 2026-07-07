import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '@src/api/app';
import { createInMemoryTodoRepo } from '@src/api/todoRepo';

describe('Todos API', () => {
  let app: Express;

  beforeEach(() => {
    app = createApp(createInMemoryTodoRepo());
  });

  describe('POST /todos', () => {
    it('creates a todo and returns 201', async () => {
      const res = await request(app).post('/todos').send({ title: 'Buy milk' });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ title: 'Buy milk', completed: false });
      expect(typeof res.body.id).toBe('string');
      expect(typeof res.body.createdAt).toBe('string');
    });

    it('returns 400 when title is missing', async () => {
      const res = await request(app).post('/todos').send({});
      expect(res.status).toBe(400);
      expect(typeof res.body.error).toBe('string');
    });

    it('returns 400 when title is not a string', async () => {
      const res = await request(app).post('/todos').send({ title: 42 });
      expect(res.status).toBe(400);
    });

    it('returns 400 when title is whitespace-only', async () => {
      const res = await request(app).post('/todos').send({ title: '   ' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /todos', () => {
    it('returns an empty array initially', async () => {
      const res = await request(app).get('/todos');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns created todos', async () => {
      await request(app).post('/todos').send({ title: 'One' });
      await request(app).post('/todos').send({ title: 'Two' });
      const res = await request(app).get('/todos');
      expect(res.body).toHaveLength(2);
    });
  });

  describe('GET /todos/:id', () => {
    it('returns the todo when it exists', async () => {
      const created = await request(app).post('/todos').send({ title: 'Find me' });
      const res = await request(app).get(`/todos/${created.body.id}`);
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Find me');
    });

    it('returns 404 for an unknown id', async () => {
      const res = await request(app).get('/todos/does-not-exist');
      expect(res.status).toBe(404);
      expect(typeof res.body.error).toBe('string');
    });
  });

  describe('PATCH /todos/:id', () => {
    it('updates completed', async () => {
      const created = await request(app).post('/todos').send({ title: 'Task' });
      const res = await request(app)
        .patch(`/todos/${created.body.id}`)
        .send({ completed: true });
      expect(res.status).toBe(200);
      expect(res.body.completed).toBe(true);
    });

    it('updates title', async () => {
      const created = await request(app).post('/todos').send({ title: 'Old' });
      const res = await request(app)
        .patch(`/todos/${created.body.id}`)
        .send({ title: 'New' });
      expect(res.body.title).toBe('New');
    });

    it('returns 400 on invalid body', async () => {
      const created = await request(app).post('/todos').send({ title: 'Task' });
      const res = await request(app)
        .patch(`/todos/${created.body.id}`)
        .send({ completed: 'yes' });
      expect(res.status).toBe(400);
    });

    it('returns 404 for an unknown id', async () => {
      const res = await request(app).patch('/todos/nope').send({ completed: true });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /todos/:id', () => {
    it('deletes and returns 204', async () => {
      const created = await request(app).post('/todos').send({ title: 'Bye' });
      const res = await request(app).delete(`/todos/${created.body.id}`);
      expect(res.status).toBe(204);
      const after = await request(app).get(`/todos/${created.body.id}`);
      expect(after.status).toBe(404);
    });

    it('returns 404 for an unknown id', async () => {
      const res = await request(app).delete('/todos/nope');
      expect(res.status).toBe(404);
    });
  });
});
