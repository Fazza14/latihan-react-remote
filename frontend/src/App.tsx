import React, { useEffect, useState } from 'react';

type TaskStatus = 'to_do' | 'pending' | 'in_progress' | 'done';

interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
}

interface AuditLog {
  id: string;
  taskId: string;
  actor: string;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  timestamp: string;
}

const PREDEFINED_USERS = ['john.doe', 'sarah.connor', 'alice.smith', 'bob.builder'];
const STATUS_FLOW: TaskStatus[] = ['to_do', 'pending', 'in_progress', 'done'];

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedActor, setSelectedActor] = useState(PREDEFINED_USERS[0]);

  const [activeLogsTask, setActiveLogsTask] = useState<Task | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  const fetchTasks = async () => {
    try {
      const res = await fetch('http://localhost:5000/tasks');
      const data = await res.json();
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    await fetch('http://localhost:5000/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, actor: selectedActor }),
    });

    setTitle('');
    setDescription('');
    fetchTasks();
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const res = await fetch(`http://localhost:5000/tasks/${taskId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, actor: selectedActor }),
    });

    if (!res.ok) {
      const err = await res.json();
      alert(`Failed to update: ${err.error}`);
    } else {
      fetchTasks();
      if (activeLogsTask && activeLogsTask.id === taskId) {
        openLogs(activeLogsTask);
      }
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    await fetch(`http://localhost:5000/tasks/${taskId}`, { method: 'DELETE' });
    fetchTasks();
  };

  const openLogs = async (task: Task) => {
    setActiveLogsTask(task);
    const res = await fetch(`http://localhost:5000/tasks/${task.id}/audit-logs`);
    const data = await res.json();
    setLogs(data);
  };

  return (
    <div className="container">
      <h2>Mini Task Manager</h2>

      <div style={{ marginBottom: '20px', padding: '15px', background: '#e9ecef', borderRadius: '6px' }}>
        <strong>Current Actor (User): </strong>
        <select value={selectedActor} onChange={(e) => setSelectedActor(e.target.value)}>
          {PREDEFINED_USERS.map((user) => (
            <option key={user} value={user}>{user}</option>
          ))}
        </select>
      </div>

      <form onSubmit={handleCreateTask} style={{ marginBottom: '20px' }}>
        <h3>Create New Task</h3>
        <input
          type="text"
          placeholder="Task Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button type="submit">Create Task</button>
      </form>

      <h3>Task List</h3>
      {tasks.length === 0 && <p>No tasks available.</p>}
      {tasks.map((task) => (
        <div key={task.id} className="task-card">
          <h4>{task.title}</h4>
          <p>{task.description}</p>
          <p><strong>Status:</strong> {task.status}</p>

          <div style={{ margin: '10px 0' }}>
            <span>Change Status to: </span>
            {STATUS_FLOW.map((st) => (
              <button
                key={st}
                onClick={() => handleStatusChange(task.id, st)}
                disabled={task.status === st}
                style={{ opacity: task.status === st ? 0.5 : 1 }}
              >
                {st}
              </button>
            ))}
          </div>

          <button onClick={() => openLogs(task)}>View Audit Logs</button>
          <button onClick={() => handleDeleteTask(task.id)} style={{ background: '#ff4d4d', color: 'white' }}>Delete</button>
        </div>
      ))}

      {activeLogsTask && (
        <div className="modal">
          <div className="modal-content">
            <h3>Audit Logs for: {activeLogsTask.title}</h3>
            {logs.length === 0 ? (
              <p>No audit logs found.</p>
            ) : (
              <ul>
                {logs.map((log) => (
                  <li key={log.id} style={{ marginBottom: '8px' }}>
                    User "{log.actor}" changed status from "{log.fromStatus}" to "{log.toStatus}" at {new Date(log.timestamp).toLocaleString()}
                  </li>
                ))}
              </ul>
            )}
            <button onClick={() => setActiveLogsTask(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}