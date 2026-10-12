import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const DATA_FILE = path.join(__dirname, 'data.json');

type TaskStatus = 'to_do' | 'pending' | 'in_progress' | 'done';

interface AuditLog {
  id: string;
  taskId: string;
  actor: string;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  timestamp: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
}

interface Database {
  tasks: Task[];
  auditLogs: AuditLog[];
}


const STATUS_FLOW: TaskStatus[] = ['to_do', 'pending', 'in_progress', 'done'];

const loadData = (): Database => {
  if (!fs.existsSync(DATA_FILE)) {
    const initialData: Database = { tasks: [], auditLogs: [] };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  const data = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(data);
};

const saveData = (data: Database) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};


app.get('/tasks', (req: Request, res: Response) => {
  const db = loadData();
  res.json(db.tasks);
});


app.post('/tasks', (req: Request, res: Response) => {
  const { title, description, actor } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const db = loadData();
  const newTask: Task = {
    id: Date.now().toString(),
    title,
    description: description || '',
    status: 'to_do',
  };

  db.tasks.push(newTask);


  if (actor) {
    const newLog: AuditLog = {
      id: Date.now().toString() + Math.random(),
      taskId: newTask.id,
      actor,
      fromStatus: 'to_do',
      toStatus: 'to_do',
      timestamp: new Date().toISOString(),
    };
    db.auditLogs.push(newLog);
  }

  saveData(db);
  res.status(201).json(newTask);
});


app.put('/tasks/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status: newStatus, actor } = req.body as { status: TaskStatus; actor: string };

  if (!STATUS_FLOW.includes(newStatus)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  if (!actor) {
    return res.status(400).json({ error: 'Actor is required' });
  }

  const db = loadData();
  const task = db.tasks.find((t) => t.id === id);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }


  if (task.status === newStatus) {
    return res.json({ message: 'Status is already up to date (idempotent)', task });
  }


  const currentIndex = STATUS_FLOW.indexOf(task.status);
  const newIndex = STATUS_FLOW.indexOf(newStatus);


  if (newIndex === -1 || currentIndex === -1) {
    return res.status(400).json({ error: 'Invalid workflow transition' });
  }

  const oldStatus = task.status;
  task.status = newStatus;


  const auditLog: AuditLog = {
    id: Date.now().toString(),
    taskId: task.id,
    actor,
    fromStatus: oldStatus,
    toStatus: newStatus,
    timestamp: new Date().toISOString(),
  };

  db.auditLogs.push(auditLog);
  saveData(db);

  res.json({ message: 'Status updated successfully', task, auditLog });
});


app.delete('/tasks/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = loadData();
  
  const taskIndex = db.tasks.findIndex((t) => t.id === id);
  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  db.tasks.splice(taskIndex, 1);
  saveData(db);

  res.json({ message: 'Task deleted successfully' });
});


app.get('/tasks/:id/audit-logs', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = loadData();
  const logs = db.auditLogs.filter((log) => log.taskId === id);
  res.json(logs);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});