"use client";

import { useState } from "react";

type State = {
  contactMethod: string[];
  propType: string[];
  propLocation: string[];
  propPurpose: string[];
  budget: string | null;
  urgency: string | null;
  hearAbout: string[];
};

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full border text-sm transition-all ${
        selected
          ? "bg-amber-700 border-amber-700 text-white font-medium"
          : "bg-gray-50 border-gray-200 text-gray-500 hover:border-amber-700 hover:text-amber-700"
      }`}
    >
      {label}
    </button>
  );
}

function UrgencyCard({
  icon,
  label,
  desc,
  selected,
  onClick,
}: {
  icon: string;
  label: string;
  desc: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border rounded-xl p-3 text-center transition-all ${
        selected
          ? "border-amber-700 bg-amber-50"
          : "border-gray-200 bg-gray-50 hover:border-amber-700"
      }`}
    >
      <div className="text-lg mb-1">{icon}</div>
      <div className={`text-sm font-medium ${selected ? "text-amber-700" : "text-gray-900"}`}>
        {label}
      </div>
      <div className="text-xs text-gray-500">{desc}</div>
    </button>
  );
}

export default function SurveyPage() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [usState, setUsState] = useState("");
  const [contactTime, setContactTime] = useState("");
  const [financing, setFinancing] = useState("");
  const [prevProperty, setPrevProperty] = useState("");
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);

  const [state, setState] = useState<State>({
    contactMethod: ["Утас"],
    propType: [],
    propLocation: [],
    propPurpose: [],
    budget: null,
    urgency: null,
    hearAbout: [],
  });

  function toggleChip(key: "contactMethod" | "propType" | "propLocation" | "propPurpose" | "hearAbout", val: string) {
    setState((s) => {
      const arr = s[key];
      return { ...s, [key]: arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val] };
    });
  }

  function setSingle(key: "budget" | "urgency", val: string) {
    setState((s) => ({ ...s, [key]: s[key] === val ? null : val }));
  }

  async function handleSubmit() {
    if (!consent) { setError("Мэдээлэл ашиглахыг зөвшөөрнө үү."); return; }
    if (!firstName || !lastName) { setError("Овог нэрээ бичнэ үү."); setStep(1); return; }

    setLoading(true);
    setError(null);

    const res = await fetch("/api/survey", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lastName, firstName, phone, email, usState, contactTime,
        contactMethod: state.contactMethod,
        propType: state.propType,
        propLocation: state.propLocation,
        propPurpose: state.propPurpose,
        budget: state.budget,
        urgency: state.urgency,
        financing, prevProperty, notes,
        hearAbout: state.hearAbout,
      }),
    });

    if (!res.ok) {
      setError("Илгээхэд алдаа гарлаа. Дахин оролдоно уу.");
      setLoading(false);
      return;
    }

    setSubmitted(true);
    setLoading(false);
  }

  const stepLabels = ["Хувийн мэдээлэл", "Хүсэл сонирхол", "Төсөв & хугацаа", "Нэмэлт"];
  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-600/20 focus:border-amber-700";

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3a7a3a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Таны хүсэлтийг хүлээн авлаа!</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Бидний зөвлөх <strong>24 цагийн дотор</strong> таньтай холбоо барьж, дэлгэрэнгүй ярилцана.
            <br />Танд тохиромжтой цагт уулзалт зохион байгуулна.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-xs tracking-[3px] text-gray-400 uppercase mb-1">Монгол Үл Хөдлөх Хөрөнгийн Зөвлөх</p>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Таны хүсэлтийг бүртгүүлэх</h1>
          <p className="text-sm text-gray-500">USA-д амьдарч буй монголчуудад зориулсан — Монгол дахь үл хөдлөх хөрөнгийн зөвлөгөө</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-0 mb-8">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex-1 text-center relative">
              {i < 3 && <div className="absolute top-3.5 left-1/2 right-[-50%] h-px bg-gray-200 z-0" />}
              <div
                className={`w-7 h-7 rounded-full border-[1.5px] flex items-center justify-center text-xs font-medium mx-auto mb-1 relative z-10 ${
                  i + 1 === step
                    ? "border-amber-700 bg-amber-700 text-white"
                    : i + 1 < step
                    ? "border-green-600 bg-green-600 text-white"
                    : "border-gray-300 bg-white text-gray-400"
                }`}
              >
                {i + 1 < step ? "✓" : i + 1}
              </div>
              <div className={`text-[11px] ${i + 1 === step ? "text-amber-700 font-medium" : "text-gray-400"}`}>
                {label}
              </div>
            </div>
          ))}
        </div>

        <div className="text-xs text-amber-700 font-medium mb-3 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-700 inline-block" /> Алхам {step} / 4
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="border border-gray-100 rounded-2xl p-6">
            <h3 className="text-base font-medium text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-amber-50 flex items-center justify-center text-xs">👤</span>
              Хувийн мэдээлэл
            </h3>
            <p className="text-[11px] text-gray-400 mb-4">* тэмдэглэгдсэн талбарыг заавал бөглөнө үү</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Овог <span className="text-red-500">*</span></label>
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Ж: Батбаяр" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Нэр <span className="text-red-500">*</span></label>
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ж: Мөнхбаяр" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Утасны дугаар <span className="text-red-500">*</span></label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (___) ___-____" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">И-мэйл хаяг <span className="text-red-500">*</span></label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" className={inputClass} />
              </div>
            </div>
            <div className="h-px bg-gray-100 my-5" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">USA-д аль мужид амьдардаг вэ? <span className="text-red-500">*</span></label>
                <select value={usState} onChange={(e) => setUsState(e.target.value)} className={inputClass}>
                  <option value="">— Мужаа сонгоно уу —</option>
                  {["California","New York","Texas","Virginia","Colorado","Washington","Illinois","Georgia","Maryland","Minnesota","Бусад"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Холбоо барих тохиромжтой цаг</label>
                <select value={contactTime} onChange={(e) => setContactTime(e.target.value)} className={inputClass}>
                  <option value="">— Сонгоно уу —</option>
                  <option>Өглөө (8:00–12:00 МТ)</option>
                  <option>Өдөр (12:00–17:00 МТ)</option>
                  <option>Орой (17:00–20:00 МТ)</option>
                  <option>Уян хатан</option>
                </select>
              </div>
            </div>
            <div className="h-px bg-gray-100 my-5" />
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">Холбоо барих давуу арга</label>
              <div className="flex flex-wrap gap-2">
                {[["📞 Утас","Утас"],["💬 WhatsApp","WhatsApp"],["✉️ И-мэйл","И-мэйл"],["🖥 Zoom уулзалт","Zoom/Цахим уулзалт"]].map(([l, v]) => (
                  <Chip key={v} label={l} selected={state.contactMethod.includes(v)} onClick={() => toggleChip("contactMethod", v)} />
                ))}
              </div>
            </div>
            <div className="flex justify-end mt-5">
              <button onClick={() => setStep(2)} className="px-5 py-2.5 bg-amber-700 text-white rounded-lg text-sm font-medium hover:bg-amber-800 transition-colors">
                Үргэлжлүүлэх →
              </button>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="border border-gray-100 rounded-2xl p-6">
            <h3 className="text-base font-medium text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-amber-50 flex items-center justify-center text-xs">🏠</span>
              Үл хөдлөх хөрөнгийн хүсэл сонирхол
            </h3>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-2">Ямар төрлийн ҮХХ авах сонирхолтой вэ? <span className="text-red-500">*</span></label>
              <div className="flex flex-wrap gap-2">
                {[["🏢 Орон сууц","Орон сууц (Квартир)"],["🏡 Хашаа байшин","Хашаа байшин"],["🌿 Газар / Зурвас","Газар (Зурвас)"],["🏪 Арилжааны","Арилжааны зориулалт"],["🏦 Оффис","Оффис"],["📋 Хэд хэдэн","Хэд хэдэн төрөл"]].map(([l, v]) => (
                  <Chip key={v} label={l} selected={state.propType.includes(v)} onClick={() => toggleChip("propType", v)} />
                ))}
              </div>
            </div>
            <div className="h-px bg-gray-100 my-5" />
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-2">Аль бүс нутагт авах сонирхолтой вэ? <span className="text-red-500">*</span></label>
              <div className="flex flex-wrap gap-2">
                {[["🏙 УБ — Төв","Улаанбаатар хот (Төв)"],["🏗 УБ — Шинэ хороолол","Улаанбаатар (Шинэ хороолол)"],["🌆 Хан-Уул / Баянзүрх","Хан-Уул, Баянзүрх"],["🌄 Орон нутаг","Орон нутаг (Аймаг)"],["🌲 Зуслан / Загварлаг","Зуслан / Загварлаг бүс"],["🔍 Тодорхойгүй","Тодорхойгүй"]].map(([l, v]) => (
                  <Chip key={v} label={l} selected={state.propLocation.includes(v)} onClick={() => toggleChip("propLocation", v)} />
                ))}
              </div>
            </div>
            <div className="h-px bg-gray-100 my-5" />
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">Худалдан авалтын зорилго <span className="text-red-500">*</span></label>
              <div className="flex flex-wrap gap-2">
                {[["🏠 Хувийн орон сууц","Хувийн орон сууцны зориулалт"],["💰 Хөрөнгө оруулалт","Хөрөнгө оруулалт / Түрээс"],["✈️ Эргэж ирэх","Тэтгэвэрт гарсны дараа буцаж ирэх"],["👨‍👩‍👧 Гэр бүлийнхэнд","Гэр бүлийнхэндээ"],["📊 Бизнесийн","Бизнесийн зориулалт"]].map(([l, v]) => (
                  <Chip key={v} label={l} selected={state.propPurpose.includes(v)} onClick={() => toggleChip("propPurpose", v)} />
                ))}
              </div>
            </div>
            <div className="flex justify-between mt-5">
              <button onClick={() => setStep(1)} className="px-5 py-2.5 bg-gray-50 border border-gray-200 text-gray-500 rounded-lg text-sm hover:border-gray-300 transition-colors">← Буцах</button>
              <button onClick={() => setStep(3)} className="px-5 py-2.5 bg-amber-700 text-white rounded-lg text-sm font-medium hover:bg-amber-800 transition-colors">Үргэлжлүүлэх →</button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="border border-gray-100 rounded-2xl p-6">
            <h3 className="text-base font-medium text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-amber-50 flex items-center justify-center text-xs">💵</span>
              Төсөв & Хугацаа
            </h3>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-2">Таны төсвийн хүрээ (ам. доллар) <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-2 gap-2">
                {["$30,000 хүртэл","$30,000–$60,000","$60,000–$100,000","$100,000–$200,000","$200,000–$500,000","$500,000 дээш"].map((b) => (
                  <Chip key={b} label={b} selected={state.budget === b} onClick={() => setSingle("budget", b)} />
                ))}
              </div>
            </div>
            <div className="h-px bg-gray-100 my-5" />
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-2">Яаралтай байдлын түвшин <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-3 gap-2">
                <UrgencyCard icon="🔴" label="Яаралтай" desc="3 сар дотор" selected={state.urgency === "Яаралтай (3 сар дотор)"} onClick={() => setSingle("urgency", "Яаралтай (3 сар дотор)")} />
                <UrgencyCard icon="🟡" label="Дунд зэрэг" desc="3 – 6 сар" selected={state.urgency === "Дунд зэрэг (3–6 сар)"} onClick={() => setSingle("urgency", "Дунд зэрэг (3–6 сар)")} />
                <UrgencyCard icon="🟢" label="Тайван" desc="6 – 12 сар" selected={state.urgency === "Тайван (6–12 сар)"} onClick={() => setSingle("urgency", "Тайван (6–12 сар)")} />
                <UrgencyCard icon="📅" label="Урт хугацааны" desc="1 – 2 жил" selected={state.urgency === "Урт хугацааны (1–2 жил)"} onClick={() => setSingle("urgency", "Урт хугацааны (1–2 жил)")} />
                <UrgencyCard icon="🔍" label="Судалж байна" desc="Одоохондоо" selected={state.urgency === "Судалж байна"} onClick={() => setSingle("urgency", "Судалж байна")} />
                <UrgencyCard icon="❓" label="Тодорхойгүй" desc="Шийдэж амжаагүй" selected={state.urgency === "Тодорхойгүй"} onClick={() => setSingle("urgency", "Тодорхойгүй")} />
              </div>
            </div>
            <div className="h-px bg-gray-100 my-5" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Санхүүжилтийн хэлбэр</label>
                <select value={financing} onChange={(e) => setFinancing(e.target.value)} className={inputClass}>
                  <option value="">— Сонгоно уу —</option>
                  <option>Бэлэн мөнгө (Cash)</option>
                  <option>Монголын банкны ипотек</option>
                  <option>USA банкны зээл</option>
                  <option>Хосолсон (Cash + зээл)</option>
                  <option>Тодорхойгүй / Зөвлөгөө хэрэгтэй</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Монголд өмнө нь ҮХХ байсан уу?</label>
                <select value={prevProperty} onChange={(e) => setPrevProperty(e.target.value)} className={inputClass}>
                  <option value="">— Сонгоно уу —</option>
                  <option>Тийм, одоо байгаа</option>
                  <option>Тийм, гэхдээ зарсан</option>
                  <option>Үгүй, анх удаа</option>
                </select>
              </div>
            </div>
            <div className="flex justify-between mt-5">
              <button onClick={() => setStep(2)} className="px-5 py-2.5 bg-gray-50 border border-gray-200 text-gray-500 rounded-lg text-sm hover:border-gray-300 transition-colors">← Буцах</button>
              <button onClick={() => setStep(4)} className="px-5 py-2.5 bg-amber-700 text-white rounded-lg text-sm font-medium hover:bg-amber-800 transition-colors">Үргэлжлүүлэх →</button>
            </div>
          </div>
        )}

        {/* Step 4 */}
        {step === 4 && (
          <div className="border border-gray-100 rounded-2xl p-6">
            <h3 className="text-base font-medium text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-amber-50 flex items-center justify-center text-xs">📝</span>
              Нэмэлт мэдээлэл & Онцгой хүсэлт
            </h3>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-1">Тусгайлан хэрэгтэй зүйл буюу асуулт байвал бичнэ үү</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ж: 3 өрөө, 80м² дээш, лифттэй байр хайж байна..." className={`${inputClass} min-h-[80px] resize-y`} />
            </div>
            <div className="h-px bg-gray-100 my-5" />
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-2">Та манай үйлчилгээний талаар хаанаас мэдсэн бэ?</label>
              <div className="flex flex-wrap gap-2">
                {[["📱 Нийгмийн сүлжээ","Нийгмийн сүлжээ"],["👥 Найзын зөвлөмж","Найз нөхдийн зөвлөмж"],["🇲🇳 Монгол нийгэмлэг","Монгол хамтын нийгэмлэг (USA)"],["🔍 Google","Google хайлт"],["⭐ Өмнөх үйлчлүүлэгч","Өмнөх үйлчлүүлэгч байсан"],["➕ Бусад","Бусад"]].map(([l, v]) => (
                  <Chip key={v} label={l} selected={state.hearAbout.includes(v)} onClick={() => toggleChip("hearAbout", v)} />
                ))}
              </div>
            </div>
            <div className="h-px bg-gray-100 my-5" />
            <div className="flex items-start gap-2.5 p-3 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="w-4 h-4 mt-0.5 shrink-0 accent-amber-700"
              />
              <label className="text-xs text-gray-500 leading-relaxed cursor-pointer" onClick={() => setConsent(!consent)}>
                Миний хувийн мэдээллийг үл хөдлөх хөрөнгийн зөвлөгөө, холбоо барих зорилгоор ашиглахыг зөвшөөрч байна. Мэдээллийг гуравдагч этгээдэд дамжуулахгүй болно. <span className="text-amber-700 font-medium">*</span>
              </label>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3">{error}</p>
            )}

            <div className="flex justify-between mt-5">
              <button onClick={() => setStep(3)} className="px-5 py-2.5 bg-gray-50 border border-gray-200 text-gray-500 rounded-lg text-sm hover:border-gray-300 transition-colors">← Буцах</button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-5 py-2.5 bg-amber-700 text-white rounded-lg text-sm font-medium hover:bg-amber-800 disabled:opacity-50 transition-colors"
              >
                {loading ? "Илгээж байна..." : "Илгээх ✓"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
