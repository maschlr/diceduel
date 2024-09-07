import { Context } from "../../deps.ts";
import {
  determineScore,
  getPlayerFromId,
  listGamesInChat,
} from "../storage/kv.ts";
import { GameState } from "../models/game.ts";
export async function scoreBoardHandler(ctx: Context) {
  const chatId = ctx.chat?.id.toString() || "";
  if (!chatId) {
    throw new Error("Chat ID not found in context");
  }
  const finishedGames = await listGamesInChat(chatId, [GameState.Finished]);
  const playerIdToScore = new Map<string, number>();
  for (const game of finishedGames) {
    const challengerId = game.challenger.id as string;
    const opponentId = game.opponent.id as string;
    const { challengerScore, opponentScore } = determineScore(game);
    if (challengerScore > opponentScore) {
      playerIdToScore.set(
        challengerId,
        (playerIdToScore.get(challengerId) || 0) + 1,
      );
    } else {
      playerIdToScore.set(
        opponentId,
        (playerIdToScore.get(opponentId) || 0) + 1,
      );
    }
  }
  const sortedPlayerIdToScore = Array.from(playerIdToScore.entries()).sort((
    a,
    b,
  ) => b[1] - a[1]);
  const playerIdToName = new Map<string, string>();

  const promises = [];
  for (const playerId of playerIdToScore.keys()) {
    promises.push(getPlayerFromId(playerId));
  }
  const players = await Promise.all(promises);
  for (const player of players) {
    if (player && player.id && (player.username || player.first_name)) {
      playerIdToName.set(
        player.id,
        (player.username || player.first_name) as string,
      );
    }
  }

  const message = sortedPlayerIdToScore.map(([playerId, score], index) => {
    let prefix = `(${(index + 1).toString()})`;
    if (index === 0) {
      prefix = "🥇";
    } else if (index === 1) {
      prefix = "🥈";
    } else if (index === 2) {
      prefix = "🥉";
    }
    return `${prefix} @${playerIdToName.get(playerId)}: ${score}`;
  }).join("\n");
  await ctx.reply(`Scoreboard:\n\n${message}`);
}
