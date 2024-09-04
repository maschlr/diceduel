import { Context, InlineKeyboard } from "../../deps.ts";
import {
  determineScore,
  getPlayerFromContext,
  listGamesInChat,
  updateGameRoll,
} from "../storage/kv.ts";
import { Game, GameState, RollStatus } from "../models/game.ts";

export async function rollDiceHandler(ctx: Context) {
  // check if current player in current chat has any accepted games
  const chatId = ctx.chat?.id.toString();
  const games: Game[] = await listGamesInChat(chatId as string, [
    GameState.Accepted,
  ]);
  const player = await getPlayerFromContext(ctx);
  const playerIsChallenger = games.some((game) =>
    game.challenger.id === player.id
  );
  const playerIsOpponent = games.some((game) => game.opponent.id === player.id);
  if (!(playerIsChallenger || playerIsOpponent)) {
    return;
  }
  const rollScore = ctx.message?.dice?.value as number;
  const game = games.find((game) =>
    game.challenger.id === player.id || game.opponent.id === player.id
  ) as Game;
  // Update the game state
  const rollResult = await updateGameRoll(
    ctx,
    game,
    player,
    rollScore,
  );

  const otherPlayerUsername = playerIsChallenger
    ? game.opponent.username
    : game.challenger.username;
  const { challengerScore, opponentScore } = determineScore(rollResult.game);
  const playerScore = playerIsChallenger ? challengerScore : opponentScore;
  const otherPlayerScore = playerIsChallenger ? opponentScore : challengerScore;
  const scoreCard =
    `Score:\n @${player.username} ${playerScore}/${rollResult.game.winningRounds} - ${otherPlayerScore}/${rollResult.game.winningRounds} @${otherPlayerUsername}`;

  switch (rollResult.status) {
    case RollStatus.win:
      await ctx.reply(
        `@${player.username} rolls a ${rollScore}! This round goes to @${player.username}!\n\n${scoreCard}`,
      );
      break;
    case RollStatus.loose:
      await ctx.reply(
        `@${player.username} rolls a ${rollScore}! This round goes to @${otherPlayerUsername}!\n\n${scoreCard}`,
      );
      break;
    case RollStatus.invalid:
      await ctx.reply(
        `Sorry, @${player.username} it's not your turn. @${otherPlayerUsername} needs to roll first.`,
      );
      break;
    case RollStatus.tie:
      await ctx.reply(
        `@${player.username} rolls a ${rollScore}! This round is a tie!\n\n${scoreCard}`,
      );
      break;
    case RollStatus.open:
      await ctx.reply(
        `@${player.username} rolls a ${rollScore} and opens this round! It's your turn @${otherPlayerUsername}!`,
      );
      break;
    case RollStatus.closed: {
      const playerWins = playerIsChallenger
        ? challengerScore > opponentScore
        : opponentScore > challengerScore;
      const keyboard = new InlineKeyboard()
        .text("Revenge!", `revenge:${game.id}`);
      if (playerWins) {
        await ctx.reply(
          `👑 Winner, winner, chicken dinner! @${player.username} rolls a ${rollScore} and wins this game!\n\n${scoreCard}`,
          { reply_markup: keyboard },
        );
      } else {
        await ctx.reply(
          `👑Winner, winner, chicken dinner! @${player.username} rolls a ${rollScore} and looses this round and the match! The winner is: @${otherPlayerUsername}!\n\n${scoreCard}`,
          { reply_markup: keyboard },
        );
      }
      break;
    }
  }
}
