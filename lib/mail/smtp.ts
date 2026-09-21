import net from "node:net"
import tls from "node:tls"
import { getEnv } from "@/lib/config/env"

export async function sendSmtp(input: {
  to: string
  subject: string
  text: string
  html?: string
}): Promise<void> {
  const env = getEnv()
  const host = env.SMTP_HOST
  if (!host) return

  const implicitTls = env.SMTP_PORT === 465
  let socket: net.Socket = await connectSmtp(host, env.SMTP_PORT, implicitTls)
  try {
    await expect(socket, /220/)
    await command(socket, `EHLO ${ehloHost(env.APP_URL)}`, /250/)
    if (!implicitTls) {
      await command(socket, "STARTTLS", /220/)
      socket = await upgradeTls(socket, host)
      await command(socket, `EHLO ${ehloHost(env.APP_URL)}`, /250/)
    }
    const password = smtpPassword(env.SMTP_HOST, env.SMTP_PASS)
    if (env.SMTP_USER && password) {
      await authenticate(socket, env.SMTP_USER, password)
    }
    await command(socket, `MAIL FROM:<${envelopeAddress(env.SMTP_FROM)}>`, /250/)
    await command(socket, `RCPT TO:<${input.to}>`, /250/)
    await command(socket, "DATA", /354/)
    socket.write(buildMime(env.SMTP_FROM, input))
    await expect(socket, /250/)
    await command(socket, "QUIT", /221/)
  } finally {
    socket.destroy()
  }
}

function ehloHost(appUrl: string): string {
  try {
    const { hostname } = new URL(appUrl)
    if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
      return hostname
    }
  } catch {
    // fall through
  }
  return "alr.local"
}

function smtpPassword(host: string | undefined, password: string | undefined) {
  if (!password) return undefined
  if (host?.includes("gmail.com") || host?.includes("googlemail.com")) {
    return password.replace(/\s+/g, "")
  }
  return password
}

async function authenticate(
  socket: net.Socket,
  user: string,
  password: string
): Promise<void> {
  const plain = Buffer.from(`\u0000${user}\u0000${password}`).toString("base64")
  try {
    await command(socket, `AUTH PLAIN ${plain}`, /235/)
  } catch {
    await command(socket, "AUTH LOGIN", /334/)
    await command(socket, Buffer.from(user).toString("base64"), /334/)
    await command(socket, Buffer.from(password).toString("base64"), /235/)
  }
}

function envelopeAddress(from: string): string {
  const match = from.match(/<([^>]+)>/)
  return (match?.[1] ?? from).trim()
}

function fromHeader(from: string): string {
  if (from.includes("<")) return from
  return `"ALR | Centurion University" <${from}>`
}

function encodeHeader(value: string): string {
  const safe = value.replace(/[\r\n]+/g, " ").trim()
  if (/^[\x20-\x7E]*$/.test(safe)) return safe
  return `=?UTF-8?B?${Buffer.from(safe, "utf8").toString("base64")}?=`
}

function dotStuff(body: string): string {
  return body.replace(/^\./gm, "..")
}

function rfc2822Date(date = new Date()): string {
  return date.toUTCString().replace(/GMT$/, "+0000")
}

function buildMime(
  from: string,
  input: { to: string; subject: string; text: string; html?: string }
): string {
  const domain = envelopeAddress(from).split("@")[1] || "localhost"
  const headers = [
    `From: ${fromHeader(from)}`,
    `To: ${input.to.replace(/[\r\n]+/g, "")}`,
    `Subject: ${encodeHeader(input.subject)}`,
    `Date: ${rfc2822Date()}`,
    `Message-ID: <otp-${Date.now()}.${Math.random().toString(36).slice(2)}@${domain}>`,
    "MIME-Version: 1.0",
  ]

  if (!input.html) {
    return [
      ...headers,
      "Content-Type: text/plain; charset=utf-8",
      "",
      dotStuff(input.text),
      ".",
      "",
    ].join("\r\n")
  }

  const boundary = `alr-${Date.now().toString(36)}`
  return [
    ...headers,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    dotStuff(input.text),
    `--${boundary}`,
    "Content-Type: text/html; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    dotStuff(input.html),
    `--${boundary}--`,
    ".",
    "",
  ].join("\r\n")
}

function connectSmtp(
  host: string,
  port: number,
  implicitTls: boolean
): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    const socket = implicitTls
      ? tls.connect({ host, port, servername: host }, () => resolve(socket))
      : net.connect({ host, port }, () => resolve(socket))
    socket.setEncoding("utf8")
    socket.once("error", reject)
  })
}

function upgradeTls(socket: net.Socket, host: string): Promise<tls.TLSSocket> {
  return new Promise((resolve, reject) => {
    const secure = tls.connect({ socket, servername: host }, () => resolve(secure))
    secure.setEncoding("utf8")
    secure.once("error", reject)
  })
}

function command(
  socket: net.Socket,
  line: string,
  expectCode: RegExp
): Promise<string> {
  socket.write(`${line}\r\n`)
  return expect(socket, expectCode)
}

function smtpError(buffer: string): Error {
  const snippet = buffer.replace(/\s+/g, " ").trim().slice(0, 220)
  if (/535/.test(buffer)) {
    return new Error(`SMTP auth failed: ${snippet}`)
  }
  if (/554|553|550/.test(buffer)) {
    return new Error(
      `SMTP rejected the message: ${snippet}. If this is Amazon SES, verify SMTP_FROM and the recipient (sandbox can only send to verified emails).`
    )
  }
  return new Error(`SMTP unexpected: ${snippet}`)
}

function expect(socket: net.Socket, expectCode: RegExp): Promise<string> {
  return new Promise((resolve, reject) => {
    let buffer = ""
    const timer = setTimeout(() => reject(new Error("SMTP timeout")), 12_000)
    const onData = (chunk: string) => {
      buffer += chunk
      if (!/\r?\n$/.test(buffer)) return
      const lines = buffer.trim().split(/\r?\n/)
      const last = lines[lines.length - 1] ?? ""
      if (/^\d{3}-/.test(last)) return
      clearTimeout(timer)
      socket.off("data", onData)
      socket.off("error", onError)
      if (!expectCode.test(buffer)) {
        reject(smtpError(buffer))
        return
      }
      resolve(buffer)
    }
    const onError = (error: Error) => {
      clearTimeout(timer)
      socket.off("data", onData)
      reject(error)
    }
    socket.on("data", onData)
    socket.once("error", onError)
  })
}
