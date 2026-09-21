import net from "node:net"
import tls from "node:tls"
import { getEnv, isSmtpConfigured } from "@/lib/config/env"

export async function deliverOtpEmail(to: string, code: string): Promise<void> {
  const env = getEnv()
  const minutes = Math.max(1, Math.round(env.OTP_TTL_SECONDS / 60))
  const text = `Your ALR sign-in code is ${code}. It expires in ${minutes} minutes.`

  if (!isSmtpConfigured(env)) {
    console.log(`[otp] ${to} ${code}`)
    return
  }

  await sendSmtp({
    to,
    subject: "ALR sign-in code",
    text,
  })
}

async function sendSmtp(input: {
  to: string
  subject: string
  text: string
}): Promise<void> {
  const env = getEnv()
  const host = env.SMTP_HOST
  if (!host) return

  const socket = await connectSmtp(host, env.SMTP_PORT)
  try {
    await expect(socket, /220/)
    await command(socket, `EHLO alr.local`, /250/)
    if (env.SMTP_PORT !== 465) {
      await command(socket, "STARTTLS", /220/)
      const secure = await upgradeTls(socket, host)
      await expect(secure, /220|250/)
      await command(secure, `EHLO alr.local`, /250/)
      if (env.SMTP_USER && env.SMTP_PASS) {
        await command(secure, "AUTH LOGIN", /334/)
        await command(secure, Buffer.from(env.SMTP_USER).toString("base64"), /334/)
        await command(secure, Buffer.from(env.SMTP_PASS).toString("base64"), /235/)
      }
      await command(secure, `MAIL FROM:<${env.SMTP_FROM}>`, /250/)
      await command(secure, `RCPT TO:<${input.to}>`, /250/)
      await command(secure, "DATA", /354/)
      secure.write(
        [
          `From: ${env.SMTP_FROM}`,
          `To: ${input.to}`,
          `Subject: ${input.subject}`,
          "Content-Type: text/plain; charset=utf-8",
          "",
          input.text,
          ".",
          "",
        ].join("\r\n")
      )
      await expect(secure, /250/)
      await command(secure, "QUIT", /221/)
      secure.end()
      return
    }
  } finally {
    socket.destroy()
  }
}

function connectSmtp(host: string, port: number): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    const socket =
      port === 465
        ? tls.connect({ host, port, servername: host }, () => resolve(socket))
        : net.connect({ host, port }, () => resolve(socket))
    socket.setEncoding("utf8")
    socket.once("error", reject)
  })
}

function upgradeTls(socket: net.Socket, host: string): Promise<tls.TLSSocket> {
  return new Promise((resolve, reject) => {
    const secure = tls.connect(
      { socket, servername: host },
      () => resolve(secure)
    )
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

function expect(socket: net.Socket, expectCode: RegExp): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("SMTP timeout")), 8000)
    const onData = (chunk: string) => {
      clearTimeout(timer)
      socket.off("error", onError)
      if (!expectCode.test(chunk)) {
        reject(new Error(`SMTP unexpected: ${chunk.slice(0, 180)}`))
        return
      }
      resolve(chunk)
    }
    const onError = (error: Error) => {
      clearTimeout(timer)
      reject(error)
    }
    socket.once("data", onData)
    socket.once("error", onError)
  })
}
