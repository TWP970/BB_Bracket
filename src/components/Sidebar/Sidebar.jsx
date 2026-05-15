// components/Sidebar/Sidebar.jsx
import { useState } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { createPlayer } from '../../lib/utils';

const FORMATS = [
  { id: 'single',     icon: '🏹', label: '單淘汰',  desc: 'Single Elimination' },
  { id: 'double',     icon: '⚔️',  label: '雙敗淘汰', desc: 'Double Elimination' },
  { id: 'roundrobin', icon: '🔄', label: '循環賽',  desc: 'Round Robin' },
  { id: 'swiss',      icon: '🇨🇭', label: '瑞士制',  desc: 'Swiss System' },
  { id: 'multistage', icon: '🏟️', label: '多階段',  desc: 'Multi-Stage' },
];

const PLAYER_COUNTS = [2, 4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256, 512, 1000];


export default function Sidebar() {
  const { state, dispatch, generate, reset } = useTournament();
  const { format, config, players } = state;
  const [rawText, setRawText] = useState('');
  const [playerCount, setPlayerCount] = useState(8);

  const setFormat = (f) => dispatch({ type: 'SET_FORMAT', payload: f });
  const setConfig = (obj) => dispatch({ type: 'SET_CONFIG', payload: obj });

  const handlePlayerCountChange = (n) => {
    setPlayerCount(n);
    const lines = rawText.split('\n').filter(l => l.trim());
    const newLines = [...lines];
    while (newLines.length < n) newLines.push(`選手 ${newLines.length + 1}`);
    setRawText(newLines.slice(0, n).join('\n'));
  };

  const parsePlayers = () => {
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    const ps = lines.map((line, idx) => {
      const m = line.match(/^(.+?)\s*\[(\d+)\]\s*$/);
      return m ? createPlayer(idx, m[1], parseInt(m[2])) : createPlayer(idx, line);
    });
    const seeds = ps.map(p => p.seed).filter(s => s != null);
    if (seeds.length !== new Set(seeds).size) {
      dispatch({ type: 'SHOW_TOAST', payload: { msg: '⚠️ 種子編號重複，請修正！', kind: 'warning' } });
      return;
    }
    dispatch({ type: 'SET_PLAYERS', payload: ps });
    dispatch({ type: 'SHOW_TOAST', payload: { msg: `✅ 已載入 ${ps.length} 位選手`, kind: 'success' } });
  };

  const handleGenerate = () => {
    // Parse players inline and dispatch + generate in one shot
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      dispatch({ type: 'SHOW_TOAST', payload: { msg: '⚠️ 請至少輸入 2 位選手', kind: 'warning' } });
      return;
    }
    const ps = lines.map((line, idx) => {
      const m = line.match(/^(.+?)\s*\[(\d+)\]\s*$/);
      return m ? createPlayer(idx, m[1], parseInt(m[2])) : createPlayer(idx, line);
    });
    const seeds = ps.map(p => p.seed).filter(s => s != null);
    if (seeds.length !== new Set(seeds).size) {
      dispatch({ type: 'SHOW_TOAST', payload: { msg: '⚠️ 種子編號重複，請修正！', kind: 'warning' } });
      return;
    }
    dispatch({ type: 'SET_PLAYERS', payload: ps });
    generate(ps);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-inner">
        {/* Format Selection */}
        <section className="sidebar-section">
          <h3 className="sidebar-section-title">🏆 賽制選擇</h3>
          <div className="format-grid">
            {FORMATS.map(f => (
              <button
                key={f.id}
                className={`format-btn ${format === f.id ? 'active' : ''}`}
                onClick={() => setFormat(f.id)}
              >
                <span className="format-icon">{f.icon}</span>
                <span className="format-label">{f.label}</span>
                <span className="format-desc">{f.desc}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Player Count */}
        <section className="sidebar-section">
          <h3 className="sidebar-section-title">👥 人數設定</h3>
          <div className="count-selector">
            {PLAYER_COUNTS.map(n => (
              <button
                key={n}
                className={`count-btn ${playerCount === n ? 'active' : ''}`}
                onClick={() => handlePlayerCountChange(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </section>

        {/* Player Names */}
        <section className="sidebar-section">
          <h3 className="sidebar-section-title">
            📝 選手名單
            <span className="hint-text">格式：名字 [種子編號]</span>
          </h3>
          <textarea
            className="player-textarea"
            rows={8}
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder={'選手 1\n選手 2 [1]\n選手 3 [2]\n...'}
          />
          <button className="btn-secondary" onClick={parsePlayers}>解析選手</button>
          {players.length > 0 && (
            <div className="player-chips">
              {players.map((p, i) => (
                <div key={p.id} className="player-chip">
                  <span className="chip-num">{i + 1}</span>
                  <span className="chip-name">{p.name}</span>
                  {p.seed && <span className="seed-badge sm">{p.seed}</span>}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Format-specific Options */}
        {format === 'roundrobin' && (
          <section className="sidebar-section">
            <h3 className="sidebar-section-title">⚙️ 循環賽設定</h3>
            <label className="sidebar-label">分組數量
              <input type="number" min="1" max="16" className="sidebar-input"
                value={config.rrNumGroups} onChange={e => setConfig({ rrNumGroups: parseInt(e.target.value) || 1 })} />
            </label>
          </section>
        )}

        {format === 'swiss' && (
          <section className="sidebar-section">
            <h3 className="sidebar-section-title">⚙️ 瑞士制設定</h3>
            <label className="sidebar-label">輪數（留空=自動）
              <input type="number" min="1" max="20" className="sidebar-input"
                placeholder="自動"
                value={config.swissRounds || ''}
                onChange={e => setConfig({ swissRounds: e.target.value ? parseInt(e.target.value) : null })} />
            </label>
          </section>
        )}

        {format === 'multistage' && (
          <section className="sidebar-section">
            <h3 className="sidebar-section-title">⚙️ 多階段設定</h3>
            <label className="sidebar-label">分組數
              <input type="number" min="2" max="32" className="sidebar-input"
                value={config.numGroups} onChange={e => setConfig({ numGroups: parseInt(e.target.value) || 2 })} />
            </label>
            <label className="sidebar-label">分組賽制
              <select className="sidebar-select" value={config.groupFormat}
                onChange={e => setConfig({ groupFormat: e.target.value })}>
                <option value="roundrobin">循環賽</option>
                <option value="swiss">瑞士制</option>
              </select>
            </label>
            {config.groupFormat === 'swiss' && (
              <label className="sidebar-label">分組瑞士輪數
                <input type="number" min="1" max="15" className="sidebar-input"
                  placeholder="自動"
                  value={config.swissRounds || ''}
                  onChange={e => setConfig({ swissRounds: e.target.value ? parseInt(e.target.value) : null })} />
              </label>
            )}
            <label className="sidebar-label">每組晉級人數
              <input type="number" min="1" max="32" className="sidebar-input"
                value={config.advancePerGroup}
                onChange={e => setConfig({ advancePerGroup: parseInt(e.target.value) || 1 })} />
            </label>
            <div className="ms-preview-text">
              → 共 {config.numGroups * config.advancePerGroup} 人進入決賽圈
            </div>
            <label className="sidebar-label">決賽制
              <select className="sidebar-select" value={config.knockoutFormat}
                onChange={e => setConfig({ knockoutFormat: e.target.value })}>
                <option value="single">單淘汰</option>
                <option value="double">雙敗淘汰</option>
              </select>
            </label>
          </section>
        )}

        {/* Actions */}
        <section className="sidebar-section action-section">
          <button className="btn-primary btn-generate" onClick={handleGenerate}>
            ⚡ 產生賽程
          </button>
          <button className="btn-danger btn-reset" onClick={reset}>
            🗑️ 重設
          </button>
        </section>
      </div>
    </aside>
  );
}
