"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import L from "@/lib/labels";
import { formatAMD, VOTER_FEE, CANDIDATE_FEE } from "@/lib/elections-config";

type RegistrationType = "voter" | "candidate";

interface FormData {
  full_name: string;
  document_number: string;
  phone: string;
  acceptance_movement: boolean;
  acceptance_citizenship: boolean;
  acceptance_self_restriction: boolean;
  acceptance_age_25: boolean;
  acceptance_only_armenian: boolean;
  acceptance_lived_in_armenia: boolean;
  acceptance_voting_right: boolean;
  acceptance_armenian_language: boolean;
}


function CheckRow({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "w-full flex items-start gap-4 rounded-2xl border-2 p-4 text-left transition-all",
        checked ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/40"
      )}
    >
      <div className={cn(
        "mt-0.5 h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
        checked ? "border-primary bg-primary" : "border-muted-foreground/40"
      )}>
        {checked && <CheckCircle2 className="h-4 w-4 text-white" />}
      </div>
      <span className="text-sm font-medium leading-relaxed">{children}</span>
    </button>
  );
}

const LAW_URL = "https://www.arlis.am/hy/acts/107373";
const MANIFESTO_URL = "https://bolorindem.am/announcement.html";

function LegalQuote({ article = "80", point, children }: { article?: string; point: string; children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-primary/25 pl-3 space-y-1.5">
      <p className="text-xs text-muted-foreground leading-relaxed italic">{children}</p>
      <a
        href={LAW_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[11px] text-primary/60 hover:text-primary transition-colors"
      >
        ՀՀ Ընտրական օրենսգիրք, հոդված {article}, կետ {point}
        <ExternalLink className="h-2.5 w-2.5" />
      </a>
    </div>
  );
}

function ManifestoQuote() {
  return (
    <div className="border-l-2 border-primary/25 pl-3 space-y-1.5">
      <div className="max-h-52 overflow-y-auto pr-1 space-y-3 text-xs text-muted-foreground leading-relaxed">
        <p>Մենք՝ վատի և վատագույնի միջև ընտրություն կատարելուց հրաժարված քաղաքացիներս, ականատես լինելով Հայաստանի Հանրապետության կառավարման գործում եղած ձախողումներին, միավորվում ենք այս պահին կարևորագույն քաղաքական փոփոխությունը կատարելու որոշմամբ։</p>
        <p>Հռչակում ենք, որ Հայաստանի Հանրապետությունում լրջագույն խնդիրների արմատը գործող ընտրական համակարգն է, որը չի ապահովում արդար ընտրություններ։ Ազգային Ժողովում չի արտացոլվում ժողովրդի տված փաստացի քվեների համամասնությունը։</p>
        <p>Ուստի, այդ խնդրի լուծումը տեսնելով համակարգի փոփոխության մեջ, մեկնարկում ենք «Բոլորին դեմ եմ» շարժումը՝ ՀՀ քաղաքացիներին իրենց ձայներին գործնականում տեր կանգնելու հնարավորություն տալու նպատակով։</p>
        <p>Այս գործընթացի օրակարգն է իրագործել հետևյալ 3 օրենսդրական փոփոխությունները՝</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Կայուն մեծամասնության չեղարկում</li>
          <li>1% անցողիկ շեմի սահմանում</li>
          <li>«Բոլորին դեմ եմ» քվեաթերթիկի ավելացում</li>
        </ul>
        <p>Այս օրակարգը կյանքի կոչելու նպատակով մենք իրականացնելու ենք հետևյալ քայլերը՝</p>
        <ol className="list-decimal pl-4 space-y-1">
          <li>ստեղծելու ենք «Բոլորին դեմ եմ» ինքնալուծարվող կուսակցությունը,</li>
          <li>ընտրապայքարից առաջ բոլոր անդամների քվեարկությամբ կազմելու ենք ընտրական ցուցակ,</li>
          <li>մասնակցելու ենք խորհրդարանական ընտրություններին, հաջող ելքի դեպքում կազմելու ենք 100-օրյա անցումային կառավարություն,</li>
          <li>կատարելու ենք վերը նշված երեք փոփոխությունները և նշանակելու ենք արտահերթ ընտրություններ։</li>
        </ol>
        <p>Արտահերթ ընտրություններից առաջ «Բոլորին դեմ եմ» կուսակցությունն ինքնալուծարվելու է, իսկ անցումային կառավարության անդամները ստորագրելու են ինքնասահմանափակող քաղաքական փաստաթուղթ՝ բացառելով վարչական ռեսուրսի օգտագործումն ընտրությունների ընթացքում՝</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>վարչապետը 10 տարով հրաժարվելու է ընտրովի և նշանակովի որևէ պաշտոն զբաղեցնելուց,</li>
          <li>անցումային կառավարության մյուս անդամները որևէ ձևով չեն մասնակցելու տվյալ արտահերթ ընտրություններին։</li>
        </ul>
        <p>100-օրյա կառավարման ընթացքում անցումային կառավարությունը ձեռնպահ է մնալու իր օրակարգից չբխող փոփոխություններ կատարելուց, պահպանելու է կայունությունն ու պետական կառավարման բնականոն աշխատանքը, մինչև ընտրված հաջորդ կառավարությունը կսահմանի իր մանդատից բխող քաղաքական ուղղությունը։</p>
        <p>Այս օրակարգից դուրս Շարժման անդամներից յուրաքանչյուրը կարող է ունենալ այլ առաջարկներ կամ պահանջներ, որոնք չեն կարող հայտարարվել Շարժման անունից և չեն կարող լինել Շարժման կողմից ձևավորվող անցումային կառավարության օրակարգի մաս։</p>
        <p>«Բոլորին դեմ եմ» կուսակցության լուծարումից հետո Շարժման բոլոր անդամներն ազատ են իրենց քաղաքական ուղին ընտրելու հարցում։</p>
        <p className="font-semibold text-foreground/70">Շարժումը՝</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>մերժում է բռնությունն իր բոլոր դրսևորումներով, պատճառաբանություններով կամ արդարացումներով,</li>
          <li>մերժում է հայհոյանքը և ատելության խոսքը՝ որպես քաղաքական պայքարի միջոց,</li>
          <li>բացառում է քաղաքական գործիչների ընտանիքի անդամների թիրախավորումը,</li>
          <li>գործում է նախաձեռնող ապակենտրոնության սկզբունքով, այսինքն՝ այս փաստաթղթում ամրագրված դրույթների պահպանման դեպքում, յուրաքանչյուր անդամ ազատ է ընտրել իր համար ամենաարդյունավետ ճանապարհը՝ հանուն Շարժման հաղթանակի։</li>
        </ul>
        <p>Շարժումն ունի ձևավորված աշխատանքային խումբ։ Յուրաքանչյուր անդամ, անկախ միանալու ժամկետից, հնարավորություն ունի ներգրավվելու աշխատանքային խմբում և պատասխանատվություն ստանձնելու որևէ ուղղության համակարգման կամ որևէ աշխատանքի կատարման համար։</p>
        <p>Միավորվելով այս նպատակի շուրջ և գործելով այս սկզբունքներով՝ Շարժման անդամներն ամբողջական պատասխանատվություն են կրում Շարժման վերջնական նպատակի համար և պատասխանատվություն են ստանձնում ջանք չխնայել վերոնշյալ փոփոխությունները կյանքի կոչելու ճանապարհին։</p>
      </div>
      <a
        href={MANIFESTO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[11px] text-primary/60 hover:text-primary transition-colors"
      >
        «Բոլորին դեմ եմ» շարժում — Հռչակագիր, 12 հունվարի 2026
        <ExternalLink className="h-2.5 w-2.5" />
      </a>
    </div>
  );
}

export function RegistrationWizard({
  type,
  defaultFullName = "",
  defaultPhone = "",
}: {
  type: RegistrationType;
  defaultFullName?: string;
  defaultPhone?: string;
}) {
  const isCandidate = type === "candidate";
  const fee = isCandidate ? CANDIDATE_FEE : VOTER_FEE;

  // Steps: 0=overview, 1=identity, 2=movement, 3=citizenship,
  // candidate adds 4=self-restriction, 5=age25, 6=only-armenian, 7=lived, 8=school
  // last step = payment
  const totalSteps = isCandidate ? 9 : 4;
  const paymentStep = totalSteps; // step after all inputs

  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>({
    full_name: defaultFullName, document_number: "", phone: defaultPhone,
    acceptance_movement: false, acceptance_citizenship: false,
    acceptance_self_restriction: false, acceptance_age_25: false,
    acceptance_only_armenian: false, acceptance_lived_in_armenia: false,
    acceptance_voting_right: false, acceptance_armenian_language: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const set = (key: keyof FormData, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Auto-save registration when user reaches payment step
  useEffect(() => {
    if (step !== paymentStep || saved || loading) return;
    setLoading(true);
    setError("");
    fetch("/api/elections/init-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, ...form }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (res.status === 409 || res.ok) {
          // 409 = already saved (duplicate) — treat as success
          setSaved(true);
        } else {
          setError(json.error ?? L.elections.genericError);
        }
      })
      .catch(() => setError(L.elections.genericError))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function canProceed() {
    if (step === 1) return form.full_name.trim().length >= 2 && form.document_number.trim().length >= 4 && form.phone.trim().length >= 5;
    if (step === 2) return form.acceptance_movement;
    if (!isCandidate) {
      if (step === 3) return form.acceptance_citizenship;
    } else {
      if (step === 3) return form.acceptance_self_restriction;
      if (step === 4) return form.acceptance_age_25;
      if (step === 5) return form.acceptance_only_armenian;
      if (step === 6) return form.acceptance_lived_in_armenia;
      if (step === 7) return form.acceptance_voting_right;
      if (step === 8) return form.acceptance_armenian_language;
    }
    return true;
  }

  function confirmPayment() {
    router.push("/elections?payment=pending");
  }

  // Payment / submit step
  const isPaymentStep = step === paymentStep;

  function stepContent() {
    if (step === 1) return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{L.elections.fullNameLabel}</Label>
          <Input
            value={form.full_name}
            onChange={(e) => set("full_name", e.target.value)}
            placeholder={L.elections.fullNamePlaceholder}
            className="h-12 text-base"
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <Label>{L.elections.documentLabel}</Label>
          <Input
            value={form.document_number}
            onChange={(e) => set("document_number", e.target.value)}
            placeholder={L.elections.documentPlaceholder}
            className="h-12 text-base"
          />
        </div>
        <div className="space-y-2">
          <Label>{L.elections.phoneLabel}</Label>
          <div className="flex gap-2 items-center">
            <span className="h-12 px-3 flex items-center rounded-md border bg-muted text-sm text-muted-foreground shrink-0 select-none">+374</span>
            <Input
              value={form.phone.startsWith("+374") ? form.phone.slice(4) : form.phone}
              onChange={(e) => set("phone", "+374" + e.target.value.replace(/\D/g, ""))}
              placeholder="XXXXXXXX"
              type="tel"
              inputMode="numeric"
              maxLength={8}
              className="h-12 text-base"
            />
          </div>
        </div>
      </div>
    );
    if (step === 2) return (
      <div className="space-y-4">
        <ManifestoQuote />
        <CheckRow checked={form.acceptance_movement} onChange={(v) => set("acceptance_movement", v)}>
          {L.elections.acceptMovement}
        </CheckRow>
      </div>
    );
    if (!isCandidate) {
      // Voter step 3: citizenship
      if (step === 3) return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{L.elections.citizenshipText}</p>
          <LegalQuote article="2" point="1">
            Ազգային ժողովի ընտրությունների ժամանակ ընտրելու իրավունք ունեն ընտրության օրը (այսուհետ` քվեարկության օրը) 18 տարին լրացած Հայաստանի Հանրապետության քաղաքացիները
          </LegalQuote>
          <CheckRow checked={form.acceptance_citizenship} onChange={(v) => set("acceptance_citizenship", v)}>
            {L.elections.acceptCitizenship}
          </CheckRow>
        </div>
      );
    } else {
      // Candidate steps 3–8
      if (step === 3) return (
        <div className="space-y-4">
          {/* Prominent warning banner */}
          <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Կարեվոր փաստաթուղթ</p>
            <p className="text-xs text-muted-foreground leading-relaxed">Ստորև ներկայացված հայտարարությունն ուժի մեջ է մտնում ձեր գրանցումից հետո և հրապարակային պարտավորություն է ստեղծում։</p>
          </div>
          {/* Declaration document */}
          <div className="rounded-xl border-2 border-primary/30 overflow-hidden">
            <div className="bg-primary/5 px-4 py-3 border-b border-primary/20">
              <p className="text-xs font-bold text-center text-primary leading-snug">
                Պատգամավորի ինքնասահմանափակման և մանդատից հրաժարվելու մասին{"\n"}հանրային հայտարարություն
              </p>
            </div>
            <div className="max-h-72 overflow-y-auto px-4 py-4 space-y-3 text-xs text-foreground/80 leading-relaxed">
              <p>Ես, <strong className="text-foreground">{form.full_name.trim() || "___________"}</strong>, որպես «Բոլորին դեմ եմ» ժողովրդավարական կուսակցության կողմից Ազգային ժողովի ընտրություններին մասնակցող թեկնածու, հանրության, ՀՀ քաղաքացիների, իմ ընտրողների և իմ քաղաքական գործընկերների առաջ պատվով հայտարարում և պարտավորվում եմ հետևյալը։</p>
              <p><strong>1.</strong> 2026 թվականի հունիսի 7֊ի ընտրություններին մասնակցել ոչ թե անձնական կամ երկարաժամկետ քաղաքական կարիերա կառուցելու նպատակով, այլ բացառապես ղեկավարվելով «Բոլորին դեմ եմ» հռչակագրի (<a href="https://bolorindem.am/announcement.html" target="_blank" rel="noopener noreferrer" className="text-primary underline">bolorindem.am</a>) սկզբունքներով ու միայն հայտարարված սահմանափակ 100 օրյա անցումային օրակարգի իրագործման նպատակով։</p>
              <p><strong>2.</strong> Ընտրությունների արդյունքում ստացած պատգամավորական մանդատից բխող լիազորությունները իրացնել բացառապես վերը նշված օրակարգի նպատակով, չլուծել անձնական շահերից կամ անհատական գաղափարներից բխող խնդիրներ: Գործել կուսակցության օրակարգին խիստ համապատասխան:</p>
              <p><strong>3.</strong> Մեր օրակարգին համապատասխան կառավարություն ձևավորելու անհնարինության դեպքում, կամ կառավարություն ձևավորելու պարագայում օրակարգը կյանքի կոչելու անհնարինության դեպքում պարտավորվում եմ հրաժարվել պատգամավորական մանդատից, իմ հնարավորությունների սահմաններում անել ամեն բան, որ խմբակցության բոլոր անդամները հրաժարվեն մանդատներից, այդ թվում բարեխղճորեն պահպանել օրենքի և ընթացակարգերի բոլոր պահանջները՝ այս խոստման կատարումը տեխնիկապես կատարելու համար:</p>
              <p><strong>4.</strong> Եթե «Բոլորին դեմ եմ» ժողովրդավարական կուսակցությունը ձևավորի անցումային կառավարություն, ապա վարչապետի հրաժարականից և անցումային շրջանի ավարտից անմիջապես հետո ես պարտավորվում եմ վայր դնել իմ պատգամավորական մանդատը և ձեռնպահ մնալ այդ մանդատի երկարաժամկետ ցանկացած քաղաքական կապիտալացման փորձից՝ այդ թվում արտահերթ ընտրությունների անցկացմանը խոչընդոտող քվեարկություններից:</p>
              <p><strong>5.</strong> Ընդունում եմ, որ սույն հայտարարությունը ստեղծում է առաջին հերթին քաղաքական, բարոյական և հրապարակային պատասխանատվություն, և դրա խախտումը պետք է գնահատվի որպես հանրային վստահության, անձնական արժանապատվության և պատվի խախտում։ Այսպիսով ճանաչում եմ հանրության կողմից այս խոստումը դրժող անձանց նկատմամբ հանրային պարսավանքի արդարացիությունը և իրավաչափությունը:</p>
              <p><strong>6.</strong> Տալիս եմ իմ համաձայնությունը, որ սույն հայտարարությունը հրապարակվի ամբողջությամբ, հասանելի լինի հանրությանը, և իմ հետագա վարքագիծը գնահատվի դրա բովանդակության հիմքով։</p>
            </div>
          </div>
          <CheckRow checked={form.acceptance_self_restriction} onChange={(v) => set("acceptance_self_restriction", v)}>
            {L.elections.acceptSelfRestriction}
          </CheckRow>
        </div>
      );
      if (step === 4) return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{L.elections.age25Text}</p>
          <LegalQuote point="1">
            Ազգային ժողովի պատգամավոր կարող է ընտրվել քսանհինգ տարին լրացած, վերջին չորս տարում միայն Հայաստանի Հանրապետության քաղաքացի հանդիսացող, վերջին չորս տարում Հայաստանի Հանրապետությունում մշտապես բնակվող, ընտրական իրավունք ունեցող և հայերենին տիրապետող յուրաքանչյուր ոք
          </LegalQuote>
          <CheckRow checked={form.acceptance_age_25} onChange={(v) => set("acceptance_age_25", v)}>
            {L.elections.acceptAge25}
          </CheckRow>
        </div>
      );
      if (step === 5) return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{L.elections.onlyArmenianText}</p>
          <LegalQuote point="1">
            Ազգային ժողովի պատգամավոր կարող է ընտրվել քսանհինգ տարին լրացած, վերջին չորս տարում միայն Հայաստանի Հանրապետության քաղաքացի հանդիսացող, վերջին չորս տարում Հայաստանի Հանրապետությունում մշտապես բնակվող, ընտրական իրավունք ունեցող և հայերենին տիրապետող յուրաքանչյուր ոք
          </LegalQuote>
          <CheckRow checked={form.acceptance_only_armenian} onChange={(v) => set("acceptance_only_armenian", v)}>
            {L.elections.acceptOnlyArmenian}
          </CheckRow>
        </div>
      );
      if (step === 6) return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{L.elections.livedInArmeniaText}</p>
          <LegalQuote point="2">
            Քաղաքացին վերջին չորս տարում Հայաստանի Հանրապետությունում մշտապես բնակվող չի համարվում, եթե թեկնածուի գրանցման համար մշտապես բնակվելու մասին տեղեկանքը ստանալու նպատակով լիազոր մարմնին դիմում տալու օրվան նախորդող 1 461 օրերի ընթացքում նա առնվազն 731 օր բացակայել է Հայաստանի Հանրապետությունից, բացառությամբ այն դեպքերի, երբ բացակայությունը պայմանավորված է եղել Հայաստանի Հանրապետության հանրային ծառայության մեջ գտնվող անձի ծառայողական նպատակներով գործուղվելու կամ արտերկրում բարձրագույն ուսումնական հաստատություններում ուսումնառության հանգամանքներով:
          </LegalQuote>
          <CheckRow checked={form.acceptance_lived_in_armenia} onChange={(v) => set("acceptance_lived_in_armenia", v)}>
            {L.elections.acceptLivedInArmenia}
          </CheckRow>
        </div>
      );
      if (step === 7) return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{L.elections.votingRightText}</p>
          <LegalQuote article="2" point="1">
            Ազգային ժողովի ընտրությունների ժամանակ ընտրելու իրավունք ունեն ընտրության օրը (այսուհետ` քվեարկության օրը) 18 տարին լրացած Հայաստանի Հանրապետության քաղաքացիները
          </LegalQuote>
          <CheckRow checked={form.acceptance_voting_right} onChange={(v) => set("acceptance_voting_right", v)}>
            {L.elections.acceptVotingRight}
          </CheckRow>
        </div>
      );
      if (step === 8) return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{L.elections.armenianLanguageText}</p>
          <LegalQuote point="3">
            Հայերենին տիրապետելու հանգամանքը հավաստվում է ուսումնական հաստատություններում հայերենով կրթություն ստացած կամ կրթական ծրագրերով նախատեսված հայոց լեզու առարկայի ուսումնառությունն ավարտած և ամփոփիչ ատեստավորում անցած լինելու վերաբերյալ ուսումնական հաստատությունների կողմից տրված ավարտական փաստաթղթով (վկայական, ատեստատ, դիպլոմ): Հայերենին տիրապետելու հանգամանքը հավաստող ավարտական փաստաթղթի բացակայության դեպքում հայերենին տիրապետելու հանգամանքը ստուգվում է Հայաստանի Հանրապետության կրթության և գիտության նախարարության սահմանած կարգով, որը պետք է նախատեսի հայերենին տիրապետելու հանգամանքի ստուգման ողջամիտ, օբյեկտիվ չափորոշիչներ, ինչպես նաև գործընթացի վերահսկողության ընթացակարգեր: Ստուգման արդյունքները եռօրյա ժամկետում կարող են բողոքարկվել դատարան
          </LegalQuote>
          <CheckRow checked={form.acceptance_armenian_language} onChange={(v) => set("acceptance_armenian_language", v)}>
            {L.elections.acceptArmenianLanguage}
          </CheckRow>
        </div>
      );
    }
    // Payment step — show bank transfer details
    return (
      <div className="space-y-5">
        {/* Amount */}
        <div className="rounded-2xl bg-primary/5 border-2 border-primary/20 p-5 text-center">
          <p className="text-sm text-muted-foreground mb-1">{L.elections.paymentAmountLabel}</p>
          <p className="text-4xl font-bold text-primary">{formatAMD(fee)}</p>
        </div>

        {/* Bank details */}
        <div className="rounded-xl border divide-y text-sm">
          {([
            ["Ռեկվիզիտ", "AMD"],
            ["Շահառուի բանկ", "Ամերիաբանկ ՓԲԸ"],
            ["Շահառուի հաշիվ", "1570060173941700"],
            ["Շահառու", "«ԲՈԼՈՐԻՆ ԴԵՄ ԵՄ» ԺՈՂՈՎՐԴԱՎԱՐԱԿԱՆ ԿՍ"],
            ["Նպատակ", isCandidate ? "ԱԺ թեկնածուի գրանցման վճար" : "Ընտրողի գրանցման վճար"],
          ] as [string, string][]).map(([label, value]) => (
            <div key={label} className="flex gap-3 px-4 py-2.5">
              <span className="text-muted-foreground shrink-0 w-36">{label}</span>
              <span className="font-medium select-all">{value}</span>
            </div>
          ))}
        </div>

        {loading && <p className="text-xs text-muted-foreground text-center">Պahpanvum e...</p>}
        {error && <p className="text-sm text-destructive text-center">{error}</p>}

        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          Vonc vcharumnerе verifitsirven minchrdev faktakan kvearkutyun tberin talarelu:
        </p>
      </div>
    );
  }

  function stepTitle() {
    if (step === 1) return L.elections.stepIdentityTitle;
    if (step === 2) return L.elections.stepMovementTitle;
    if (step === paymentStep) return L.elections.stepPaymentTitle;
    if (!isCandidate) {
      if (step === 3) return L.elections.stepCitizenshipTitle;
    } else {
      const titles: Record<number, string> = {
        3: L.elections.stepSelfRestrictionTitle,
        4: L.elections.stepAge25Title,
        5: L.elections.stepOnlyArmenianTitle,
        6: L.elections.stepLivedInArmeniaTitle,
        7: L.elections.stepVotingRightTitle,
        8: L.elections.stepArmenianLanguageTitle,
      };
      return titles[step] ?? "";
    }
    return "";
  }

  // actual steps (1..totalSteps+1 including payment)
  const displayStep = step;
  const displayTotal = totalSteps + 1;
  const progressPct = ((displayStep - 1) / (displayTotal - 1)) * 100;

  return (
    <div className="fixed inset-0 z-[60] bg-background flex flex-col">
      {/* Top bar */}
      <div className="shrink-0 border-b px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => step === 1 ? router.push("/elections") : setStep((s) => s - 1)}
          className="p-2 -ml-1 rounded-lg hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <Progress value={progressPct} className="h-2" />
        </div>
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
          {displayStep - 1} / {displayTotal - 1}
        </span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 pt-8 pb-6 max-w-lg mx-auto space-y-8">
          <h2 className="text-xl font-bold">{stepTitle()}</h2>
          <div>{stepContent()}</div>
        </div>
      </div>

      {/* Bottom button — always at bottom of screen */}
      <div className="shrink-0 border-t bg-background px-5 py-4" style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
        <Button
          className="w-full h-12 text-base"
          disabled={!canProceed() || loading}
          onClick={() => {
            if (isPaymentStep) {
              confirmPayment();
            } else {
              setStep((s) => s + 1);
            }
          }}
        >
          {loading ? "..." : isPaymentStep ? L.elections.paymentDoneBtn : L.elections.nextBtn}
        </Button>
      </div>
    </div>
  );
}
