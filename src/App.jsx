import { useState, useEffect } from 'react';
import './App.css';

const API = '/api';

const TOKENS = {
  NARA: { symbol: 'NARA', name: 'Nara', color: '#6366f1', icon: '⬡' },
  USDC: { symbol: 'USDC', name: 'USD Coin', color: '#2775ca', icon: '◎' },
  USDT: { symbol: 'USDT', name: 'Tether', color: '#26a17b', icon: '₮' },
  SOL: { symbol: 'SOL', name: 'Solana', color: '#9945ff', icon: '💎' },
};

function App() {
  const [poolsRaw, setPoolsRaw] = useState('');
  const [pools, setPools] = useState([]);
  const [prices, setPrices] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [poolsRes, pricesRes] = await Promise.all([
        fetch(`${API}/pools`),
        fetch(`${API}/prices`),
      ]);
      const poolsData = await poolsRes.json();
      const pricesData = await pricesRes.json();
      if (poolsData.success) {
        setPoolsRaw(poolsData.data);
        setPools(parsePools(poolsData.data));
      }
      if (pricesData.success) setPrices(pricesData.data);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const parsePools = (text) => {
    if (!text) return [];
    const poolBlocks = text.split(/\n\s*\n/).filter(b => b.includes('['));
    return poolBlocks.map(block => {
      const typeMatch = block.match(/\[(\w[\w\s]*?)\]/);
      const pairMatch = block.match(/\]\s*(\w+\/\w+)/);
      const addressMatch = block.match(/\]\s*\w+\/\w+\s+([A-Za-z0-9]+)/);
      const reservesMatch = block.match(/Reserves:\s+([\d.]+)\s+(\w+)\s+\/\s+([\d.]+)\s+(\w+)/);
      const priceMatch = block.match(/Price:\s+1\s+\w+\s+=\s+([\d.]+)\s+(\w+)/);

      const pair = pairMatch ? pairMatch[1] : '??/??';
      const [tokenA, tokenB] = pair.split('/');

      return {
        type: typeMatch ? typeMatch[1] : 'Unknown',
        pair,
        tokenA,
        tokenB,
        address: addressMatch ? addressMatch[1] : '',
        reserveA: reservesMatch ? parseFloat(reservesMatch[1]) : 0,
        reserveAToken: reservesMatch ? reservesMatch[2] : '',
        reserveB: reservesMatch ? parseFloat(reservesMatch[3]) : 0,
        reserveBToken: reservesMatch ? reservesMatch[4] : '',
        price: priceMatch ? priceMatch[1] : '-',
        priceToken: priceMatch ? priceMatch[2] : '',
        isEmpty: reservesMatch ? (parseFloat(reservesMatch[1]) === 0 && parseFloat(reservesMatch[3]) === 0) : true,
      };
    }).sort((a, b) => {
      if (a.isEmpty && !b.isEmpty) return 1;
      if (!a.isEmpty && b.isEmpty) return -1;
      return (b.reserveA + b.reserveB) - (a.reserveA + a.reserveB);
    });
  };

  const parsePrice = (text) => {
    if (!text) return null;
    const match = text.match(/Price:\s+1\s+NARA\s+=\s+([\d.]+)\s+(\w+)/);
    return match ? { amount: match[1], token: match[2] } : null;
  };

  const formatNumber = (n) => {
    if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
    if (n >= 1) return n.toFixed(4);
    return n.toFixed(6);
  };

  const shortenAddress = (addr) => {
    if (!addr || addr.length < 10) return addr;
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  const usdcPrice = parsePrice(prices?.usdc);
  const solPrice = parsePrice(prices?.sol);
  const activePools = pools.filter(p => !p.isEmpty);
  const emptyPools = pools.filter(p => p.isEmpty);
  const totalLiquidity = activePools.reduce((sum, p) => {
    if (p.reserveBToken === 'USDC') return sum + p.reserveB;
    return sum;
  }, 0);

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-logo">
          <span className="logo-hex">⬡</span>
          <span className="logo-text">NARA Market View</span>
        </div>
        <div className="nav-meta">
          {lastUpdate && <span className="last-update">Updated: {lastUpdate}</span>}
          <button className="refresh-btn" onClick={fetchData} disabled={loading}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </button>
        </div>
      </nav>

      <main className="main">
        {/* Price Section */}
        <section className="section">
          <h2 className="section-title">Price</h2>
          <div className="price-grid">
            {usdcPrice && (
              <div className="price-card">
                <div className="price-pair">
                  <span className="pair-icons">
                    <span style={{ background: TOKENS.NARA.color }}>{TOKENS.NARA.icon}</span>
                    <span style={{ background: TOKENS.USDC.color }}>{TOKENS.USDC.icon}</span>
                  </span>
                  <div className="pair-info">
                    <span className="pair-name">NARA / USDC</span>
                    <span className="pair-label">1 NARA</span>
                  </div>
                </div>
                <div className="price-value">${usdcPrice.amount}</div>
              </div>
            )}
            {solPrice && (
              <div className="price-card">
                <div className="price-pair">
                  <span className="pair-icons">
                    <span style={{ background: TOKENS.NARA.color }}>{TOKENS.NARA.icon}</span>
                    <span style={{ background: TOKENS.SOL.color }}>{TOKENS.SOL.icon}</span>
                  </span>
                  <div className="pair-info">
                    <span className="pair-name">NARA / SOL</span>
                    <span className="pair-label">1 NARA</span>
                  </div>
                </div>
                <div className="price-value">{solPrice.amount} SOL</div>
              </div>
            )}
          </div>
        </section>

        {/* Pools Section */}
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">Pools</h2>
            <div className="pool-stats">
              <span className="stat">
                <span className="stat-value">{activePools.length}</span>
                <span className="stat-label">Active</span>
              </span>
              {totalLiquidity > 0 && (
                <span className="stat">
                  <span className="stat-value">${totalLiquidity.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                  <span className="stat-label">Total Liquidity</span>
                </span>
              )}
            </div>
          </div>

          {loading && pools.length === 0 ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <span>Loading pools...</span>
            </div>
          ) : (
            <>
              <div className="pools-table">
                <div className="table-header">
                  <span className="col-pool">Pool</span>
                  <span className="col-type">Type</span>
                  <span className="col-reserves">Reserves</span>
                  <span className="col-price">Price</span>
                  <span className="col-address">Address</span>
                </div>
                {activePools.map((pool, i) => (
                  <div key={i} className="table-row">
                    <div className="col-pool">
                      <span className="pool-pair-icons">
                        <span style={{ background: TOKENS[pool.tokenA]?.color || '#666' }}>{TOKENS[pool.tokenA]?.icon || '?'}</span>
                        <span style={{ background: TOKENS[pool.tokenB]?.color || '#666' }}>{TOKENS[pool.tokenB]?.icon || '?'}</span>
                      </span>
                      <span className="pool-name">{pool.pair}</span>
                    </div>
                    <div className="col-type">
                      <span className={`type-badge ${pool.type.includes('DLMM') ? 'dlmm' : 'damm'}`}>
                        {pool.type}
                      </span>
                    </div>
                    <div className="col-reserves">
                      <span className="reserve-line">{formatNumber(pool.reserveA)} {pool.tokenA}</span>
                      <span className="reserve-line">{formatNumber(pool.reserveB)} {pool.tokenB}</span>
                    </div>
                    <div className="col-price">
                      {pool.price} {pool.priceToken}
                    </div>
                    <div className="col-address" title={pool.address}>
                      {shortenAddress(pool.address)}
                    </div>
                  </div>
                ))}
              </div>

              {emptyPools.length > 0 && (
                <div className="empty-pools">
                  <span className="empty-label">Empty pools ({emptyPools.length})</span>
                  {emptyPools.map((pool, i) => (
                    <div key={i} className="empty-pool-row">
                      <span className="pool-name">{pool.pair}</span>
                      <span className={`type-badge ${pool.type.includes('DLMM') ? 'dlmm' : 'damm'}`}>{pool.type}</span>
                      <span className="empty-address" title={pool.address}>{shortenAddress(pool.address)}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </main>

      <footer className="footer">
        <span>NARA Market View — Meteora on Nara Chain</span>
        <span>Auto-refresh every 15s</span>
      </footer>
    </div>
  );
}

export default App;
