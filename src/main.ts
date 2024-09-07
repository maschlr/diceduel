import { Bot, webhookCallback } from "../deps.ts";
import { setupBot } from "./bot.ts";
import { logErrorToAdminChat } from "./handlers/admin.ts";

export const bot = new Bot(Deno.env.get("BOT_TOKEN") || "");

await setupBot(bot);

const webhookUrl = Deno.env.get("WEBHOOK_URL") || "";
if (webhookUrl) {
  // Set the webhook
  await bot.api.setWebhook(webhookUrl);

  // Create a custom handler that wraps the webhookCallback
  const handler = async (request: Request): Promise<Response> => {
    try {
      const response = await webhookCallback(bot, "std/http")(request);
      return response;
    } catch (error) {
      try {
        const errorMessage = JSON.parse(error);
        if (errorMessage.error_code) {
          console.error("Error in webhook handler:", errorMessage);
          await logErrorToAdminChat(errorMessage);
        }
      } catch (_e) {
        console.error("Error parsing JSON body:", error);
      }
    }
    return new Response("OK", { status: 500 });
  };

  // Start the bot with the custom handler
  Deno.serve(handler);
} else {
  bot.start();
  bot.catch(console.error);
}
