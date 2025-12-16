// src/components/Leaderboard.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/Leaderboard.css';

type LeaderboardRow = {
    id: number;
    "Player Names": string | null;
    score: number | null;
    position: number | null;
};

export default function Leaderboard() {
    const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchLeaderboard() {
            try {
                const { data, error } = await supabase
                    .from('Leaderboard')
                    .select('*')
                    .order('position', { ascending: true });

                if (error) throw error;

                const rows = (data as LeaderboardRow[]) || [];

                // Only keep rows that have actual player names
                const validRows = rows.filter(
                    (row) => row["Player Names"] && row["Player Names"].trim() !== ''
                );

                setLeaderboard(validRows);
            } catch (err) {
                setError((err as Error).message);
            } finally {
                setLoading(false);
            }
        }

        fetchLeaderboard();

        // Refresh every 60 seconds
        const interval = setInterval(fetchLeaderboard, 60000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return <p>Loading leaderboard...</p>;
    if (error) return <p>Error: {error}</p>;
    if (leaderboard.length === 0) return <p>No entries yet.</p>;

    return (
        <div className="leaderboard-container">
            <h1 className="leaderboard-title">Leaderboard</h1>

            <table className="leaderboard-table">
                <thead>
                    <tr className="header-row">
                        <th>Position</th>
                        <th>Player Names</th>
                        <th>Score</th>
                    </tr>
                </thead>
                <tbody>
                    {leaderboard.map((row) => (
                        <tr key={row.id}>
                            <td>{row.position ?? '-'}</td>
                            <td className="player-names-cell">
                                {row["Player Names"]?.split('\n').map((name, index) => (
                                    <div key={index} className="player-name-line">
                                        {name.trim() || <span className="empty-name">&nbsp;</span>}
                                    </div>
                                ))}
                            </td>
                            <td>{row.score ?? '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <p className="entry-count">
                Showing {leaderboard.length} {leaderboard.length === 1 ? 'entry' : 'entries'}
            </p>
        </div>
    );
}