import { GamePlaceholder } from '../../components/GamePlaceholder';
import { useRef } from 'react'; // 导入 useRef
import { Link } from 'react-router-dom';
import { games, LEVEL_LABELS } from '../../data/games';

export function InteractionBias() {
  const slug = "interaction-bias";
  const game = games.find((g) => g.slug === slug);

  
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullScreen = () => {
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch((err) => {
          alert(`Error attempting to enable full-screen mode: ${err.message}`);
        });
      } else {
        document.exitFullscreen();
      }
    }
  };

  if (!game) return <p>Game data not found.</p>;

  return (
    <section className="game-page">
      <Link to="/#games" className="back-link">← All games</Link>

      <header className="game-header">
        <h1>{game.title}</h1>
        <p className="lede">{game.short}</p>
      </header>

      <div className="game-section" style={{ marginTop: '2rem' }}>

        <div
          ref={containerRef}
          className="game-container"
          style={{
            width: '100%',
            aspectRatio: '16/9',
            background: '#000',
            borderRadius: '12px',
            overflow: 'hidden' 
          }}
        >
          <iframe
            src="/Interaction_Bias_Game/index.html"
            style={{ width: '100%', height: '100%', border: 'none' }}
            title={game.title}
            allow="fullscreen; cross-origin-isolated"
          />
        </div>

        {/* 2. 按钮：一定要放在上面的 div 闭合标签 </div> 的外面！！ */}
        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-start' }}>
          <button
            onClick={toggleFullScreen}
            className="fullscreen-toggle"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 20px',
              backgroundColor: '#f0f0f0',
              color: '#333',
              border: '1px solid #ddd',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '14px',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e5e5e5';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f0f0f0';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
            Full Screen
          </button>
        </div>

      </div>

      
    </section>
  );
}