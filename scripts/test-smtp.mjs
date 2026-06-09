import "dotenv/config";
import nodemailer from "nodemailer";

const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;

if (!user || !pass) {
  console.error("SMTP_USER/SMTP_PASS não configurados.");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: process.env.SMTP_SECURE === "true",
  auth: { user, pass },
});

await transporter.verify();
console.log("SMTP_VERIFY_OK", user);

const from = `Neurobots Manutenção <${user}>`;
const info = await transporter.sendMail({
  from,
  to: user,
  replyTo: user,
  subject: "Teste SYS-TECH — entrega de e-mail",
  text: "E-mail de teste do sistema de manutenção Neurobots. Se chegou na caixa de entrada, a configuração SMTP está correta.",
  html: "<p>E-mail de teste do sistema de manutenção <strong>Neurobots</strong>.</p><p>Se chegou na caixa de entrada, a configuração SMTP está correta.</p>",
  headers: { "X-Priority": "3", Importance: "normal", "X-Mailer": "Neurobots SYS-TECH" },
});

console.log("SMTP_SEND_OK", info.messageId);
