import { Context, InlineKeyboard } from "../../deps.ts";
import {
  createGame,
  getGame,
  getPlayerFromContext,
  updateGame,
} from "../storage/kv.ts";
import { CreateGameResult, GameState, Player } from "../models/game.ts";

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
  const opponent = await getPlayerFromContext(ctx);
  game.opponent = opponent;
  game.state = GameState.Accepted;

  await Promise.all([
    updateGame(ctx, game),
    ctx.reply(
      `Game on! Players, roll your dice!`,
    ),
  ]);
}

export async function revengeHandler(ctx: Context, gameId: string) {
  const oldGame = await getGame(ctx, gameId);

  // only the challenger or opponent can call for a revenge
  const userId = ctx.from?.id.toString();
  if (
    userId !== oldGame?.challenger.id &&
    userId !== oldGame?.opponent.id
  ) {
    await ctx.answerCallbackQuery("You are not the challenger or opponent.");
    return;
  }

  const challenger = await getPlayerFromContext(ctx);
  const opponent = challenger.id == oldGame?.challenger.id
    ? oldGame?.opponent
    : oldGame?.challenger;

  const createGameResult: CreateGameResult = await createGame(
    challenger,
    opponent as Player,
    ctx.chat?.id.toString() || "",
    oldGame?.winningRounds || 1,
  );

  if (!createGameResult.success) {
    await ctx.reply(
      createGameResult.error || "Unknown error",
    );
    return;
  }

  // https://grammy.dev/plugins/keyboard#selectively-send-custom-keyboards
  const keyboard = new InlineKeyboard()
    .text("Accept Challenge", `accept_game:${createGameResult.game?.id}`);

  await ctx.reply(
    `🎲 @${challenger.username} has challenged @${opponent?.username} to a dice duel with ${
      oldGame?.winningRounds || 1
    } winning rounds! 🎲`,
    { reply_markup: keyboard },
  );
}
