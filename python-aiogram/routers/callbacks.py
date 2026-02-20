from __future__ import annotations

from aiogram import F, Router
from aiogram.types import CallbackQuery

from services.bot_logic import BotLogic

router = Router(name="callbacks")


@router.callback_query(F.data.startswith("open_test:"))
async def open_test_handler(callback: CallbackQuery, logic: BotLogic) -> None:
    await logic.handle_open_test(callback)


@router.callback_query(F.data.startswith("pay_scope:"))
async def pay_scope_handler(callback: CallbackQuery, logic: BotLogic) -> None:
    await logic.handle_payment_scope(callback)


@router.callback_query(F.data.startswith("pay_go:"))
async def pay_provider_handler(callback: CallbackQuery, logic: BotLogic) -> None:
    await logic.handle_payment_provider(callback)
