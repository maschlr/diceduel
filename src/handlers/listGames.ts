import { Context } from "../../deps.ts";
import { listGamesInChat } from "../storage/kv.ts";
import { GameState } from "../models/game.ts";

export async function listGamesCommand(ctx: Context) {
  if (ctx.chat?.type === "private") {
    await ctx.reply("This command only works in groups.");
    return;
  }

  const chatId = ctx.chat?.id.toString();
  if (!chatId) {
    throw new Error("Chat ID not found in context");
  }
  const games = await listGamesInChat(chatId as string, [
    GameState.Initiated,
    GameState.Accepted,
    GameState.Finished,
  ]);

  if (games.length === 0) {
    await ctx.reply("There are no active games in this channel.");
    return;
  }

  const gameList = games.map((game) => {
    let status = "";
    switch (game.state) {
      case GameState.Initiated:
        status = "Waiting for acceptance";
        break;
      case GameState.Accepted:
        status = "In progress";
        break;
      case GameState.Finished:
        status = "Finished";
        break;
    }
    return `@${game.challenger.username} vs @${game.opponent.username} - ${status}`;
  }).join("\n");

  await ctx.reply(`Active games in this channel:\n\n${gameList}`);
}
