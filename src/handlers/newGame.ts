import { Context, InlineKeyboard } from "../../deps.ts";
import { createGame, getPlayerFromContext } from "../storage/kv.ts";
import { CreateGameResult, Player } from "../models/game.ts";

export async function newGameCommand(ctx: Context) {
  if (ctx.chat?.type === "private") {
    await ctx.reply(
      "This command only works in groups where you can challenge other players.",
    );
    return;
  }

  if (!ctx.match) {
    await ctx.reply(
      "Please mention the player you want to challenge\\. \\(Usage: `/newgame @<opponent> [number of winning rounds]`\\)",
      { parse_mode: "MarkdownV2" },
    );
    return;
  }

  const challenger: Player = await getPlayerFromContext(ctx);
  const args = ctx.match.toString().split(" ");
  const opponentUsernameOrFirstName = args[0].replace("@", "");
  // extract the number of winning rounds from the ctx as a possible 2nd argument
  const winningRounds = args.length > 1 ? parseInt(args[1]) : 1;

  if (isNaN(winningRounds)) {
    await ctx.reply("The number of winning rounds must be a number!");
    return;
  }

  if (
    challenger.username === opponentUsernameOrFirstName ||
    challenger.first_name === opponentUsernameOrFirstName
  ) {
    await ctx.reply("You can't challenge yourself!");
    return;
  }

  // this might be a username or first name
  const opponent: Player = {
    username: opponentUsernameOrFirstName,
  };
  const createGameResult: CreateGameResult = await createGame(
    challenger,
    opponent,
    ctx.chat?.id.toString() || "",
    winningRounds,
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
    `🎲 @${
      challenger.username || challenger.first_name
    } has challenged @${opponent.username} to a dice duel with ${winningRounds} winning rounds! 🎲`,
    { reply_markup: keyboard, protect_content: true },
  );
}
