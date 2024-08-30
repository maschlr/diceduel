import { Context } from "../../deps.ts";
import { getGame, getPlayer, updateGame } from "../storage/kv.ts";
import { GameState } from "../models/game.ts";

export async function acceptGameHandler(ctx: Context, gameId: string) {
  const game = await getGame(ctx, gameId);

  if (!game) {
    await ctx.answerCallbackQuery("This game no longer exists.");
    return;
  }

  if (game.state === GameState.Accepted) {
    await ctx.answerCallbackQuery(
      "This game has already been accepted.",
    );
    return;
  } else if (game.state === GameState.Finished) {
    await ctx.answerCallbackQuery(
      "This game has already been finished.",
    );
    return;
  }

  if (ctx.from?.username !== game.opponent.username) {
    await ctx.answerCallbackQuery("You are not the challenged player.");
    return;
  }
  const opponent = await getPlayer(ctx);
  game.opponent = opponent;
  game.state = GameState.Accepted;

  await Promise.all([
    updateGame(ctx, game),
    ctx.reply(
      `Game on! Players, roll your dice!`,
    ),
  ]);
}
