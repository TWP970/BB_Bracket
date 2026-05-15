// components/Bracket/BracketView.jsx
import TreeBracket from './TreeBracket';
import LBTree from './LBTree';
import MatchCard from '../shared/MatchCard';

export default function BracketView({ tournament }) {
  if (!tournament) return null;
  const { type, matches, rounds, wbRounds, lbRounds, champion } = tournament;

  if (type === 'single') {
    return (
      <div className="bracket-view">
        <div className="bracket-section-label wb-label">🏹 單淘汰賽程</div>
        <TreeBracket matches={matches} rounds={rounds} bracketType="winners" champion={champion} />
        {champion && <ChampionBanner champion={champion} subtitle="單淘汰冠軍" />}
      </div>
    );
  }

  if (type === 'double') {
    const gf1 = matches['gf_1'];
    const gf2 = matches['gf_2'];
    return (
      <div className="bracket-view">
        <div className="de-section-label wb-label">🏆 主賽 (Winners Bracket)</div>
        <TreeBracket matches={matches} rounds={wbRounds} bracketType="winners" />

        <div className="de-section-label lb-label">💀 敗部 (Losers Bracket)</div>
        <LBTree matches={matches} lbRounds={lbRounds} wbRounds={wbRounds} />

        <div className="de-section-label gf-label">⚔️ 大決賽 (Grand Final)</div>
        <div className="gf-row">
          {gf1 && (
            <div className="gf-col">
              <div className="round-label">大決賽</div>
              <MatchCard match={gf1} bracketType="grand_final" />
            </div>
          )}
          {gf2 && !gf2.locked && (
            <div className="gf-col">
              <div className="round-label">重賽</div>
              <MatchCard match={gf2} bracketType="grand_final" />
            </div>
          )}
        </div>
        {champion && <ChampionBanner champion={champion} subtitle="雙敗淘汰冠軍" />}
      </div>
    );
  }

  return null;
}

function ChampionBanner({ champion, subtitle }) {
  return (
    <div className="champion-banner">
      <div className="champion-crown">👑</div>
      <div className="champion-name">{champion.name}</div>
      <div className="champion-subtitle">{subtitle}</div>
    </div>
  );
}
