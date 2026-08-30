# اتصال NotebookLM به Claude

NotebookLM هنوز API عمومی ندارد. راه عملی اتصال، یک **MCP server غیررسمی** است
(`notebooklm-py`) که با کوکی‌های نشست گوگل شما به NotebookLM وصل می‌شود و
نوت‌بوک‌ها را به‌صورت ابزار در اختیار Claude می‌گذارد.

## راه‌اندازی

روی کامپیوتر خودتان (نه در سشن ریموت):

```bash
bash notebooklm/setup.sh
```

این اسکریپت سه کار می‌کند:

1. `notebooklm-py` را با `uv` نصب می‌کند.
2. `notebooklm login` را اجرا می‌کند — یک پنجره مرورگر باز می‌شود و شما با حساب
   گوگل خودتان وارد می‌شوید. کوکی‌ها در `~/.notebooklm/profiles/default/` ذخیره
   می‌شوند و از دستگاه شما خارج نمی‌شوند.
3. سرور را با `claude mcp add` در Claude Code ثبت می‌کند.

اگر `uv` ندارید:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

برای ثبت سرور فقط در همین ریپو به‌جای سراسری:

```bash
SCOPE=project bash notebooklm/setup.sh
```

فایل `.mcp.json` در ریشه ریپو هم همین سرور را برای سشن‌هایی که در این پوشه باز
می‌شوند اعلام می‌کند.

## Claude Desktop

در `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "notebooklm": {
      "command": "notebooklm-mcp",
      "args": ["--transport", "stdio"]
    }
  }
}
```

اگر `notebooklm-mcp` در PATH اپلیکیشن نبود، مسیر کامل را بگذارید
(`~/.local/bin/notebooklm-mcp`).

## بررسی سلامت

```bash
notebooklm auth check   # وضعیت احراز هویت
notebooklm list         # فهرست نوت‌بوک‌ها
notebooklm doctor       # عیب‌یابی پروفایل و نشست
```

بعد از اتصال، ابزارهای NotebookLM در Claude در دسترس‌اند: فهرست و ساخت نوت‌بوک،
افزودن منبع (فایل، لینک، Google Drive)، پرسش از نوت‌بوک، یادداشت‌ها، و
artifactها مثل Audio Overview و Mind Map.

## نکته‌ها

- این کلاینت **غیررسمی** است و روی APIهای مستندنشده NotebookLM کار می‌کند؛ ممکن
  است گوگل بدون اطلاع قبلی آن را بشکند.
- کوکی نشست گوگل یک اعتبارنامه کامل است. آن را در سشن‌های ریموت، CI یا هر جای
  مشترک قرار ندهید.
- نشست منقضی می‌شود؛ با `notebooklm login` دوباره وارد شوید.

## اتصال از سشن‌های ریموت (اختیاری)

برای اینکه Claude روی وب/موبایل هم دسترسی داشته باشد، سرور را با ترنسپورت HTTP
روی ماشین خودتان اجرا کنید و پشت یک تونل (Cloudflare Tunnel یا Tailscale) قرار
دهید، سپس آن را به‌عنوان یک custom connector در claude.ai اضافه کنید:

```bash
NOTEBOOKLM_MCP_TOKEN="<یک توکن تصادفی قوی>" notebooklm-mcp --transport http --port 9420
```

بدون توکن و تونل، سرور را روی اینترنت باز نکنید.
