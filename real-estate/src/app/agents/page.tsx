import Link from "next/link";

export default function AgentsLandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-gray-200/70">
        <div className="max-w-screen-xl mx-auto px-6 py-3.5 flex items-center gap-4">
          <Link
            href="/"
            className="font-[family-name:var(--font-onest)] font-extrabold text-gray-900 text-2xl tracking-tight lowercase leading-none hover:text-indigo-600 transition-colors"
          >
            meni
          </Link>
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-semibold">Pro</span>
          <div className="flex-1" />
          <Link
            href="/agent-portal"
            className="text-[13px] text-gray-700 hover:text-gray-900 font-medium px-3 py-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            Нэвтрэх
          </Link>
          <Link
            href="/agents/onboard/account"
            className="text-[13px] font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 py-2 rounded-full hover:shadow-md hover:shadow-indigo-500/25 transition-all"
          >
            Бүртгүүлэх
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 py-20 sm:py-28 bg-gradient-to-br from-indigo-50/50 via-white to-violet-50/50">
        <div className="max-w-screen-xl mx-auto text-center">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-6">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2L8 6 4 7l3 3-1 5 4-2 4 2-1-5 3-3-4-1z" />
            </svg>
            Оффисуудад зориулсан
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
            Үл хөдлөх хөрөнгийн<br />
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              оффисуудын платформ
            </span>
          </h1>
          <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Оффисын зар, хүсэлт, харилцагчаа нэг дор удирдаж AI зөвлөгчтэйгөөр
            өөрийн брэндээ бий болгоорой.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/agents/onboard/account"
              className="inline-flex items-center gap-2 text-sm font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-6 py-3 rounded-full hover:shadow-lg hover:shadow-indigo-500/30 transition-all"
            >
              Оффис нээх
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/agent-portal"
              className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 px-6 py-3 rounded-full hover:border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Бүртгэлээр нэвтрэх
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-screen-xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              Үйл ажиллагаагаа нэг платформ дээр
            </h2>
            <p className="mt-3 text-gray-600 max-w-xl mx-auto">
              Агентын ажлын урсгалд зориулан тусгайлан бүтээгдсэн арга хэрэгслүүд.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-gray-200 p-6 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/5 transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/30 mb-4">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-gray-900 text-base">{f.title}</h3>
                <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 bg-gradient-to-br from-gray-900 via-indigo-950 to-violet-950 text-white">
        <div className="max-w-screen-md mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Оффисоо өнөөдөр л нээ
          </h2>
          <p className="mt-3 text-gray-300">
            Бүртгэл үнэгүй. Агентуудаа урьж, өөрийн зар, харилцагчаа нэг дор удирдах боломжтой.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/agents/onboard/account"
              className="inline-flex items-center gap-2 text-sm font-semibold bg-white text-gray-900 px-6 py-3 rounded-full hover:bg-gray-100 transition-colors"
            >
              Оффис нээх
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/agent-portal"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white border border-white/20 px-6 py-3 rounded-full hover:bg-white/5 transition-colors"
            >
              Бүртгэлээр нэвтрэх
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="flex-shrink-0 border-t border-gray-200 bg-white">
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-gray-500">
          <Link
            href="/"
            className="font-[family-name:var(--font-onest)] font-extrabold text-gray-700 text-base lowercase tracking-tight leading-none hover:text-gray-900 transition-colors"
          >
            meni
          </Link>
          <span className="hidden sm:inline">© {new Date().getFullYear()} meni</span>
          <span className="flex-1" />
          <Link href="/" className="hover:text-gray-900 transition-colors">Нийтийн хуудас</Link>
          <a href="mailto:hello@meni.mn" className="hover:text-gray-900 transition-colors">Холбоо барих</a>
        </div>
      </footer>
    </div>
  );
}

const FEATURES = [
  {
    title: "Зар удирдах",
    desc: "Зураг, тайлбар, үнэ, төрөл — бүх зараа нэг дор бүтээж нийтлэх.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V20a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1V9.75z" />
      </svg>
    ),
  },
  {
    title: "Хүсэлт хянах",
    desc: "Худалдан авагчдын хүсэлтийг pipeline-р хянаж, цаг алдалгүй хариулна.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: "AI Зуучлагч",
    desc: "Худалдан авагчид байгалийн хэлээр асуухад тохирох зарыг таны ОЛОНЫМ үзүүлнэ.",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 2L8 6 4 7l3 3-1 5 4-2 4 2-1-5 3-3-4-1z" />
      </svg>
    ),
  },
  {
    title: "Олон агент",
    desc: "Оффисын бүх ажилтнаа урьж, эрх, ачааллыг тусад нь удирдана.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-5.13a4 4 0 11-8 0 4 4 0 018 0zm6 0a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    title: "Газрын зурагт",
    desc: "Хайлт, бүс, дүүргээр шүүсэн зарыг газрын зурагт шууд харах.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <circle cx="12" cy="11" r="2.5" />
      </svg>
    ),
  },
  {
    title: "Аналитик",
    desc: "Зарын гүйцэтгэл, харилцагчийн зан байдлыг хяналтын самбараас харах.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 14l4-4 3 3 5-6" />
      </svg>
    ),
  },
];
