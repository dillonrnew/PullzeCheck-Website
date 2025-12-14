// src/components/AdminDashboard.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { RefreshCcw } from 'lucide-react';

type Submission = {
  id: string;
  team_id: number;
  map_number: number;
  player1_kills: number;
  player2_kills: number;
  player3_kills: number;
  placement: number;
  scoreboard_image_url: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  teams?: {
    name: string;
    player1_name: string;
    player2_name: string;
    player3_name: string;
    logo_url: string;
  };
};

const AdminDashboard: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch submissions from Supabase
  const fetchSubmissions = async () => {
    const { data, error } = await supabase
      .from('submissions')
      .select(`
        *,
        teams (
          name,
          player1_name,
          player2_name,
          player3_name,
          logo_url
        )
      `)
      .order('created_at', { ascending: false });

    if (error) console.error(error);
    setSubmissions(data as Submission[]);
    setLoading(false);
  };

  // Toggle submission status
  const toggleStatus = async (submission: Submission) => {
    const newStatus =
      submission.status === 'pending'
        ? 'approved'
        : submission.status === 'approved'
        ? 'rejected'
        : 'pending';

    const { error } = await supabase
      .from('submissions')
      .update({ status: newStatus })
      .eq('id', submission.id);

    if (error) console.error(error);
  };

  // Export CSV
  const exportCSV = () => {
    const header = [
      'Team',
      'Map #',
      'P1 Name',
      'P1 Kills',
      'P2 Name',
      'P2 Kills',
      'P3 Name',
      'P3 Kills',
      'Placement',
      'Total Kills',
      'Status',
      'Submitted At',
    ];

    const rows = submissions.map((s) => [
      s.teams?.name ?? '',
      s.map_number,
      s.teams?.player1_name ?? '',
      s.player1_kills,
      s.teams?.player2_name ?? '',
      s.player2_kills,
      s.teams?.player3_name ?? '',
      s.player3_kills,
      s.placement,
      s.player1_kills + s.player2_kills + s.player3_kills,
      s.status,
      s.created_at,
    ]);

    const csvContent = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'submissions.csv';
    link.click();
  };

  // Realtime subscription
  useEffect(() => {
    fetchSubmissions();

    const channel = supabase
      .channel('submissions-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'submissions' },
        () => fetchSubmissions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) return <p className="text-center mt-8">Loading submissions...</p>;

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-4">
        <h1 className="text-3xl font-bold mb-4 md:mb-0">Admin Dashboard</h1>
        <div className="flex gap-2">
          <button
            className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            onClick={fetchSubmissions}
          >
            <RefreshCcw size={18} />
            Refresh
          </button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={exportCSV}
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Team</th>
              <th className="border p-2">Map #</th>
              <th className="border p-2">P1 (Kills)</th>
              <th className="border p-2">P2 (Kills)</th>
              <th className="border p-2">P3 (Kills)</th>
              <th className="border p-2">Total</th>
              <th className="border p-2">Placement</th>
              <th className="border p-2">Time</th>
              <th className="border p-2">Status</th>
              <th className="border p-2">Toggle</th>
              <th className="border p-2">Scoreboard</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((s) => (
              <tr key={s.id} className="text-center hover:bg-gray-50">
                <td className="border p-2 flex items-center gap-2">
                  {s.teams?.logo_url && (
                    <img src={s.teams.logo_url} alt={s.teams.name} className="w-6 h-6 object-cover rounded-full" />
                  )}
                  {s.teams?.name}
                </td>
                <td className="border p-2">{s.map_number}</td>
                <td className="border p-2">{s.teams?.player1_name} ({s.player1_kills})</td>
                <td className="border p-2">{s.teams?.player2_name} ({s.player2_kills})</td>
                <td className="border p-2">{s.teams?.player3_name} ({s.player3_kills})</td>
                <td className="border p-2">{s.player1_kills + s.player2_kills + s.player3_kills}</td>
                <td className="border p-2">{s.placement}</td>
                <td className="border p-2">{new Date(s.created_at).toLocaleString()}</td>
                <td className={`border p-2 font-bold text-${s.status === 'pending' ? 'orange-500' : s.status === 'approved' ? 'green-600' : 'red-600'}`}>
                  {s.status}
                </td>
                <td className="border p-2">
                  <button
                    className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                    onClick={() => toggleStatus(s)}
                  >
                    {s.status === 'pending' ? 'Approve' : s.status === 'approved' ? 'Reject' : 'Set Pending'}
                  </button>
                </td>
                <td className="border p-2">
                  {s.scoreboard_image_url && (
                    <a
                      href={`${s.scoreboard_image_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src={`${s.scoreboard_image_url}`}
                        alt="Scoreboard"
                        className="w-16 h-16 object-cover border rounded"
                      />
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboard;
