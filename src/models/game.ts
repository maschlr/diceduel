export enum GameState {
  Initiated = 0,
  Accepted = 1,
  Finished = 2,
}

export enum RollStatus {
  invalid = 1,
  tie = 2,
  win = 3,
  loose = 4,
  open = 5,
  closed = 6, // close game
}

export interface RollResult {
  status: RollStatus;
  message?: string;
  game: Game;
}

export interface Game {
  id: string;
  challenger: Player;
  opponent: Player;
  state: GameState;
  winningRounds: number;
  challengerRolls: number[];
  opponentRolls: number[];
  coin: string | null;
  amount: number | null;
}

export interface Player {
  id?: string;
  username: string;
  first_name: string; // use snake case like TG
}

export interface CreateGameResult {
  success: boolean;
  error?: string;
  game?: Game;
}
