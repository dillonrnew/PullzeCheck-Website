// src/components/tourneyDetails/types.ts

export type TabKey = "participants" | "leaderboard" | "details" | "submit";

export type EstablishedTeamRow = {
  UUID: string;
  "Team Name": string | null;
  "Team Logo": string | null;
  "Player 1": string | null;
  "Player 2": string | null;
  "Player 3": string | null;
  "Player 1 Confirmed"?: boolean;
  "Player 2 Confirmed"?: boolean;
  "Player 3 Confirmed"?: boolean;
  "Team Confirmed"?: boolean;
};

export type ProfileRow = {
  id: string;
  gamertag: string | null;
};

export type RegistrationRow = {
  id: string;
  team_id: string;
  tourney_id: string;
  created_at: string;
  confirmed: boolean;
  team: EstablishedTeamRow | EstablishedTeamRow[] | null;
};

export type LeaderboardRow = {
  tourney_id: string;
  team_id: string;
  maps_played: number;
  total_kills: number;
  total_points: number | string;
  updated_at: string;

  team: EstablishedTeamRow | EstablishedTeamRow[] | null;
};

export type SubmissionRow = {
  id: string;
  tourney_id: string;
  team_id: string;
  map_number: number;
  placement: number | null;
  player1_kills: number;
  player2_kills: number;
  player3_kills: number;
  total_kills: number;
  scoreboard_image_url: string | null; // storage path
  status: "pending" | "approved" | "rejected" | "void";
  created_at: string;
  updated_at: string;
};
