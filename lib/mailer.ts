import "server-only";
import nodemailer from "nodemailer";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

// 지연 생성 - 빌드 시점이 아니라 실제로 메일을 보내는 시점에 환경변수를
// 읽어서, 로컬/CI에서 GMAIL_* 값이 없어도 빌드가 깨지지 않게 한다.
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  return transporter;
}

export async function sendEmail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}) {
  await getTransporter().sendMail({
    from: `"LEGACY EDU" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    text,
  });
}
