export interface CCSessionJSON {
  session_id: string;
  cwd: string;
  model: { id: string; display_name: string };
  workspace: { current_dir: string; project_dir: string };
  cost: { total_cost_usd: number };
  context_window: { used_percentage: number };
  rate_limits?: { five_hour?: { used_percentage: number } };
}
