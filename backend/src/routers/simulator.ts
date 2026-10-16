import { Router } from 'express';

const router = Router();

// In-memory store for demo
const simulators: any = {
  default: {
    id: 'default',
    title: 'Career Starter',
    steps: [
      {
        id: 's1',
        text: 'Bạn bắt đầu công việc mới, gặp một tình huống A',
        choices: [
          { id: 'c1', text: 'Chọn kĩ thuật', nextStepId: 's2', xpDelta: 10, skillDeltas: { technical: 2 } },
          { id: 'c2', text: 'Chọn quản lý', nextStepId: 's3', xpDelta: 8, skillDeltas: { leadership: 2 } }
        ]
      },
      { id: 's2', text: 'Bạn đối mặt với bug khó', choices: [ { id: 'c3', text: 'Giải quyết kỹ thuật', nextStepId: null, xpDelta: 15, skillDeltas: { problemSolving: 3 } }, { id: 'c4', text: 'Gọi giúp đỡ', nextStepId: null, xpDelta: 5, skillDeltas: { communication: 2 } } ] },
      { id: 's3', text: 'Bạn phải xử lý xung đột trong team', choices: [ { id: 'c5', text: 'Mediation', nextStepId: null, xpDelta: 12, skillDeltas: { leadership: 3 } }, { id: 'c6', text: 'Ignore', nextStepId: null, xpDelta: 2, skillDeltas: { adaptability: 1 } } ] }
    ]
  }
};

const sessions: any = {};

router.get('/:id', (req, res) => {
  const id = req.params.id;
  const sim = simulators[id] || simulators['default'];
  res.json(sim);
});

router.post('/:id/sessions', (req, res) => {
  const id = req.params.id;
  const sessionId = `sess_${Date.now()}`;
  sessions[sessionId] = { id: sessionId, simulatorId: id, currentStepIndex: 0, choices: [], status: 'running' };
  res.status(201).json(sessions[sessionId]);
});

router.get('/:id/sessions/:sessionId', (req, res) => {
  const sessionId = req.params.sessionId;
  const s = sessions[sessionId];
  if (!s) return res.status(404).json({ message: 'session not found' });
  res.json(s);
});

router.patch('/:id/sessions/:sessionId', (req, res) => {
  const sessionId = req.params.sessionId;
  const { choice } = req.body;
  const s = sessions[sessionId];
  if (!s) return res.status(404).json({ message: 'session not found' });
  s.choices.push(choice);
  s.currentStepIndex += 1;
  res.json(s);
});

router.post('/:id/sessions/:sessionId/complete', (req, res) => {
  const sessionId = req.params.sessionId;
  const s = sessions[sessionId];
  if (!s) return res.status(404).json({ message: 'session not found' });
  // calculate skills
  const skills: any = {};
  for (const ch of s.choices) {
    for (const k of Object.keys(ch.skillDeltas || {})) {
      skills[k] = (skills[k] || 0) + ch.skillDeltas[k];
    }
  }
  const result = { sessionId, skills };
  s.status = 'completed';
  s.result = result;
  res.json(result);
});

export default router;
