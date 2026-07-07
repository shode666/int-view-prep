import express, { type Express } from 'express';
import type { TodoRepository } from './types/todo.types';
import { validateCreateTodo, validateUpdateTodo } from './validation';

export const createApp = (repo: TodoRepository): Express => {
  const app = express();
  app.use(express.json());

  app.get('/todos', async (_req, res) => {
    res.json(await repo.list());
  });

  app.post('/todos', async (req, res) => {
    const result = validateCreateTodo(req.body);
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(201).json(await repo.create(result.value));
  });

  app.get('/todos/:id', async (req, res) => {
    const todo = await repo.getById(req.params.id);
    if (!todo) {
      res.status(404).json({ error: 'Todo not found' });
      return;
    }
    res.json(todo);
  });

  app.patch('/todos/:id', async (req, res) => {
    const result = validateUpdateTodo(req.body);
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    const updated = await repo.update(req.params.id, result.value);
    if (!updated) {
      res.status(404).json({ error: 'Todo not found' });
      return;
    }
    res.json(updated);
  });

  app.delete('/todos/:id', async (req, res) => {
    const deleted = await repo.delete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Todo not found' });
      return;
    }
    res.status(204).end();
  });

  return app;
};
