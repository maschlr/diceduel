import { Update } from "https://deno.land/x/grammy@v1.15.3/mod.ts";

import { bot } from "../src/main.ts";

let kv: Deno.Kv;
let outgoingRequests = [];

export const updates = {
  newGame: {
    "update_id": 42,
    "message": {
      "message_id": 42,
      "from": {
        "id": 1000,
        "is_bot": false,
        "first_name": "Challenger",
        "username": "challenger",
        "language_code": "en",
      },
      "chat": {
        "id": 42,
        "title": "Test Group",
        "type": "group",
        "all_members_are_administrators": true,
      },
      "date": 172000000,
      "text": "/newgame @opponent",
      "entities": [{ "offset": 0, "length": 8, "type": "bot_command" }, {
        "offset": 9,
        "length": 9,
        "type": "mention",
      }],
    },
  },
};

export function rollDice(value: number) {
  return {
    "update_id": 1000,
    "message": {
      "message_id": 42,
      "from": {
        "id": 42,
        "is_bot": false,
        "first_name": "Challenger",
        "username": "challenger",
        "language_code": "de",
      },
      "chat": {
        "id": 42,
        "title": "Test Group",
        "type": "group",
        "all_members_are_administrators": true,
      },
      "date": 172000000,
      "dice": { "emoji": "🎲", "value": value },
    },
  };
}

export async function setup() {
  kv = await Deno.openKv(":memory:");
  bot.api.config.use((_prev, method, payload, signal) => {
    outgoingRequests.push({ method, payload, signal });
    return Promise.resolve({
      ok: true,
      result: {},
    });
  });

  bot.botInfo = {
    id: 42,
    first_name: "Test Bot",
    is_bot: true,
    username: "bot",
    can_join_groups: true,
    can_read_all_group_messages: true,
    supports_inline_queries: false,
  };
  await bot.init();
}
