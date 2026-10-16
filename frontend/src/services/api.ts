import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

export const getSimulator = (id = 'default') => axios.get(`${API}/simulators/${id}`);
export const createSession = (id = 'default') => axios.post(`${API}/simulators/${id}/sessions`);
export const patchSession = (id: string, sessionId: string, choice: any) => axios.patch(`${API}/simulators/${id}/sessions/${sessionId}`, { choice });
export const completeSession = (id: string, sessionId: string) => axios.post(`${API}/simulators/${id}/sessions/${sessionId}/complete`);
