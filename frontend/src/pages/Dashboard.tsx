import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface FootprintLog {
  _id: string;
  energyEmission: number;
  transportEmission: number;
  foodEmission: number;
  totalEmission: number;
  suggestions: string[];
  createdAt: string;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  pointsReward: number;
  durationDays: number;
}

export const Dashboard: React.FC = () => {
  const { user, token, completeChallenge } = useAuth();
  const [logs, setLogs] = useState<FootprintLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [completingId, setCompletingId] = useState<string | null>(null);
  const [challengeMessage, setChallengeMessage] = useState<{ id: string; text: string; error: boolean } | null>(null);

  const handleCompleteChallenge = async (challengeId: string) => {
    setCompletingId(challengeId);
    setChallengeMessage(null);
    const result = await completeChallenge(challengeId);
    setCompletingId(null);
    if (result.success) {
      setChallengeMessage({ id: challengeId, text: result.message, error: false });
      // Clear message after 4 seconds
      setTimeout(() => {
        setChallengeMessage(prev => prev?.id === challengeId ? null : prev);
      }, 4000);
    } else {
      setChallengeMessage({ id: challengeId, text: result.message, error: true });
    }
  };

  // Challenges state
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [challengesLoading, setChallengesLoading] = useState(true);
  const [challengesError, setChallengesError] = useState<string | null>(null);

  // Aggregated totals
  const [totals, setTotals] = useState({
    energy: 0,
    transport: 0,
    food: 0,
    total: 0,
  });

  const calculateTotals = (data: FootprintLog[]) => {
    let energy = 0;
    let transport = 0;
    let food = 0;

    data.forEach((log) => {
      energy += log.energyEmission;
      transport += log.transportEmission;
      food += log.foodEmission;
    });

    const total = energy + transport + food;

    setTotals({
      energy: parseFloat(energy.toFixed(1)),
      transport: parseFloat(transport.toFixed(1)),
      food: parseFloat(food.toFixed(1)),
      total: parseFloat(total.toFixed(1)),
    });
  };

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const response = await fetch(`${apiBaseUrl}/footprint/history`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();

        if (response.ok && data.success) {
          setLogs(data.data);
          calculateTotals(data.data);
        } else {
          setError(data.message || 'Failed to retrieve carbon log history.');
        }
      } catch (err) {
        console.error('Error fetching logs:', err);
        setError('Failed to contact backend services.');
      } finally {
        setLoading(false);
      }
    };

    const fetchChallenges = async () => {
      try {
        const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const response = await fetch(`${apiBaseUrl}/footprint/challenges`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();

        if (response.ok && data.success) {
          setChallenges(data.data);
        } else {
          throw new Error(data.message || 'Failed to retrieve challenges.');
        }
      } catch (err) {
        console.error('Error fetching challenges:', err);
        setChallengesError('Failed to load challenges.');
        // Fallback array if backend isn't populated or responds with error
        setChallenges([
          {
            id: '1',
            title: 'No Car Day',
            description: 'Use public transport, bike, or walk for all your commutes today.',
            pointsReward: 50,
            durationDays: 1,
          },
          {
            id: '2',
            title: 'Energy Saver',
            description: 'Turn off all non-essential appliances and air conditioning for 4 hours.',
            pointsReward: 30,
            durationDays: 1,
          },
          {
            id: '3',
            title: 'Plant-Based Diet',
            description: 'Eat only vegetarian or vegan meals today to reduce food footprint.',
            pointsReward: 40,
            durationDays: 1,
          },
        ]);
      } finally {
        setChallengesLoading(false);
      }
    };

    if (token) {
      fetchHistory();
      fetchChallenges();
    }
  }, [token]);

  // Helper values for drawing SVG chart
  const energyPercentage = totals.total > 0 ? (totals.energy / totals.total) * 100 : 0;
  const transportPercentage = totals.total > 0 ? (totals.transport / totals.total) * 100 : 0;
  const foodPercentage = totals.total > 0 ? (totals.food / totals.total) * 100 : 0;

  // Pie chart variables
  const radius = 50;
  const circumference = 2 * Math.PI * radius;

  // Stroke offsets
  const energyOffset = circumference - (energyPercentage / 100) * circumference;
  const transportOffset = circumference - (transportPercentage / 100) * circumference;
  const foodOffset = circumference - (foodPercentage / 100) * circumference;

  return (
    <main className="dashboard-container fade-in">
      <header className="dashboard-header flex-between">
        <div>
          <h1>Welcome back, {user?.name || 'User'}!</h1>
          <p className="subtitle">Track and optimize your carbon footprint metrics below.</p>
        </div>
        <Link to="/calculator" className="btn btn-primary" aria-label="Ask AI Assistant to calculate footprint">
          <span role="img" aria-label="Speech bubble">💬</span> Ask AI Assistant
        </Link>
      </header>

      {/* Point Tracker Banner */}
      <section className="points-banner glass-card flex-between" aria-label="Points Summary">
        <div className="points-text">
          <h3>Sustainability Level</h3>
          <p>You have earned environmental credits by logging your daily routines.</p>
        </div>
        <div className="points-display">
          <span className="points-number">{user?.totalPoints}</span>
          <span className="points-label">Total Points</span>
        </div>
      </section>

      {loading ? (
        <div className="loading-container">
          <div className="spinner" role="progressbar" aria-label="Loading dashboard metrics"></div>
          <p>Retrieving your footprint dashboard...</p>
        </div>
      ) : error ? (
        <div className="alert-error" role="alert">{error}</div>
      ) : (
        <>
          {/* Carbon Metrics Grid */}
          <section className="grid-3 dashboard-grid" aria-label="Footprint Sector Summaries">
            <div className="metric-card glass-card border-energy">
              <h4>Energy Footprint</h4>
              <p className="metric-value">{totals.energy} <span>kg CO2</span></p>
              <div className="bar-track"><div className="bar-fill fill-energy" style={{ width: `${energyPercentage}%` }}></div></div>
            </div>

            <div className="metric-card glass-card border-transport">
              <h4>Transport Footprint</h4>
              <p className="metric-value">{totals.transport} <span>kg CO2</span></p>
              <div className="bar-track"><div className="bar-fill fill-transport" style={{ width: `${transportPercentage}%` }}></div></div>
            </div>

            <div className="metric-card glass-card border-food">
              <h4>Food Footprint</h4>
              <p className="metric-value">{totals.food} <span>kg CO2</span></p>
              <div className="bar-track"><div className="bar-fill fill-food" style={{ width: `${foodPercentage}%` }}></div></div>
            </div>
          </section>

          <section className="grid-2 chart-and-logs-grid" aria-label="Detailed Charts and Historical Logs">
            {/* Visual breakdown chart */}
            <div className="chart-card glass-card flex-between flex-wrap">
              <div className="chart-info">
                <h3>Emissions Distribution</h3>
                <p>Breakdown of your total lifetime log footprint of <strong>{totals.total} kg CO2</strong>.</p>
                
                <div className="chart-legend">
                  <div className="legend-item"><span className="dot bg-energy"></span> Energy ({energyPercentage.toFixed(0)}%)</div>
                  <div className="legend-item"><span className="dot bg-transport"></span> Transport ({transportPercentage.toFixed(0)}%)</div>
                  <div className="legend-item"><span className="dot bg-food"></span> Food ({foodPercentage.toFixed(0)}%)</div>
                </div>
              </div>

              <div className="chart-visual">
                {totals.total > 0 ? (
                  <svg
                    viewBox="0 0 160 160"
                    style={{ width: '100%', maxWidth: '160px', height: 'auto' }}
                    role="img"
                    aria-label={`Carbon emissions distribution donut chart: Energy ${energyPercentage.toFixed(0)}%, Transport ${transportPercentage.toFixed(0)}%, Food ${foodPercentage.toFixed(0)}%`}
                  >
                    <circle cx="80" cy="80" r={radius} fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="18" />
                    
                    {/* Energy segment */}
                    <circle
                      cx="80"
                      cy="80"
                      r={radius}
                      fill="transparent"
                      stroke="#10b981"
                      strokeWidth="18"
                      strokeDasharray={circumference}
                      strokeDashoffset={energyOffset}
                      transform="rotate(-90 80 80)"
                      strokeLinecap="round"
                    />
                    
                    {/* Transport segment */}
                    <circle
                      cx="80"
                      cy="80"
                      r={radius}
                      fill="transparent"
                      stroke="#3b82f6"
                      strokeWidth="18"
                      strokeDasharray={circumference}
                      strokeDashoffset={transportOffset}
                      transform={`rotate(${(energyPercentage / 100) * 360 - 90} 80 80)`}
                      strokeLinecap="round"
                    />

                    {/* Food segment */}
                    <circle
                      cx="80"
                      cy="80"
                      r={radius}
                      fill="transparent"
                      stroke="#8b5cf6"
                      strokeWidth="18"
                      strokeDasharray={circumference}
                      strokeDashoffset={foodOffset}
                      transform={`rotate(${((energyPercentage + transportPercentage) / 100) * 360 - 90} 80 80)`}
                      strokeLinecap="round"
                    />
                  </svg>
                ) : (
                  <div className="empty-chart">No Data</div>
                )}
              </div>
            </div>

            {/* Calculations History Logs List */}
            <div className="logs-card glass-card">
              <h3>Recent Footprint Logs</h3>
              <div className="logs-list">
                {logs.length === 0 ? (
                  <div className="empty-logs">
                    <p>No carbon footprint records logged yet.</p>
                    <Link to="/calculator" className="btn btn-secondary btn-sm">Calculate Now</Link>
                  </div>
                ) : (
                  logs.slice(0, 5).map((log) => (
                    <div key={log._id} className="log-row flex-between">
                      <div className="log-meta">
                        <span className="log-date">
                          {new Date(log.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                        <div className="log-sub-sectors">
                          E: {log.energyEmission} | T: {log.transportEmission} | F: {log.foodEmission}
                        </div>
                      </div>
                      <div className="log-value-badge">
                        {log.totalEmission} kg CO2
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* Sustainability Challenges */}
          <section className="challenges-section glass-card" style={{ marginTop: '32px' }} aria-label="Sustainability Challenges">
            <h3 style={{ marginBottom: '4px' }}>Active Sustainability Challenges</h3>
            <p className="subtitle" style={{ marginBottom: '20px' }}>Complete daily challenges to earn environmental points.</p>
            {challengesLoading ? (
              <div className="loading-container" style={{ padding: '20px 0', textAlign: 'center' }}>
                <div className="spinner" role="progressbar" aria-label="Loading challenges" style={{ margin: '0 auto 12px' }}></div>
                <p>Fetching active challenges...</p>
              </div>
            ) : challengesError && challenges.length === 0 ? (
              <div className="alert-error" role="alert">{challengesError}</div>
            ) : (
              <div className="grid-3" style={{ marginTop: '16px' }}>
                {challenges.map((challenge) => {
                  const isCompleted = user?.completedChallenges?.includes(challenge.id) || false;
                  const isThisCompleting = completingId === challenge.id;
                  const msg = challengeMessage?.id === challenge.id ? challengeMessage : null;

                  return (
                    <div
                      key={challenge.id}
                      className={`challenge-card glass-card ${isCompleted ? 'challenge-completed' : ''}`}
                    >
                      <div className="challenge-icon-wrapper">
                        {challenge.id === '1' && (
                          <svg className="challenge-icon text-transport" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v7c0 .6.4 1 1 1h2" /><circle cx="7" cy="17" r="2" /><circle cx="15" cy="17" r="2" /><path d="M13 17h-4" /></svg>
                        )}
                        {challenge.id === '2' && (
                          <svg className="challenge-icon text-energy" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                        )}
                        {challenge.id === '3' && (
                          <svg className="challenge-icon text-food" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2c-5.5 0-10 4.5-10 10s4.5 10 10 10 10-4.5 10-10-4.5-10-10-10zm0 15c-2.8 0-5-2.2-5-5s2.2-5 5-5 5 2.2 5 5-2.2 5-5 5z" /><circle cx="12" cy="12" r="2" /></svg>
                        )}
                      </div>
                      <div className="challenge-info-main">
                        <h4>{challenge.title}</h4>
                        <p>{challenge.description}</p>
                      </div>
                      
                      {msg && (
                        <div className={`challenge-alert ${msg.error ? 'alert-error' : 'alert-success'}`}>
                          {msg.text}
                        </div>
                      )}

                      <div className="challenge-footer flex-between">
                        <span className="challenge-reward">+{challenge.pointsReward} pts</span>
                        {isCompleted ? (
                          <span className="completed-badge">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Completed
                          </span>
                        ) : (
                          <button
                            onClick={() => handleCompleteChallenge(challenge.id)}
                            className="btn btn-primary btn-sm btn-challenge-complete"
                            disabled={isThisCompleting}
                          >
                            {isThisCompleting ? (
                              <span className="mini-spinner"></span>
                            ) : (
                              'Claim Points'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
};
