import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";
import { bot } from "../src/main.ts";
import { updates } from "./utils.test.ts";
import { setup } from "./utils.test.ts";
// test getPlayer:
// new user -> new player in db
// username change -> update player in db

await setup();

Deno.test("new game", async () => {
  //await bot.handleUpdate(updates.newGame);
  assert(1 === 1);
});
// await bot.handleUpdate(updates.newGame);
// TODO:
// user1 starts game
// user1 starts another game -> fails
// user2 accepts game
// user2 tries to start another game -> fails
