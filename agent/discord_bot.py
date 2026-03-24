import os

import discord
from discord.ext import commands
from dotenv import load_dotenv

from agent.summarizer import summarize_transcript
from scheduler import ReminderScheduler

load_dotenv()

TOKEN = os.getenv("DISCORD_TOKEN")
WELCOME_DM_ENABLED = os.getenv("DISCORD_WELCOME_DM_ENABLED", "true").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}
WELCOME_DM_TEMPLATE = os.getenv(
    "DISCORD_WELCOME_DM_TEMPLATE",
    "Namaste {member_name}. {server_name} me welcome.\n"
    "Main channel assistant bot hoon. !help bhejo aur commands dekho.",
)

intents = discord.Intents.default()
intents.message_content = True
intents.members = True

bot = commands.Bot(command_prefix="!", intents=intents, help_command=None)
reminder_scheduler = ReminderScheduler()


def _build_welcome_dm(member: discord.Member) -> str:
    fallback = (
        f"Namaste {member.display_name}. {member.guild.name} me welcome.\n"
        "Main channel assistant bot hoon. !help bhejo aur commands dekho."
    )
    try:
        return WELCOME_DM_TEMPLATE.format(
            member_name=member.display_name,
            server_name=member.guild.name,
            member_mention=member.mention,
        )
    except Exception:
        return fallback


@bot.event
async def on_ready():
    print(f"Bot online: {bot.user}")


@bot.event
async def on_member_join(member: discord.Member):
    if member.bot or not WELCOME_DM_ENABLED:
        return

    try:
        await member.send(_build_welcome_dm(member))
        print(f"Welcome DM sent to {member.id}")
    except discord.Forbidden:
        print(f"Cannot DM member {member.id}; DMs disabled.")
    except Exception as exc:
        print(f"Welcome DM failed for {member.id}: {exc}")


@bot.command(name="summary")
async def summary(ctx, *, text: str = None):
    """!summary <text> - Long text ka summary banaye"""
    if not text or len(text.strip()) < 20:
        await ctx.send("Usage: !summary <long text>")
        return

    await ctx.send("Summary generate kar raha hoon...")
    try:
        result = summarize_transcript(text, target_language="auto")
        content = (result.get("summary") or "No summary generated").strip()
        if len(content) > 1800:
            content = content[:1800] + "..."
        await ctx.send(content)
    except Exception as exc:
        await ctx.send(f"Summary error: {exc}")


@bot.command(name="remind")
async def remind(ctx, minutes: int = None, *, message: str = None):
    """!remind <minutes> <message> - Reminder schedule kare"""
    if minutes is None or not message:
        await ctx.send("Usage: !remind <minutes> <message>")
        return

    if minutes <= 0:
        await ctx.send("Minutes 0 se zyada hone chahiye.")
        return

    if minutes > 10080:
        await ctx.send("Max 10080 minutes (7 days) tak reminder set kar sakte ho.")
        return

    async def _callback():
        try:
            await ctx.send(f"Reminder: {ctx.author.mention} - {message}")
        except Exception as exc:
            print(f"Reminder send failed: {exc}")

    job_id = reminder_scheduler.schedule_in_minutes(minutes, _callback)
    await ctx.send(f"Reminder set for {minutes} minutes. ID: {job_id}")


@bot.command(name="help")
async def help_command(ctx):
    """!help - Available commands"""
    help_text = """
Channel Assistant - Discord Bot

Commands:
1. !ping - Bot status check
2. !summary <text> - AI summary generate kare
3. !remind <minutes> <message> - Reminder set kare
4. !help - Commands list
"""
    await ctx.send(help_text)


@bot.command(name="ping")
async def ping(ctx):
    """!ping - Bot online status"""
    await ctx.send("Bot online hai. Channel mode active.")


if __name__ == "__main__":
    if not TOKEN:
        raise RuntimeError("DISCORD_TOKEN is not set in environment")
    bot.run(TOKEN)
