import { Bot, Context } from "../deps.ts";
import { newGameCommand } from "./handlers/newGame.ts";
import { listGamesCommand } from "./handlers/listGames.ts";
import { acceptGameHandler } from "./handlers/acceptGame.ts";
import { rollDiceHandler } from "./handlers/rollDice.ts";

export async function setupBot(bot: Bot) {
  bot.command("newgame", newGameCommand);
  bot.command("listgames", listGamesCommand);
  bot.on("callback_query:data", async (ctx) => {
    const [fnc, arg] = ctx.callbackQuery.data.split(":");
    if (fnc === "accept_game") {
      await acceptGameHandler(ctx, arg);
      return;
    }
    console.log("Unknown button event with payload", ctx.callbackQuery.data);
    await ctx.answerCallbackQuery(); // remove loading animation
  });
  bot.on("message:dice", rollDiceHandler);
  bot.on("message", async (ctx: Context) => {
    if (ctx.chat?.type === "private") {
      await ctx.reply(
        "This bot only works in groups where you can challenge other players.",
      );
    }
  });
  await bot.api.setMyCommands([
    { command: "newgame", description: "Create a new game" },
    { command: "listgames", description: "List all games in current chat" },
  ]);
}
