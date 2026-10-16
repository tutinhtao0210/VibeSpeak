'use strict';
// PinkEnglish – máy chủ HTTP + REST API + SQLite (node:sqlite, không cần cài thư viện ngoài)
// Node >= 22.5
const http = require('http'), fs = require('fs'), path = require('path');
const { DatabaseSync } = require('node:sqlite');

const dbFile = process.env.DB_FILE || path.join(__dirname, 'pinkenglish.db');
const db = new DatabaseSync(dbFile);

const Q = (s, ...a) => db.prepare(s).all(...a);
const G = (s, ...a) => db.prepare(s).get(...a);
const X = (s, ...a) => db.prepare(s).run(...a);
const tx = fn => {
  db.exec('BEGIN');
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
};

db.exec('PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS schema_migrations(name TEXT PRIMARY KEY)');

const mdir = path.join(__dirname, 'migrations');
if (fs.existsSync(mdir)) {
  for (const f of fs.readdirSync(mdir).filter(x => x.endsWith('.sql')).sort()) {
    if (!G('SELECT 1 x FROM schema_migrations WHERE name=?', f)) {
      db.exec(fs.readFileSync(path.join(mdir, f), 'utf8'));
      X('INSERT INTO schema_migrations(name) VALUES(?)', f);
    }
  }
} else {
  console.warn('migrations folder not found — skipping migrations');
}

// seed
const saveOptions = (qid, opts) => {
  X('DELETE FROM options WHERE question_id=?', qid);
  (opts || []).forEach((o, i) => {
    const text = o.text !== undefined ? o.text : (o.t !== undefined ? o.t : String(o));
    const correct = o.is_correct ? 1 : 0;
    X('INSERT INTO options(question_id,text,is_correct,sort_order) VALUES(?,?,?,?)', qid, text, correct, i);
  });
};

if (!G('SELECT 1 x FROM questions')) {
  const seedFile = path.join(__dirname, 'seed.json');
  if (fs.existsSync(seedFile)) {
    const d = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
    tx(() => {
      (d.words || []).forEach(w => {
        X('INSERT OR IGNORE INTO words(word,meaning,example,level) VALUES(?,?,?,?)', w.word, w.meaning, w.example, w.level);
      });
      (d.questions || []).forEach(q => {
        X('INSERT INTO questions(id,level,skill,topic,prompt,target,audio) VALUES(?,?,?,?,?,?,?)',
          q.id, q.level, q.skill, q.topic, q.prompt, q.target, q.audio || '');
        saveOptions(q.id, q.options || []);
      });
      (d.scenarios || []).forEach(s => {
        const r = X('INSERT INTO scenarios(icon,title,prompt,tip) VALUES(?,?,?,?)', s.icon, s.title, s.prompt, s.tip);
        (s.options || []).forEach(o => X('INSERT INTO scenario_options(scenario_id,text,is_best) VALUES(?,?,?)', r.lastInsertRowid, o.text || o, o.is_best ? 1 : 0));
      });
    });
  } else {
    console.warn('seed.json not found — skipping seed');
  }
}

/* ---- tiện ích ---- */
const fail = (code, msg) => Object.assign(new Error(msg), { code });
const need = (v, msg) => { if (v === undefined || v === null || v === '') throw fail(400, msg); return v; };
const uid = v => { const u = G('SELECT id FROM users WHERE id=?', Number(v)); if (!u) throw fail(404, 'Không tìm thấy người dùng'); return u.id; };
const upd = (t, id, b, cols) => {
  const k = cols.filter(c => b[c] !== undefined);
  if (k.length) X(`UPDATE ${t} SET ${k.map(c => c + '=?').join(',')} WHERE id=?`, ...k.map(c => b[c]), id);
};
const exists = (t, id) => {
  const r = G(`SELECT * FROM ${t} WHERE id=?`, id);
  if (!r) throw fail(404, 'Không tìm thấy bản ghi');
  return r;
};
const streak = (days, today) => {
  const s = new Set(days);
  let d = new Date(today + 'T00:00:00Z'), n = 0;
  if (!s.has(today)) d = new Date(d - 864e5);
  while (s.has(d.toISOString().slice(0, 10))) { n++; d = new Date(d - 864e5); }
  return n;
};
const SKILLS = ['listen', 'speak', 'read', 'write', 'grammar'];

/* ---- router ---- */
const R = [];
const route = (m, p, h) => R.push([m, new RegExp('^' + p.replace(/:(\\w+)/g, '(?<$1>[^/]+)') + '$'), h]);

route('GET', '/api/content', () => {
  const o = {};
  Q('SELECT question_id q,text,is_correct FROM options ORDER BY question_id,sort_order').forEach(r => {
    (o[r.q] = o[r.q] || []).push({ text: r.text, is_correct: r.is_correct });
  });
  return {
    words: Q('SELECT id,word en,meaning vi,example ex,level lv FROM words ORDER BY id'),
    questions: Q('SELECT id,level,skill,topic,prompt,target,audio FROM questions ORDER BY rowid').map(q => ({ ...q, options: o[q.id] || [] })),
    scenarios: Q('SELECT id,icon,title,prompt,tip FROM scenarios ORDER BY id').map(s => ({ ...s, options: Q('SELECT text,is_best FROM scenario_options WHERE scenario_id=? ORDER BY id', s.id) }))
  };
});

/* users */
route('POST', '/api/users', ({ body }) => {
  const r = X('INSERT INTO users(name) VALUES(?)', String(body.name || 'Bạn').slice(0, 40));
  return G('SELECT * FROM users WHERE id=?', Number(r.lastInsertRowid));
});
route('PATCH', '/api/users/:id', ({ params, body }) => {
  exists('users', params.id);
  upd('users', params.id, { name: body.name, accent: body.accent, base_level: body.base_level, place: body.place, daily_done: body.daily_done }, ['name', 'accent', 'base_level', 'place', 'daily_done']);
  return exists('users', params.id);
});
route('DELETE', '/api/users/:id', ({ params }) => { exists('users', params.id); X('DELETE FROM users WHERE id=?', params.id); return { ok: 1 }; });

route('GET', '/api/leaderboard', ({ query }) => {
  const today = query.today || new Date().toISOString().slice(0, 10);
  const rows = Q('SELECT id,name FROM users').map(u => {
    const d = Q('SELECT day,xp FROM study_days WHERE user_id=?', u.id);
    return { id: u.id, name: u.name, streak: streak(d.map(x => x.day), today), xp: d.reduce((a, x) => a + x.xp, 0) };
  });
  return { rows: rows.sort((a, b) => b.streak - a.streak || b.xp - a.xp).slice(0, 10) };
});

/* trạng thái học */
route('GET', '/api/state', ({ query }) => {
  const id = uid(query.user_id);
  const user = G('SELECT * FROM users WHERE id=?', id);
  const stat = {};
  for (const k of SKILLS) {
    const r = Q('SELECT score FROM answers WHERE user_id=? AND skill=? ORDER BY id DESC LIMIT 30', id, k);
    if (r.length) stat[k] = [r.reduce((a, x) => a + x.score, 0), r.length];
  }
  const days = Q('SELECT id,day,xp FROM study_days WHERE user_id=? ORDER BY day', id);
  const log = {}; days.forEach(d => log[d.day] = d.xp);
  const sn = {}; Q('SELECT tab,item FROM seen WHERE user_id=?', id).forEach(r => (sn[r.tab] = sn[r.tab] || []).push(r.item));
  const wrong = {}, tg = {};
  Q('SELECT w.question_id id,w.count c,q.topic t FROM wrong w JOIN questions q ON q.id=w.question_id WHERE w.user_id=?', id)
    .forEach(r => { wrong[r.id] = r.c; tg[r.t] = (tg[r.t] || 0) + r.c; });
  return { user, stat, days, log, xp: days.reduce((a, d) => a + d.xp, 0), sn, wrong, tg };
});

/* answers / attempts */
route('POST', '/api/answers', ({ body: b }) => {
  const u = uid(b.user_id);
  if (!SKILLS.includes(b.skill)) throw fail(400, 'Kỹ năng không hợp lệ');
  const r = X('INSERT INTO answers(user_id,attempt_id,question_id,skill,tab,score) VALUES(?,?,?,?,?,?)',
    u, b.attempt_id || null, b.question_id || null, b.skill, String(b.tab || ''), Math.min(1, Number(b.score) || 0));
  return { id: Number(r.lastInsertRowid) };
});
route('GET', '/api/attempts', ({ query }) => ({ rows: Q('SELECT * FROM attempts WHERE user_id=? ORDER BY id DESC LIMIT 50', uid(query.user_id)) }));
route('POST', '/api/attempts', ({ body: b }) => {
  const r = X('INSERT INTO attempts(user_id,tab,title,score,total) VALUES(?,?,?,?,?)',
    uid(b.user_id), String(b.tab || ''), String(b.title || 'Bài làm'), Number(b.score || 0), Number(b.total || 0));
  return { id: Number(r.lastInsertRowid) };
});
route('PUT', '/api/attempts/:id', ({ params, body }) => { exists('attempts', params.id); upd('attempts', params.id, body, ['title', 'score', 'total', 'note']); return exists('attempts', params.id); });
route('DELETE', '/api/attempts/:id', ({ params }) => { exists('attempts', params.id); X('DELETE FROM attempts WHERE id=?', params.id); return { ok: 1 }; });

route('GET', '/api/days', ({ query }) => ({ rows: Q('SELECT * FROM study_days WHERE user_id=? ORDER BY day DESC LIMIT 60', uid(query.user_id)) }));
route('POST', '/api/days', ({ body: b }) => {
  const u = uid(b.user_id);
  const day = need(b.day, 'Thiếu ngày');
  const xp = Number(b.xp || 0);
  X('INSERT INTO study_days(user_id,day,xp) VALUES(?,?,?) ON CONFLICT(user_id,day) DO UPDATE SET xp=xp+excluded.xp', u, day, xp);
  return { ok: 1 };
});
route('PUT', '/api/days/:id', ({ params, body }) => { exists('study_days', params.id); upd('study_days', params.id, body, ['xp', 'day']); return exists('study_days', params.id); });
route('DELETE', '/api/days/:id', ({ params }) => { exists('study_days', params.id); X('DELETE FROM study_days WHERE id=?', params.id); return { ok: 1 }; });

route('POST', '/api/seen', ({ body: b }) => {
  const u = uid(b.user_id), tab = need(b.tab, 'Thiếu tab');
  tx(() => {
    if (b.reset) X('DELETE FROM seen WHERE user_id=? AND tab=?', u, tab);
    (b.ids || []).forEach(i => X('INSERT OR IGNORE INTO seen(user_id,tab,item) VALUES(?,?,?)', u, tab, String(i)));
  });
  return { ok: 1 };
});
route('DELETE', '/api/seen', ({ query: q }) => { X('DELETE FROM seen WHERE user_id=? AND tab=? AND item=?', uid(q.user_id), q.tab, q.item); return { ok: 1 }; });
route('POST', '/api/wrong', ({ body: b }) => {
  exists('questions', b.question_id);
  X('INSERT INTO wrong(user_id,question_id) VALUES(?,?) ON CONFLICT(user_id,question_id) DO UPDATE SET count=count+1', uid(b.user_id), b.question_id);
  return { ok: 1 };
});
route('DELETE', '/api/wrong', ({ query: q }) => { X('DELETE FROM wrong WHERE user_id=? AND question_id=?', uid(q.user_id), q.question_id); return { ok: 1 }; });

route('GET', '/api/notes', ({ query }) => ({ rows: Q('SELECT * FROM notes WHERE user_id=? ORDER BY id DESC', uid(query.user_id)) }));
route('POST', '/api/notes', ({ body: b }) => {
  const u = uid(b.user_id), c = String(need(b.content, 'Thiếu nội dung')).slice(0, 500);
  const old = G('SELECT * FROM notes WHERE user_id=? AND content=?', u, c);
  if (old && b.dedupe) return old;
  const r = X('INSERT INTO notes(user_id,type,content) VALUES(?,?,?)', u, b.type || 'Từ vựng', c);
  return exists('notes', Number(r.lastInsertRowid));
});
route('PUT', '/api/notes/:id', ({ params, body }) => { exists('notes', params.id); upd('notes', params.id, body, ['type', 'content']); return exists('notes', params.id); });
route('DELETE', '/api/notes/:id', ({ params }) => { exists('notes', params.id); X('DELETE FROM notes WHERE id=?', params.id); return { ok: 1 }; });

route('GET', '/api/questions', ({ query }) => ({ rows: Q('SELECT id,level,skill,topic,prompt FROM questions WHERE prompt LIKE ? ORDER BY rowid DESC LIMIT 30', '%' + (query.search || '') + '%') }));
route('POST', '/api/questions', ({ body: b }) => {
  const o = b.options || [];
  if (o.length < 2 || o.filter(x => x.is_correct).length !== 1) throw fail(400, 'Cần ≥ 2 đáp án và đúng 1 đáp án đúng');
  const id = 'c' + Date.now().toString(36);
  tx(() => {
    X('INSERT INTO questions(id,level,skill,topic,prompt,target,audio) VALUES(?,?,?,?,?,?,?)',
      id, Number(need(b.level, 'Thiếu cấp độ')), need(b.skill, 'Thiếu kỹ năng'), b.topic || '', b.prompt || '', b.target || '', b.audio || '');
    saveOptions(id, o);
  });
  return { id };
});
route('PUT', '/api/questions/:id', ({ params, body: b }) => {
  const id = params.id; exists('questions', id);
  tx(() => {
    const k = ['level', 'skill', 'topic', 'prompt', 'target', 'audio'].filter(c => b[c] !== undefined);
    if (k.length) X(`UPDATE questions SET ${k.map(c => c + '=?').join(',')} WHERE id=?`, ...k.map(c => b[c]), id);
    if (b.options) saveOptions(id, b.options);
  });
  return exists('questions', id);
});
route('DELETE', '/api/questions/:id', ({ params }) => { exists('questions', params.id); X('DELETE FROM questions WHERE id=?', params.id); return { ok: 1 }; });

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const send = (code, body, type = 'application/json; charset=utf-8') => {
    res.writeHead(code, { 'Content-Type': type });
    if (type.startsWith('application/json')) res.end(JSON.stringify(body));
    else res.end(body);
  };

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    try {
      const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
      return send(200, html, 'text/html; charset=utf-8');
    } catch (e) {
      return send(500, { error: 'Không thể đọc index.html' });
    }
  }

  let raw = '';
  req.on('data', c => { raw += c; if (raw.length > 1e7) req.destroy(); });
  req.on('end', () => {
    for (const [m, re, h] of R) {
      const mt = req.method === m && url.pathname.match(re);
      if (!mt) continue;
      try {
        const body = raw ? JSON.parse(raw) : {};
        return send(200, h({ params: mt.groups || {}, query: Object.fromEntries(url.searchParams), body }));
      } catch (e) {
        const code = e.code >= 400 && e.code < 600 ? e.code : 400;
        return send(code, { error: String(e.message) });
      }
    }

    const staticRoot = path.join(__dirname, 'public');
    const fp = path.join(staticRoot, url.pathname.replace(/^\/+/, ''));
    if (fp.startsWith(staticRoot) && fs.existsSync(fp) && fs.statSync(fp).isFile()) {
      const ext = path.extname(fp).slice(1);
      const mime = ext === 'js' ? 'application/javascript' : ext === 'css' ? 'text/css' : 'application/octet-stream';
      return send(200, fs.readFileSync(fp), mime + '; charset=utf-8');
    }

    send(404, { error: 'Không tìm thấy' });
  });
}).listen(process.env.PORT || 3000, () => console.log('PinkEnglish chạy tại http://localhost:' + (process.env.PORT || 3000)));
