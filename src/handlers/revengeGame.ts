import { Context, InlineKeyboard } from "../../deps.ts";
import { createGame, getGame, getPlayer } from "../storage/kv.ts";
import { CreateGameResult, Player } from "../models/game.ts";

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

  const challenger = await getPlayer(ctx);
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
