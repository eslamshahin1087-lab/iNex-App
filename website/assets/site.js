(function(){
"use strict";
const copy={
ar:{
navPlatform:"المنصة",navFeatures:"المميزات",navJourney:"كيف تعمل",navAbout:"عن iNex",navCta:"افتح التطبيق",
heroEyebrow:"منصة رقمية لإدارة رحلتك التأمينية",heroTitle:"تأمينك أوضح.<br><em>وقراراتك أذكى.</em>",heroLead:"اجمع وثائقك التأمينية في مكان واحد، تابع مواعيد التجديد، وافهم مستوى حمايتك — مع وسيلة أسهل للتواصل مع وسيطك.",heroPrimary:"ابدأ رحلتك",heroSecondary:"اكتشف المنصة",heroNote:"تجربة رقمية واحدة لمتابعة احتياجاتك التأمينية",visualTagTop:"رؤية أوضح لحمايتك",visualTagBottom:"متابعة في مكان واحد",
mockGreeting:"مساحة التأمين الخاصة بك",mockTitle:"مرحبًا بك في iNex",mockScoreLabel:"تقييم الحماية",mockScoreValue:"نظرة شاملة",mockScoreHint:"افهم نقاط القوة وفرص التحسين",mockPolicies:"متابعة الوثائق",mockViewAll:"عرض الكل",mockPolicyOne:"وثيقة تأمين",mockPolicyOneSub:"متابعة الحالة والتجديد",mockActive:"سارية",mockPolicyTwo:"طلب عرض سعر",mockPolicyTwoSub:"قارن الخيارات المتاحة",
trustIntro:"صُممت لتسهيل:",trustOne:"متابعة الوثائق",trustTwo:"فهم التغطية",trustThree:"التواصل مع الوسيط",
platformEyebrow:"منصة واحدة. رحلة أكثر تنظيمًا.",platformTitle:"كل ما يخص تأمينك،<br><em>أقرب وأسهل.</em>",platformLead:"تساعدك iNex على تنظيم معلوماتك التأمينية ومتابعتها، وتسهّل الوصول إلى وسيطك وطلب عروض الأسعار.",
feature1Title:"وثائقك في مكان واحد",feature1Text:"ارفع مستنداتك التأمينية وارجع إليها بسهولة، وتابع حالة الوثائق ومواعيد التجديد.",feature2Title:"تقييم مستوى الحماية",feature2Text:"راجع جوانب القوة والفجوات المحتملة في تغطيتك التأمينية، واطلع على توصيات تساعدك على اتخاذ قرار واعٍ.",feature3Title:"طلب ومقارنة العروض",feature3Text:"أرسل طلب عرض سعر، واطلع على العروض المتاحة لمساعدتك في المقارنة قبل اتخاذ القرار.",feature4Title:"نقاط ومكافآت",feature4Text:"تابع نقاط InsuraPoints المكتسبة من الأنشطة المؤهلة، واستفد من آلية الاستبدال المتاحة داخل التطبيق.",feature5Title:"تواصل ومساندة",feature5Text:"اطلب استشارة، أرسل شكوى، أو تواصل مع وسيطك من خلال قنوات التواصل المتاحة.",feature6Title:"وعي ومعلومات تأمينية",feature6Text:"اطلع على محتوى توعوي يساعدك على فهم احتياجاتك ومتابعة رحلتك التأمينية.",featureLink:"استكشف التطبيق ↗",
journeyEyebrow:"خطوات واضحة",journeyTitle:"رحلتك التأمينية<br><em>تبدأ من هنا.</em>",journeyLead:"ابدأ بحسابك، أضف وثائقك، ثم استخدم الأدوات المتاحة لمتابعة احتياجاتك والتواصل مع وسيطك.",journeyCta:"انتقل إلى iNex",step1Title:"أنشئ حسابك",step1Text:"سجّل بياناتك وأكمل توثيق البريد الإلكتروني لبدء استخدام حسابك.",step2Title:"أضف وثائقك",step2Text:"اجمع وثائقك التأمينية وتابع حالتها ومواعيد التجديد من مساحة واحدة.",step3Title:"تابع واتخذ قرارك",step3Text:"استفد من التقييم وطلبات العروض وأدوات التواصل المتاحة داخل المنصة.",
aboutEyebrow:"عن iNex",aboutTitle:"التقنية لتجربة تأمينية أكثر وضوحًا.",aboutText:"iNex منصة رقمية للتوعية التأمينية وتنظيم بيانات الوثائق وتسهيل التواصل وطلبات عروض الأسعار من خلال وسيط تأمين مستقل. المنصة ليست شركة تأمين ولا تصدر وثائق تأمين بنفسها.",
ctaKicker:"خطوتك التالية تبدأ الآن",ctaTitle:"خلّي متابعة تأمينك<br><em>أكثر تنظيمًا.</em>",ctaText:"اكتشف تجربة iNex الرقمية وابدأ من حسابك.",ctaButton:"افتح منصة iNex",footerTagline:"Insurance, made clearer.",footerApp:"الدخول إلى التطبيق ↗",rights:"جميع الحقوق محفوظة.",footerDisclosure:"منصة توعوية ورقمية للوساطة التأمينية — لا تمثل شركة تأمين ولا تصدر وثائق تأمين."
},
en:{
navPlatform:"Platform",navFeatures:"Features",navJourney:"How it works",navAbout:"About iNex",navCta:"Open app",
heroEyebrow:"A digital platform for your insurance journey",heroTitle:"Insurance, made clearer.<br><em>Decisions, made smarter.</em>",heroLead:"Bring your insurance documents together, keep an eye on renewals and understand your protection — with an easier way to reach your broker.",heroPrimary:"Get started",heroSecondary:"Explore the platform",heroNote:"One digital experience to help you stay on top of your insurance",visualTagTop:"A clearer view of your cover",visualTagBottom:"Your insurance, in one place",
mockGreeting:"Your insurance space",mockTitle:"Welcome to iNex",mockScoreLabel:"Protection assessment",mockScoreValue:"A clearer overview",mockScoreHint:"Understand strengths and areas to review",mockPolicies:"Policy overview",mockViewAll:"View all",mockPolicyOne:"Insurance policy",mockPolicyOneSub:"Status and renewal tracking",mockActive:"Active",mockPolicyTwo:"Quote request",mockPolicyTwoSub:"Compare available options",
trustIntro:"Designed to simplify:",trustOne:"Policy tracking",trustTwo:"Coverage awareness",trustThree:"Broker communication",
platformEyebrow:"One platform. A more organised journey.",platformTitle:"Your insurance essentials,<br><em>closer and simpler.</em>",platformLead:"iNex helps you organise and follow your insurance information, connect with your broker and request insurance quotations.",
feature1Title:"Your documents in one place",feature1Text:"Upload your insurance documents, access them when needed and follow policy status and renewal dates.",feature2Title:"Understand your protection",feature2Text:"Review strengths and potential gaps in your insurance coverage, with recommendations to support informed decisions.",feature3Title:"Request and compare quotes",feature3Text:"Submit a quotation request and review available offers to help compare options before making a decision.",feature4Title:"Points and rewards",feature4Text:"Track InsuraPoints earned through eligible activities and use the redemption flow available in the app.",feature5Title:"Communication and support",feature5Text:"Request a consultation, submit a complaint or contact your broker through the available channels.",feature6Title:"Insurance awareness",feature6Text:"Explore educational content designed to help you understand your needs and follow your insurance journey.",featureLink:"Explore the app ↗",
journeyEyebrow:"A clear set of steps",journeyTitle:"Your insurance journey<br><em>starts here.</em>",journeyLead:"Create your account, add your documents, then use the available tools to follow your needs and connect with your broker.",journeyCta:"Go to iNex",step1Title:"Create your account",step1Text:"Register your details and verify your email address to start using your account.",step2Title:"Add your documents",step2Text:"Bring your insurance documents together and follow their status and renewal dates.",step3Title:"Review and take action",step3Text:"Use the assessment, quotation requests and communication tools available in the platform.",
aboutEyebrow:"About iNex",aboutTitle:"Technology for a clearer insurance experience.",aboutText:"iNex is a digital platform for insurance awareness, organising policy information and facilitating communication and quotation requests through an independent insurance broker. The platform is not an insurance company and does not issue insurance policies.",
ctaKicker:"Your next step starts here",ctaTitle:"Make insurance follow-up<br><em>more organised.</em>",ctaText:"Explore the iNex digital experience and get started.",ctaButton:"Open iNex",footerTagline:"Insurance, made clearer.",footerApp:"Open the app ↗",rights:"All rights reserved.",footerDisclosure:"A digital insurance-awareness and brokerage platform — not an insurance company and not a policy issuer."
}};
const langButton=document.getElementById("languageSwitch");
const nav=document.getElementById("mainNav");
const menuButton=document.getElementById("menuToggle");
function applyLanguage(lang){
const t=copy[lang]||copy.ar;
document.documentElement.lang=lang;
document.documentElement.dir=lang==="ar"?"rtl":"ltr";
document.querySelectorAll("[data-i18n]").forEach(el=>{const key=el.getAttribute("data-i18n");if(Object.prototype.hasOwnProperty.call(t,key))el.textContent=t[key];});
document.querySelectorAll("[data-i18n-html]").forEach(el=>{const key=el.getAttribute("data-i18n-html");if(Object.prototype.hasOwnProperty.call(t,key))el.innerHTML=t[key];});
langButton.textContent=lang==="ar"?"EN":"عربي";
langButton.setAttribute("aria-label",lang==="ar"?"Switch to English":"التبديل إلى العربية");
document.title=lang==="ar"?"iNex — تأمينك أوضح":"iNex — Insurance, made clearer";
try{localStorage.setItem("inex-website-language",lang);}catch(e){}
}
let current="ar";
try{const saved=localStorage.getItem("inex-website-language");if(saved==="ar"||saved==="en")current=saved;else if((navigator.language||"").toLowerCase().startsWith("en"))current="en";}catch(e){}
applyLanguage(current);
langButton.addEventListener("click",()=>applyLanguage(document.documentElement.lang==="ar"?"en":"ar"));
menuButton.addEventListener("click",()=>{const opened=nav.classList.toggle("open");menuButton.setAttribute("aria-expanded",String(opened));});
nav.querySelectorAll("a").forEach(link=>link.addEventListener("click",()=>{nav.classList.remove("open");menuButton.setAttribute("aria-expanded","false");}));
document.getElementById("currentYear").textContent=String(new Date().getFullYear());
const revealItems=document.querySelectorAll(".reveal");
if("IntersectionObserver" in window&&!window.matchMedia("(prefers-reduced-motion: reduce)").matches){
const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("is-visible");observer.unobserve(entry.target);}}),{threshold:.12});
revealItems.forEach(el=>observer.observe(el));
}else{revealItems.forEach(el=>el.classList.add("is-visible"));}
})();