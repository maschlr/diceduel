import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import { Context } from "../deps.ts";
import {
  createGame,
  getGame,
  getPlayerFromContext,
  listGamesInChat,
  updateGame,
} from "../src/storage/kv.ts";
import { GameState, Player } from "../src/models/game.ts";

let kv: Deno.Kv;

Deno.test("DB operations", async (t) => {
  await t.step("Initialize DB", async () => {
    kv = await Deno.openKv(":memory:");
  });

  await t.step("Create new Player in DB", async () => {
    const ctx: Context = {
      from: { id: "123", username: "testuser" },
    } as Context;

    const player = await getPlayerFromContext(ctx, kv);
    assertEquals(player.id, "123");
    assertEquals(player.username, "testuser");
  });

  await t.step("Update Player username", async () => {
    const ctx: Context = {
      from: { id: "123", username: "updateduser" },
    } as Context;

    const playerBefore = await getPlayerFromContext(
      { from: { id: "123", username: "testuser" } } as Context,
      kv,
    );
    assertEquals(playerBefore.username, "testuser");

    const playerAfter = await getPlayerFromContext(ctx, kv);
    assertEquals(playerAfter.username, "updateduser");
  });

  await t.step("Create new game", async () => {
    const challenger: Player = { id: "123", username: "challenger" };
    const opponent: Player = { id: "456", username: "opponent" };
    const chatId = "789";
    const winningRounds = 1;

    const createGameResult = await createGame(
      challenger,
      opponent,
      chatId,
      winningRounds,
      kv,
    );
    assertEquals(createGameResult.success, true);
    assertEquals(createGameResult.game.challenger, challenger);
    assertEquals(createGameResult.game.opponent, opponent);
    assertEquals(createGameResult.game.state, GameState.Initiated);
    assertEquals(createGameResult.game.winningRounds, 1);

    const game = await getGame(
      { chat: { id: "789" } } as Context,
      createGameResult.game.id,
      kv,
    );
    assertEquals(game.challenger, challenger);
    assertEquals(game.opponent, opponent);
    assertEquals(game.state, GameState.Initiated);
    assertEquals(game.winningRounds, 1);
  });

  await t.step("Accept game by opponent", async () => {
    const ctx: Context = {
      chat: { id: "789" },
    } as Context;

    const games = await listGamesInChat(ctx.chat.id, [GameState.Initiated], kv);
    assertEquals(games.length, 1, "There should be 1 game in initiated state");

    const game = games[0];
    assertEquals(
      game.state,
      GameState.Initiated,
      "Game should be in initiated state",
    );

    game.state = GameState.Accepted;
    await updateGame(ctx, game, kv);

    const updatedGame = await getGame(ctx, game.id, kv);
    assertEquals(
      updatedGame?.state,
      GameState.Accepted,
      "Game should be in accepted state",
    );
  });

  await t.step("Clean up", async () => {
    for await (const entry of kv.list({ prefix: [] })) {
      await kv.delete(entry.key);
    }
    await kv.close();
  });
});
