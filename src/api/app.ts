import express, { type Express } from 'express';
import type { TodoRepository, UpdateTodoInput } from './types/todo.types';

/**
 * EXERCISE — Build a Todos REST API (the classic pair-programming task).
 *
 * Implement these routes against the injected repository:
 *
 *   GET    /todos          → 200, JSON array of all todos
 *   POST   /todos          → 201 with created todo
 *                            400 { error: string } if title is missing,
 *                            not a string, or empty/whitespace-only
 *   GET    /todos/:id      → 200 with todo, or 404 { error: string }
 *   PATCH  /todos/:id      → 200 with updated todo (title and/or completed),
 *                            400 on invalid body, 404 if not found
 *   DELETE /todos/:id      → 204 no body, or 404 { error: string }
 *
 * Talk through: validation strategy, status codes, error shape consistency,
 * why the repo is injected (testability, swap for a real DB later).
 */

export const createApp = (repo: TodoRepository): Express => {
  const app = express();
  app.use(express.json());

  app.get('/todos', async (_req, res) => {
    const list = await repo.list();

    res.json(list.map(({id, title})=>({id,title})))
  });

  app.post('/todos', async (req, res)=>{
    const {title} = req.body;

  if(typeof title !== 'string' || title.trim()===''){
    res.status(400).json({"error": "title is missing,not a string, or empty/whitespace-only"});
    return;
  }
  const todo = {title: title.trim()};
  const newTodo = await repo.create(todo)

  res.status(201).json(newTodo)

  });
  app.get('/todos/:id', async (req, res)=>{
    const id = req.params.id;

    const todo = await repo.getById(id)

    if( todo === null) {
      res.status(404).json({error: 'todo not found!'});
      return;
    }

    return res.json(todo)
  });

  app.patch('/todos/:id', async (req, res)=>{
    const id = req.params.id;
    const {title, completed} = req.body
    const todo = await repo.getById(id)
    if( todo === null) {
      res.status(404).json({error: 'todo not found!'});
      return;
    }
    const updates: UpdateTodoInput = {};
    if (title !== undefined) {                                    // มีส่งมาไหม (absent = ข้าม ไม่ผิด)
    if (typeof title !== 'string' || title.trim() === '') {   // มีแล้วต้องถูก
        res.status(400).json({ error: 'title must be a non-empty string' });
            return;
        }
        updates.title = title.trim();
    }

    if (completed !== undefined) {
        if (typeof completed !== 'boolean') {
            res.status(400).json({ error: 'completed must be a boolean' });
            return;
        }
        updates.completed = completed;
    }


    const updateTodo = await repo.update(id, updates);
    res.status(200).json(updateTodo);

  });
  app.delete('/todos/:id', async (req, res)=>{
    const id = req.params.id;

    const todo = await repo.getById(id)
    if( todo === null) {
      res.status(404).json({error: 'todo not found!'});
      return;
    }
    await repo.delete(id);

    res.status(204).end()

  });

  return app;
};
