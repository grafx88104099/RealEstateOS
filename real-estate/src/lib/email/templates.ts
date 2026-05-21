// Email template-үүд. HTML-ийг плэйн string-ээр буцаана — React Email хараахан хэрэгсэхгүй.
// Бүх template нь nemi.mn брэнддэй, mobile-friendly inline CSS-тэй.

const BRAND = "nemi.mn";
const SUPPORT_EMAIL = "hello@nemi.mn";

function wrap(title: string, body: string): string {
  return `<!doctype html>
<html lang="mn">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1f2937;">
  <div style="max-width:520px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:16px;padding:32px 28px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
      <div style="font-weight:800;font-size:22px;letter-spacing:-0.02em;color:#111827;margin-bottom:24px;">
        ${BRAND}
      </div>
      ${body}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 16px;" />
      <p style="font-size:12px;color:#9ca3af;margin:0;">
        Энэ имэйл нь ${BRAND} платформоос автомат илгээгдсэн. Лавлахын тулд
        <a href="mailto:${SUPPORT_EMAIL}" style="color:#6366f1;text-decoration:none;">${SUPPORT_EMAIL}</a>-руу хариу бичнэ үү.
      </p>
    </div>
  </div>
</body>
</html>`;
}

function button(url: string, label: string): string {
  return `<a href="${url}" style="display:inline-block;background:linear-gradient(90deg,#4f46e5,#7c3aed);color:#ffffff;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:15px;">${escapeHtml(label)}</a>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Хэрэглэгчийн оруулсан текстээс URL-уудыг нь хасна — phishing/spam payload-аас sa-г хамгаална.
// http(s):// эсвэл www. эхэлсэн линкүүдийг "[link removed]" гэж орлуулна.
function stripUrls(s: string): string {
  return s
    .replace(/\bhttps?:\/\/\S+/gi, "[link removed]")
    .replace(/\bwww\.\S+/gi, "[link removed]");
}

// Subject талбарт CRLF орохоос сэргийлнэ (header injection).
function sanitizeSubject(s: string): string {
  return s.replace(/[\r\n]+/g, " ").slice(0, 200);
}

// 1. Verify email — бүртгэлийн дараа эхлээд илгээгдэнэ
export function verifyEmailTemplate(args: {
  officeName: string;
  ownerName: string;
  verifyUrl: string;
}) {
  const subject = sanitizeSubject(`${args.officeName} — имэйлээ баталгаажуулна уу`);
  const html = wrap(
    subject,
    `
    <h1 style="font-size:20px;margin:0 0 16px;color:#111827;">Сайн байна уу, ${escapeHtml(args.ownerName)}!</h1>
    <p style="font-size:15px;line-height:1.6;margin:0 0 20px;">
      Та <strong>${escapeHtml(args.officeName)}</strong> оффисыг ${BRAND} платформ дээр нээх хүсэлт илгээлээ.
      Имэйл хаягаа баталгаажуулсны дараа таны хүсэлт манай админ багт шилжих болно.
    </p>
    <div style="text-align:center;margin:28px 0;">
      ${button(args.verifyUrl, "Имэйлээ баталгаажуулах")}
    </div>
    <p style="font-size:13px;color:#6b7280;margin:0 0 8px;">
      Эсвэл доорх холбоосыг хөтчид хуулна уу:
    </p>
    <p style="font-size:12px;color:#6366f1;word-break:break-all;margin:0 0 16px;">${escapeHtml(args.verifyUrl)}</p>
    <p style="font-size:13px;color:#9ca3af;margin:0;">
      Энэ холбоос 24 цагт хүчинтэй. Та энэ хүсэлтийг илгээгээгүй бол үл хэрэгсээрэй.
    </p>
  `,
  );
  return { subject, html };
}

// 2. Application received — verify хийсний дараа
export function applicationReceivedTemplate(args: {
  officeName: string;
  ownerName: string;
}) {
  const subject = sanitizeSubject(`${args.officeName} — хүсэлт хүлээж авлаа`);
  const html = wrap(
    subject,
    `
    <h1 style="font-size:20px;margin:0 0 16px;color:#111827;">Баярлалаа, ${escapeHtml(args.ownerName)}!</h1>
    <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">
      Таны <strong>${escapeHtml(args.officeName)}</strong> оффисын хүсэлтийг амжилттай хүлээж авлаа.
      Манай админ баг таны мэдээллийг 24 цагийн дотор шалгаж, хариу имэйлээр илгээх болно.
    </p>
    <div style="background:#fef3c7;border-left:3px solid #f59e0b;padding:12px 16px;border-radius:6px;margin:20px 0;">
      <p style="margin:0;font-size:14px;color:#92400e;">
        ⏳ Энэ хооронд та ${BRAND}-руу нэвтэрч профайлаа бэлдэх боломжтой, гэхдээ зар оруулах, агент урих эрх зөвшөөрөл ирсний дараа нээгдэнэ.
      </p>
    </div>
  `,
  );
  return { subject, html };
}

// 3. Approved
export function approvedTemplate(args: {
  officeName: string;
  ownerName: string;
  dashboardUrl: string;
}) {
  const subject = sanitizeSubject(`${args.officeName} — таны хүсэлт зөвшөөрөгдлөө 🎉`);
  const html = wrap(
    subject,
    `
    <h1 style="font-size:20px;margin:0 0 16px;color:#111827;">Тавтай морилно уу, ${escapeHtml(args.ownerName)}!</h1>
    <p style="font-size:15px;line-height:1.6;margin:0 0 20px;">
      Таны <strong>${escapeHtml(args.officeName)}</strong> оффис ${BRAND} платформд амжилттай нэгдлээ.
      Одоо та зар оруулах, агент урих, харилцагчтай чатлах бүх боломжтой боллоо.
    </p>
    <div style="text-align:center;margin:28px 0;">
      ${button(args.dashboardUrl, "Dashboard-руу нэвтрэх")}
    </div>
    <p style="font-size:13px;color:#6b7280;margin:0;">
      Эхлэх зөвлөмж: оффисын логоо, танилцуулга, мэргэшсэн чиглэлээ нэмээрэй — энэ нь харилцагчдад итгэл өгнө.
    </p>
  `,
  );
  return { subject, html };
}

// 4. Rejected — шалтгаантай
export function rejectedTemplate(args: {
  officeName: string;
  ownerName: string;
  reason: string;
}) {
  const subject = sanitizeSubject(`${args.officeName} — хүсэлтийн талаар`);
  const html = wrap(
    subject,
    `
    <h1 style="font-size:20px;margin:0 0 16px;color:#111827;">Сайн байна уу, ${escapeHtml(args.ownerName)}</h1>
    <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">
      Уучлаарай — таны <strong>${escapeHtml(args.officeName)}</strong> оффисын хүсэлтийг одоохондоо зөвшөөрөх боломжгүй боллоо.
    </p>
    <div style="background:#fee2e2;border-left:3px solid #ef4444;padding:12px 16px;border-radius:6px;margin:20px 0;">
      <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#991b1b;">Шалтгаан:</p>
      <p style="margin:0;font-size:14px;color:#7f1d1d;white-space:pre-wrap;">${escapeHtml(args.reason)}</p>
    </div>
    <p style="font-size:14px;line-height:1.6;margin:16px 0 0;color:#374151;">
      Лавлах, эсвэл шинээр хүсэлт илгээх бол <a href="mailto:${SUPPORT_EMAIL}" style="color:#6366f1;">${SUPPORT_EMAIL}</a>-руу холбоо барина уу.
    </p>
  `,
  );
  return { subject, html };
}

// 5. Super admin notification — шинэ хүсэлт ирлээ
export function superAdminNotifyTemplate(args: {
  officeName: string;
  ownerName: string;
  ownerEmail: string;
  reviewUrl: string;
  phone?: string;
  message?: string;
}) {
  const safeOffice = stripUrls(args.officeName).slice(0, 200);
  const subject = sanitizeSubject(`Шинэ оффисын хүсэлт: ${safeOffice}`);
  // Хэрэглэгчийн оруулсан message-аас URL-уудыг хасах нь sa-руу phishing/spam linkээс хамгаална.
  const safeMessage = args.message ? stripUrls(args.message) : "";
  const html = wrap(
    subject,
    `
    <h1 style="font-size:20px;margin:0 0 16px;color:#111827;">Шинэ оффисын хүсэлт</h1>
    <div style="background:#fef3c7;border-left:3px solid #f59e0b;padding:10px 14px;border-radius:6px;margin:0 0 16px;">
      <p style="margin:0;font-size:12px;color:#92400e;">
        ⚠ Доорх мэдээллийг <strong>хэрэглэгч өөрөө</strong> оруулсан. Үнэн эсэхийг шалгах ёстой.
      </p>
    </div>
    <table style="width:100%;font-size:14px;border-collapse:collapse;margin-bottom:20px;">
      <tr><td style="padding:6px 0;color:#6b7280;width:120px;">Оффис</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(safeOffice)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Эзэмшигч</td><td style="padding:6px 0;">${escapeHtml(args.ownerName)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Имэйл</td><td style="padding:6px 0;">${escapeHtml(args.ownerEmail)}</td></tr>
      ${args.phone ? `<tr><td style="padding:6px 0;color:#6b7280;">Утас</td><td style="padding:6px 0;">${escapeHtml(stripUrls(args.phone))}</td></tr>` : ""}
      ${safeMessage ? `<tr><td style="padding:6px 0;color:#6b7280;vertical-align:top;">Тэмдэглэл</td><td style="padding:6px 0;white-space:pre-wrap;">${escapeHtml(safeMessage)}</td></tr>` : ""}
    </table>
    <div style="text-align:center;margin:24px 0;">
      ${button(args.reviewUrl, "Шалгаж зөвшөөрөх")}
    </div>
  `,
  );
  return { subject, html };
}
