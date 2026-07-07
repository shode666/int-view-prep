import { createApp } from './app';
import { createInMemoryTodoRepo } from './todoRepo';

const PORT = Number(process.env.PORT ?? 3000);

const app = createApp(createInMemoryTodoRepo());

app.listen(PORT, () => {
  console.log(`Solutions API listening on http://localhost:${PORT}`);
});
