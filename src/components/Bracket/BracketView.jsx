// components/Bracket/BracketView.jsx
import BeyBracket from './BeyBracket';
import LBTree from './LBTree';
import BeyMatchBox from './BeyMatchBox';
import ZoomPane from '../shared/ZoomPane';

export default function BracketView({ tournament }) {
  if (!tournament) return null;
  const { type, matches, wbRounds, lbRounds, champion } = tournament;

  if (type === 'single') {
    return (
      <div className="bracket-view">
        <div className="bracket-section-label wb-label">🏹 單淘汰賽程</div>
        <BeyBracket tournament={tournament} />
      </div>
    );
  }

  if (type === 'double') {
    const gf1 = matches['gf_1'];
    const gf2 = matches['gf_2'];
    // Use BeyBracket for the winners bracket part
    const wbTournament = { ...tournament, type: 'single', rounds: wbRounds };
    return (
      <div className="bracket-view">
        <div className="bracket-section-label wb-label">🏆 主賽 (Winners Bracket)</div>
        <BeyBracket tournament={wbTournament} />

        <div className="bracket-section-label lb-label" style={{ marginTop: 24 }}>💀 敗部 (Losers Bracket)</div>
        <ZoomPane>
          <LBTree matches={matches} lbRounds={lbRounds} />
        </ZoomPane>

        <div className="bracket-section-label gf-label" style={{ marginTop: 24 }}>⚔️ 大決賽 (Grand Final)</div>
        <div className="bey-bracket-container">
          <div className="bey-bracket-scroll" style={{ display: 'flex', gap: 24, justifyContent: 'center', padding: '20px 24px' }}>
            {gf1 && (
              <div className="bey-gf-col">
                <div className="bey-round-label">大決賽</div>
                <BeyMatchBox match={gf1} />
              </div>
            )}
            {gf2 && !gf2.locked && (
              <div className="bey-gf-col">
                <div className="bey-round-label">重賽</div>
                <BeyMatchBox match={gf2} />
              </div>
            )}
          </div>
        </div>

        {champion && <ChampionBanner champion={champion} subtitle="雙敗淘汰冠軍" />}
      </div>
    );
  }

  return null;
}

function ChampionBanner({ champion, subtitle }) {
  return (
    <div className="bey-champion-display" style={{ margin: '20px auto', maxWidth: 300 }}>
      <div className="bey-champion-crown">👑</div>
      <div className="bey-champion-name">{champion.name}</div>
      <div style={{ fontSize: 12, color: '#888', fontWeight: 600 }}>{subtitle}</div>
    </div>
  );
}
