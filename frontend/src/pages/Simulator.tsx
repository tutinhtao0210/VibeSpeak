import React, { useEffect, useState } from 'react';
import axios from 'axios';
import SimulatorStep from '../components/SimulatorStep';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000/api/simulators';

export default function Simulator() {
  const [sim, setSim] = useState<any>(null);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    axios.get(`${API}/default`).then((r) => setSim(r.data));
  }, []);

  const start = async () => {
    const r = await axios.post(`${API}/default/sessions`);
    setSession(r.data);
  };

  const choose = async (choice: any) => {
    if (!session) return;
    const r = await axios.patch(`${API}/default/sessions/${session.id}`, { choice });
    setSession(r.data);
  };

  if (!sim) return <div>Loading simulator...</div>;
  if (!session)
    return (
      <div>
        <p>{sim.title}</p>
        <button onClick={start}>Bắt đầu</button>
      </div>
    );

  const step = sim.steps[session.currentStepIndex];
  if (!step) return <div>Hoàn thành</div>;

  return <SimulatorStep step={step} onChoose={choose} />;
}
