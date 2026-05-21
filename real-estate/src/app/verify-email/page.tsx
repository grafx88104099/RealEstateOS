// Verify email landing — token-ыг шалгасны дараа энд redirect-ээр буцаж ирнэ
// /verify-email?ok=1 эсвэл /verify-email?error=missing|invalid|used|expired

import Link from "next/link";

const ERROR_LABELS: Record<string, string> = {
  missing: "Холбоос буруу — token дутуу байна.",
  invalid: "Энэ холбоос хүчингүй болсон эсвэл буруу байна.",
  used: "Энэ холбоосыг өмнө нь хэрэглэсэн байна.",
  expired: "Холбоосын хугацаа дууссан. Дахин илгээх товчоор шинэ холбоос аваарай.",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const isOk = sp.ok === "1";
  const error = sp.error ?? null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-md w-full text-center">
        {isOk ? (
          <>
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto mb-4 flex items-center justify-center">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Имэйл баталгаажлаа</h1>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Таны хүсэлт манай админ багт шилжлээ. Бид 24 цагийн дотор шалгаж, хариу имэйлээр илгээх болно.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:shadow-md transition-all"
            >
              Үргэлжлүүлэх
            </Link>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 mx-auto mb-4 flex items-center justify-center">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Алдаа гарлаа</h1>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              {error ? (ERROR_LABELS[error] ?? "Имэйл баталгаажуулахад алдаа гарлаа.") : "Энэ холбоос буруу байна."}
            </p>
            <div className="flex flex-col gap-2">
              <Link
                href="/verify-email/pending"
                className="inline-flex items-center justify-center bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:shadow-md transition-all"
              >
                Дахин илгээх
              </Link>
              <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 mt-2">
                Нүүр хуудас
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
