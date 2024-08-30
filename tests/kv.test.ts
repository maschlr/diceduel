import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import { Game, GameState } from "../models/game.ts";
import { determineScore, listGamesInChat, updateGameRoll } from "./kv.ts";
import { Context } from "../../deps.ts";
import { Player, RollStatus } from "../models/game.ts";

Deno.test("determineScore", async (t) => {
  await t.step("should return 0-0 for empty rolls", () => {
    const game: Game = {
      id: "test",
      challenger: { id: "1", username: "challenger" },
      opponent: { id: "2", username: "opponent" },
      state: GameState.Accepted,
      winningRounds: 3,
      challengerRolls: [],
      opponentRolls: [],
      coin: null,
      amount: null,
    };

    const result = determineScore(game);
    assertEquals(result, { challengerScore: 0, opponentScore: 0 });
  });

  await t.step("should correctly score when challenger wins all rounds", () => {
    const game: Game = {
      // ... other properties ...
      challengerRolls: [6, 5, 4],
      opponentRolls: [1, 2, 3],
    };

    const result = determineScore(game);
    assertEquals(result, { challengerScore: 3, opponentScore: 0 });
  });

  await t.step("should correctly score when opponent wins all rounds", () => {
    const game: Game = {
      // ... other properties ...
      challengerRolls: [1, 2, 3],
      opponentRolls: [6, 5, 4],
    };

    const result = determineScore(game);
    assertEquals(result, { challengerScore: 0, opponentScore: 3 });
  });

  await t.step("should correctly score mixed results", () => {
    const game: Game = {
      // ... other properties ...
      challengerRolls: [4, 2, 6, 1],
      opponentRolls: [3, 5, 6, 2],
    };

    const result = determineScore(game);
    assertEquals(result, { challengerScore: 1, opponentScore: 2 });
  });

  await t.step("should handle ties correctly", () => {
    const game: Game = {
      // ... other properties ...
      challengerRolls: [3, 4, 5, 6],
      opponentRolls: [3, 4, 5, 6],
    };

    const result = determineScore(game);
    assertEquals(result, { challengerScore: 0, opponentScore: 0 });
  });

  await t.step("should handle unequal number of rolls", () => {
    const game: Game = {
      // ... other properties ...
      challengerRolls: [4, 5, 6],
      opponentRolls: [3, 6],
    };

    const result = determineScore(game);
    assertEquals(result, { challengerScore: 1, opponentScore: 1 });
  });
});

Deno.test("updateGameRoll", async (t) => {
  const mockCtx: Context = {
    chat: { id: "123" },
  } as Context;

  const mockKv = await Deno.openKv(":memory:");
  const challenger: Player = { id: "1", username: "challenger" };
  const opponent: Player = { id: "2", username: "opponent" };
  const game: Game = {
    id: "test",
    challenger,
    opponent,
    state: GameState.Accepted,
    winningRounds: 3,
    challengerRolls: [],
    opponentRolls: [],
    coin: null,
    amount: null,
  };

  await t.step("should handle opening roll for challenger", async () => {
    const result = await updateGameRoll(mockCtx, game, challenger, 4, mockKv);
    assertEquals(result.status, RollStatus.open);
    assertEquals(result.game.challengerRolls, [4]);
    assertEquals(result.game.opponentRolls, []);
  });

  await t.step("should handle winning roll for challenger", async () => {
    game.challengerRolls = [];
    game.opponentRolls = [3];

    const result = await updateGameRoll(mockCtx, game, challenger, 5, mockKv);
    assertEquals(result.status, RollStatus.win);
    assertEquals(result.game.challengerRolls, [5]);
    assertEquals(result.game.opponentRolls, [3]);
  });

  await t.step("should handle losing roll for opponent", async () => {
    game.challengerRolls = [4];
    game.opponentRolls = [];

    const result = await updateGameRoll(mockCtx, game, opponent, 3, mockKv);
    assertEquals(result.status, RollStatus.loose);
    assertEquals(result.game.challengerRolls, [4]);
    assertEquals(result.game.opponentRolls, [3]);
  });

  await t.step("should handle tie", async () => {
    game.challengerRolls = [4];
    game.opponentRolls = [];

    const result = await updateGameRoll(mockCtx, game, opponent, 4, mockKv);
    assertEquals(result.status, RollStatus.tie);
    assertEquals(result.game.challengerRolls, [4]);
    assertEquals(result.game.opponentRolls, [4]);
  });

  await t.step("should handle round open", async () => {
    game.winningRounds = 3;
    game.challengerRolls = [6, 5];
    game.opponentRolls = [4, 3];

    const result = await updateGameRoll(mockCtx, game, challenger, 6, mockKv);
    assertEquals(result.status, RollStatus.open, "Roll should open the game");
    assertEquals(
      result.game.state,
      GameState.Accepted,
      "Game should be accepted",
    );
    assertEquals(
      result.game.challengerRolls,
      [6, 5, 6],
      "Challenger rolls should be [6, 5, 6]",
    );
    assertEquals(
      result.game.opponentRolls,
      [4, 3],
      "Opponent rolls should be [4, 3]",
    );
  });

  await t.step("should handle game finish", async () => {
    game.winningRounds = 3;
    game.challengerRolls = [6, 5];
    game.opponentRolls = [4, 3, 2];

    const result = await updateGameRoll(mockCtx, game, challenger, 6, mockKv);
    assertEquals(
      result.status,
      RollStatus.closed,
      "Roll should close the game",
    );
    assertEquals(
      result.game.state,
      GameState.Finished,
      "Game should be accepted",
    );
    assertEquals(
      result.game.challengerRolls,
      [6, 5, 6],
      "Challenger rolls should be [6, 5, 6]",
    );
    assertEquals(
      result.game.opponentRolls,
      [4, 3, 2],
      "Opponent rolls should be [4, 3, 2]",
    );
  });

  await t.step("should reject invalid roll", async () => {
    game.challengerRolls = [4];
    game.opponentRolls = [];

    const result = await updateGameRoll(mockCtx, game, challenger, 5, mockKv);
    assertEquals(result.status, RollStatus.invalid);
    assertEquals(result.game.challengerRolls, [4]);
    assertEquals(result.game.opponentRolls, []);
  });

  await mockKv.close();
});

Deno.test("listGamesInChat", async (t) => {
  const mockKv = await Deno.openKv(":memory:");
  const chatId = "test-chat-123";

  const testGames: Game[] = [
    {
      id: "game1",
      challenger: { id: "1", username: "challenger1" },
      opponent: { id: "2", username: "opponent1" },
      state: GameState.Initiated,
      winningRounds: 3,
      challengerRolls: [],
      opponentRolls: [],
      coin: null,
      amount: null,
    },
    {
      id: "game2",
      challenger: { id: "3", username: "challenger2" },
      opponent: { id: "4", username: "opponent2" },
      state: GameState.Accepted,
      winningRounds: 3,
      challengerRolls: [4],
      opponentRolls: [3],
      coin: null,
      amount: null,
    },
    {
      id: "game3",
      challenger: { id: "5", username: "challenger3" },
      opponent: { id: "6", username: "opponent3" },
      state: GameState.Finished,
      winningRounds: 3,
      challengerRolls: [6, 5, 4],
      opponentRolls: [3, 2, 1],
      coin: null,
      amount: null,
    },
  ];

  // Set up test data in the mock KV store
  for (const game of testGames) {
    await mockKv.set(["games", chatId, game.id], game);
  }

  await t.step(
    "should list all initiated and accepted games by default",
    async () => {
      const games = await listGamesInChat(chatId, undefined, mockKv);
      assertEquals(games.length, 2);
      assertEquals(games[0].id, "game1");
      assertEquals(games[1].id, "game2");
    },
  );

  await t.step("should list only initiated games when specified", async () => {
    const games = await listGamesInChat(chatId, [GameState.Initiated], mockKv);
    assertEquals(games.length, 1);
    assertEquals(games[0].id, "game1");
  });

  await t.step("should list only accepted games when specified", async () => {
    const games = await listGamesInChat(chatId, [GameState.Accepted], mockKv);
    assertEquals(games.length, 1);
    assertEquals(games[0].id, "game2");
  });

  await t.step("should list only finished games when specified", async () => {
    const games = await listGamesInChat(chatId, [GameState.Finished], mockKv);
    assertEquals(games.length, 1);
    assertEquals(games[0].id, "game3");
  });

  await t.step("should list multiple game states when specified", async () => {
    const games = await listGamesInChat(chatId, [
      GameState.Initiated,
      GameState.Finished,
    ], mockKv);
    assertEquals(games.length, 2);
    assertEquals(games[0].id, "game1");
    assertEquals(games[1].id, "game3");
  });

  await t.step(
    "should return an empty array when no games match the criteria",
    async () => {
      const games = await listGamesInChat(
        "non-existent-chat",
        undefined,
        mockKv,
      );
      assertEquals(games.length, 0);
    },
  );

  await mockKv.close();
});
