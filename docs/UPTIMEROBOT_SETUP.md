# UptimeRobot — continuum.support

Production URL: **https://continuum.support**

## Monitor (already created)

| Field | Value |
|-------|--------|
| Monitor ID | `803135149` |
| Name | `continuum.support` |
| URL | `https://continuum.support` |
| Interval | 5 minutes |
| Type | HTTP(S) |

Use a **monitor-specific** API key only for that monitor. Use the **Main API key** for MCP / account-wide tools.

## Cursor MCP (local only)

Add to your user MCP config (`%USERPROFILE%\.cursor\mcp.json`). **Do not commit API keys to git.**

Replace `<MAIN_API_KEY>` with your UptimeRobot **Main API key** (Integrations & API → Main API Key):

```json
{
  "mcpServers": {
    "uptimerobot": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://mcp.uptimerobot.com/mcp",
        "--header",
        "Authorization: Bearer <MAIN_API_KEY>",
        "--header",
        "X-MCP-Content-Format: true"
      ]
    }
  }
}
```

Restart Cursor after saving. Example prompts:

- "List all monitors with status DOWN"
- "What's the uptime for monitor continuum.support over the last 7 days?"
- "Show incidents from the last 24 hours for monitor 803135149"

Reference: [UptimeRobot MCP Integration Guide](https://help.uptimerobot.com/en/articles/12928348-uptimerobot-mcp-integration-guide)

## Optional extra monitors

| URL | Why |
|-----|-----|
| `https://continuum.support/sign-in` | Confirms auth page loads |
| `https://continuum.support/api/health` | Lightweight API health probe |

## Security

- Rotate keys if they were pasted in chat or committed anywhere.
- Store keys in Cursor MCP config or a password manager only.
- Never add real keys to `.env`, `mcp.json` in the repo, or documentation.
