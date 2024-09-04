import {
  CreateGameResult,
  Game,
  GameState,
  Player,
  RollResult,
  RollStatus,
} from "../models/game.ts";
import { ulid } from "jsr:@std/ulid";
import { Context } from "../../deps.ts";

let kv_: Deno.Kv;
try {
  kv_ = await Deno.openKv();
} catch (e) {
  console.error("Failed to open KV store", e);
}

export async function getPlayerFromId(
  id: string,
  kv: Deno.Kv = kv_,
): Promise<Player | null> {
  const playerDbResult: Deno.KvEntryMaybe<Player> = await kv.get([
    "players",
    id,
  ]);
  return playerDbResult.value;
}

export async function getPlayerFromContext(
  ctx: Context,
  kv: Deno.Kv = kv_,
): Promise<Player> {
  if (!ctx.from?.id) {
    throw new Error("No Player ID found in context");
  }
  const userId: string = ctx.from.id.toString();
  const username: string = ctx.from.username || "";

  const playerDbResult: Deno.KvEntryMaybe<Player> = await kv.get([
    "players",
    userId,
  ]);
  let player: Player;
  if (!playerDbResult.value) {
    // create if doesn't exist
    player = {
      id: userId,
      username,
    };
    await kv.set(["players", userId], player);
  } else if (playerDbResult.value.username !== username) {
    // update if username has changed
    player = playerDbResult.value;
    player.username = username;
    await kv.set(["players", userId], player);
  } else {
    // all up to date -> return
    player = playerDbResult.value;
  }

  return player;
}

export async function createGame(
  challenger: Player,
  opponent: Player,
  chatId: string,
  winningRounds: number,
  kv: Deno.Kv = kv_,
): Promise<CreateGameResult> {
  // check if either challenger or opponent already have an ongoing game
  const games: Game[] = await listGamesInChat(chatId, [GameState.Accepted]);
  // we see the opponent.id at the accept game step
  // compare username here
  const challengerGame = games.find((game) =>
    game.challenger.id === challenger.id
  );
  const opponentGame = games.find((game) =>
    game.opponent.username === opponent.username
  );

  if (
    challengerGame
  ) {
    return {
      success: false,
      error:
        `@${challenger.username}: you already have a game running. That needs to be finished first.`,
      game: challengerGame,
    };
  } else if (
    opponentGame
  ) {
    return {
      success: false,
      error:
        `@${opponent.username} already has a game running. That needs to be finished first.`,
      game: opponentGame,
    };
  }

  const gameId = ulid();
  const game: Game = {
    id: gameId,
    challenger,
    opponent,
    state: GameState.Initiated,
    winningRounds,
    challengerRolls: [],
    opponentRolls: [],
    coin: null,
    amount: null,
  };

  await kv.set(["games", chatId, gameId], game);

  return {
    success: true,
    game,
  };
}

export async function getGame(
  ctx: Context,
  gameId: string,
  kv: Deno.Kv = kv_,
): Promise<Game | null> {
  const chatId = ctx.chat?.id?.toString();
  if (!chatId) {
    throw new Error("Chat ID not found in context");
  }

  const result = await kv.get<Game>(["games", chatId, gameId]);
  return result.value;
}

export async function updateGame(
  ctx: Context,
  game: Game,
  kv: Deno.Kv = kv_,
): Promise<void> {
  const chatId = ctx.chat?.id?.toString();
  if (!chatId) {
    throw new Error("Chat ID not found in context");
  }
  // set the game in the current state
  await kv.set(["games", chatId, game.id], game);
}

export async function updateGameRoll(
  ctx: Context,
  game: Game,
  player: Player,
  roll: number,
  kv: Deno.Kv = kv_,
): Promise<RollResult> {
  // determine if player is challenger or opponent
  const isChallenger = game.challenger.id === player.id;
  const isOpponent = game.opponent.id === player.id;
  if (!(isChallenger || isOpponent)) {
    throw new Error("Player not found in game");
  }

  // the roll is valid if the length of the rolls is equal or if the other player has one more
  if (
    (isChallenger && game.challengerRolls.length > game.opponentRolls.length) ||
    (isOpponent && game.opponentRolls.length > game.challengerRolls.length)
  ) {
    return {
      status: RollStatus.invalid,
      message: `@${player.username}: you already rolled. Wait for the @${
        isChallenger ? game.opponent.username : game.challenger.username
      } to roll.`,
      game,
    };
  }

  const isOpening = game.challengerRolls.length === game.opponentRolls.length;

  // if the round is opening, we return the game as is
  const result = {
    status: RollStatus.loose,
    game,
  };
  if (isChallenger) {
    result.game.challengerRolls.push(roll);
  } else {
    result.game.opponentRolls.push(roll);
  }

  if (isOpening) {
    result.status = RollStatus.open;
  } else {
    const otherPlayerLastRollScore = isChallenger
      ? game.opponentRolls[game.opponentRolls.length - 1]
      : game.challengerRolls[game.challengerRolls.length - 1];
    const { challengerScore, opponentScore } = await determineScore(game);
    if (roll === otherPlayerLastRollScore) {
      result.status = RollStatus.tie;
    } else if (
      challengerScore === game.winningRounds ||
      opponentScore === game.winningRounds
    ) {
      result.status = RollStatus.closed;
      result.game.state = GameState.Finished;
    } else if (roll > otherPlayerLastRollScore) {
      // distinguish between a winning and a closing round
      result.status = RollStatus.win;
    }
  }
  // if (roll < otherPlayerLastRollScore)
  await updateGame(ctx, result.game, kv);
  return result;
}

export function determineScore(
  game: Game,
): { challengerScore: number; opponentScore: number } {
  const challengerRolls: number[] = game.challengerRolls;
  const opponentRolls: number[] = game.opponentRolls;
  let challengerScore = 0;
  let opponentScore = 0;
  for (
    let i = 0;
    i < Math.min(challengerRolls.length, opponentRolls.length);
    i++
  ) {
    const challengerRoll = challengerRolls[i];
    const opponentRoll = opponentRolls[i];
    if (challengerRoll > opponentRoll) {
      challengerScore += 1;
    } else if (opponentRoll > challengerRoll) {
      opponentScore += 1;
    }
  }

  return {
    challengerScore,
    opponentScore,
  };
}

export async function listGamesInChat(
  chatId: string,
  states: GameState[] = [GameState.Initiated, GameState.Accepted],
  kv: Deno.Kv = kv_,
): Promise<Game[]> {
  const games: Game[] = [];

  const results = await kv.list<Game>({ prefix: ["games", chatId] });
  for await (const result of results) {
    if (result.value && states.includes(result.value.state)) {
      games.push(result.value);
    }
  }

  return games;
}
