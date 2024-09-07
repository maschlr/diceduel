import { bot } from "../main.ts";

const adminChatId = Deno.env.get("ADMIN_CHAT_ID") || "";

export async function logErrorToAdminChat(error: string) {
  await bot.api.sendMessage(adminChatId, error);
}
