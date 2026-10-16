import React from 'react';

export default function SimulatorStep({ step, onChoose }: any) {
  return (
    <div style={{ border: '1px solid #ddd', padding: 16, borderRadius: 8 }}>
      <p>{step.text}</p>
      <div style={{ display: 'flex', gap: 8 }}>
        {step.choices.map((c: any) => (
          <button key={c.id} onClick={() => onChoose(c)}>
            {c.text}
          </button>
        ))}
      </div>
    </div>
  );
}
