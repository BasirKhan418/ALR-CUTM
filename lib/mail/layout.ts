const PAPER = "#F6F3EA"
const CARD = "#FFFdf7"
const INK = "#1C2B27"
const FOREST = "#2A4F45"
const MUTED = "#66716C"
const LINE = "#E6E0D2"
const CREAM = "#F3EEE0"

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

export function mailLayout(input: {
  preheader: string
  eyebrow: string
  title: string
  intro: string
  bodyHtml: string
  ctaLabel?: string
  ctaHref?: string
  footer: string
}): string {
  const button = input.ctaHref
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px">
        <tr>
          <td style="border-radius:10px;background:${FOREST}">
            <a href="${escapeHtml(input.ctaHref)}" style="display:inline-block;padding:13px 22px;font-family:Georgia,'Source Serif 4',serif;font-size:15px;font-weight:600;color:${PAPER};text-decoration:none;letter-spacing:0.01em">${escapeHtml(input.ctaLabel ?? "Open ALR")}</a>
          </td>
        </tr>
      </table>`
    : ""

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${escapeHtml(input.title)}</title>
</head>
<body style="margin:0;padding:0;background:${PAPER};color:${INK}">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(input.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};padding:32px 16px 48px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
          <tr>
            <td style="padding:8px 8px 22px">
              <p style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${FOREST}">Centurion University</p>
              <p style="margin:8px 0 0;font-family:Georgia,'Source Serif 4',serif;font-size:22px;font-weight:600;color:${INK}">ALR</p>
            </td>
          </tr>
          <tr>
            <td style="background:${CARD};border:1px solid ${LINE};border-radius:18px;padding:36px 32px 32px">
              <p style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${MUTED}">${escapeHtml(input.eyebrow)}</p>
              <h1 style="margin:10px 0 0;font-family:Georgia,'Source Serif 4',serif;font-size:28px;line-height:1.2;font-weight:600;color:${INK}">${escapeHtml(input.title)}</h1>
              <p style="margin:16px 0 0;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.65;color:${MUTED}">${escapeHtml(input.intro)}</p>
              ${button}
              ${input.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:22px 8px 0">
              <p style="margin:0;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;font-size:12px;line-height:1.6;color:${MUTED}">${escapeHtml(input.footer)}</p>
              <p style="margin:10px 0 0;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;font-size:12px;color:${MUTED}">Academic Learning Record · no password is ever created</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function factRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid ${LINE};font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${MUTED};width:34%">${escapeHtml(label)}</td>
    <td style="padding:10px 0;border-bottom:1px solid ${LINE};font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;font-size:15px;color:${INK}">${escapeHtml(value)}</td>
  </tr>`
}

export function pillRow(values: string[]): string {
  const pills = values
    .map(
      (value) =>
        `<span style="display:inline-block;margin:0 6px 6px 0;padding:5px 10px;border:1px solid ${LINE};border-radius:999px;background:${CREAM};font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;font-size:12px;color:${FOREST}">${escapeHtml(value)}</span>`
    )
    .join("")
  return `<tr>
    <td style="padding:10px 0 4px;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${MUTED};width:34%;vertical-align:top">Roles</td>
    <td style="padding:10px 0 4px">${pills}</td>
  </tr>`
}
