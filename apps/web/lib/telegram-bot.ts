export const STUDENT_MENU_ROWS = [
  ["📝 Test ishlash", "💳 To'lov qilish"],
  ["📊 Natijalarim", "✍️ E'tiroz bildirish"],
] as const;

export const PARENT_MENU_ROWS = [
  ["📘 O'quvchi natijalari", "💸 Qarzdorlik"],
  ["✍️ E'tiroz bildirish"],
] as const;

type TelegramReplyMarkup = {
  keyboard: Array<Array<{ text: string }>>;
  resize_keyboard?: boolean;
  one_time_keyboard?: boolean;
};

function buildReplyKeyboard(rows: readonly (readonly string[])[]): TelegramReplyMarkup {
  return {
    keyboard: rows.map((row) => row.map((text) => ({ text }))),
    resize_keyboard: true,
  };
}

export function studentReplyKeyboard(): TelegramReplyMarkup {
  return buildReplyKeyboard(STUDENT_MENU_ROWS);
}

export function parentReplyKeyboard(): TelegramReplyMarkup {
  return buildReplyKeyboard(PARENT_MENU_ROWS);
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  opts?: { replyMarkup?: TelegramReplyMarkup },
): Promise<boolean> {
  const token = process.env.BOT_TOKEN;
  if (!token) return false;

  try {
    const payload: Record<string, unknown> = {
      chat_id: chatId,
      text,
    };

    if (opts?.replyMarkup) {
      payload.reply_markup = opts.replyMarkup;
    }

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const raw = await response.text();
      console.error("TELEGRAM_SEND_MESSAGE_HTTP_ERROR", response.status, raw);
      return false;
    }

    const data = (await response.json()) as { ok?: boolean };
    if (!data.ok) {
      console.error("TELEGRAM_SEND_MESSAGE_API_ERROR", data);
      return false;
    }

    return true;
  } catch (error) {
    console.error("TELEGRAM_SEND_MESSAGE_ERROR", error);
    return false;
  }
}
