/* Mystic Tarot · «Узел+» UI shell. No changes to reading API. */
"use strict";
(function () {
  const storageKey = "mystic-tarot-uzel-history-v1";
  const homeModes = Array.from(document.querySelectorAll("[data-home-mode]"));
  const tabs = Array.from(document.querySelectorAll("[data-tab]"));
  const countNames = {one:"одну карту",two:"две карты",three:"три карты"};
  const namesForMode = {one:"Открыть одну карту",two:"Разложить две карты",three:"Разложить три карты"};
  const today = new Date();
  let dailyFlowPending = false;

  function safeLoad() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
      return Array.isArray(saved) ? saved.filter(item => item && Array.isArray(item.cards)) : [];
    } catch (_) {
      return [];
    }
  }

  function save() {
    if (!lastResult) return;
    try {
      const saved = safeLoad();
      const item = {
        savedAt: new Date().toISOString(),
        id: String(Date.now()) + "-" + Math.random().toString(36).slice(2,8),
        cards: lastResult.cards.slice(),
        kind: dailyFlowPending ? "daily" : "spread",
        question: lastResult.question || "",
        interpretation: lastResult.text || "",
        positions: (window.uzelLatestPositions || []).slice()
      };
      saved.unshift(item);
      localStorage.setItem(storageKey, JSON.stringify(saved.slice(0,30)));
    } catch (_) {
      // Private browsing or disabled storage: the reading still works.
    }
    dailyFlowPending = false;
    updateToday();
    updateThread();
    renderWeek();
  }

  window.uzelSaveReading = function (data) {
    if (window.uzelHistoryReplay) return;
    window.uzelLatestPositions = Array.isArray(data.positions) ? data.positions.slice() : [];
    save();
  };

  function isToday(stamp) {
    const d = new Date(stamp);
    return !Number.isNaN(d.getTime()) &&
      d.getFullYear()===today.getFullYear() &&
      d.getMonth()===today.getMonth() &&
      d.getDate()===today.getDate();
  }

  function updateToday() {
    const dateNode=el("home-date");
    if (dateNode) {
      dateNode.textContent = new Intl.DateTimeFormat("ru-RU",{weekday:"long",day:"numeric",month:"long"}).format(today);
    }
    const daily = safeLoad().find(x=>x.kind==="daily" && isToday(x.savedAt));
    const dailyArt = el("today-image");
    const dailyTitle = el("today-title");
    const dailyDescription = el("today-description");
    const dailyLink = el("today-link");
    if (!daily || !dailyArt || !dailyTitle) {
      if (dailyArt) {dailyArt.src = "./assets/journal-card-back-front.svg";dailyArt.alt="Закрытая карта";}
      const artButton=el("daily-card-button");
      if (artButton) artButton.classList.remove("is-open");
      const hero=el("home")?.querySelector(".today-tile");
      if (hero) {hero.classList.remove("is-open");hero.style.removeProperty("--daily-image");}
      if (dailyTitle) dailyTitle.textContent = "Что скажет сегодня?";
      if (dailyDescription) dailyDescription.textContent = "Карта уже на столе. Коснись её — и она откроется.";
      if (dailyLink) dailyLink.textContent = "Открыть карту →";
      return;
    }
    dailyArt.src = "./images/" + (cardImageMap[daily.cards[0]] || "rubashka.png");
    dailyArt.alt = daily.cards[0];
    const artButton=el("daily-card-button");
    if (artButton) artButton.classList.add("is-open");
    const hero=el("home")?.querySelector(".today-tile");
    if (hero) {hero.classList.add("is-open");hero.style.setProperty("--daily-image", "url(\""+dailyArt.src+"\")");}
    dailyTitle.textContent = daily.cards[0].replace(/\s*\([^)]*\)/g,"");
    if (dailyDescription) dailyDescription.textContent = "Открой трактовку и посмотри, что сегодня подсказывает карта.";
    if (dailyLink) dailyLink.textContent = "Читать полностью →";
  }

  function updateThread() {
    const latest = safeLoad()[0];
    const label=el("thread-recent-name"), meta=el("thread-recent-meta");
    if (label) label.textContent = latest ? (latest.question || "Расклад") : "Первый узел";
    if (meta) meta.textContent = latest
      ? new Intl.DateTimeFormat("ru-RU",{day:"numeric",month:"short"}).format(new Date(latest.savedAt))+" · "+latest.cards.length+" карт."
      : "начни историю";
    const recent=el("thread-recent");
    if (recent) recent.setAttribute("aria-label",latest?"Открыть последний расклад":"Создать первый расклад");
  }

  function renderWeek() {
    const container=el("week-days");
    if (!container) return;
    container.replaceChildren();
    const now=new Date();
    const dow=(now.getDay()+6)%7;
    const monday=new Date(now.getFullYear(),now.getMonth(),now.getDate()-dow);
    const labels=["пн","вт","ср","чт","пт","сб","вс"];
    const records=safeLoad();
    for (let i=0;i<7;i++){
      const d=new Date(monday.getFullYear(),monday.getMonth(),monday.getDate()+i);
      const recordsAtDate=records.filter(item=>{
        const t=new Date(item.savedAt);
        return !Number.isNaN(t.getTime()) &&
          t.getFullYear()===d.getFullYear() &&
          t.getMonth()===d.getMonth() &&
          t.getDate()===d.getDate();
      });
      const latest=recordsAtDate[0];
      const button=document.createElement("button");
      button.type="button";
      button.className="week-day"+(i===dow?" current":"");
      button.disabled=!latest;
      button.setAttribute("aria-label", latest
        ? labels[i]+": посмотреть расклад"
        : labels[i]+": раскладов нет");
      const title=document.createElement("span");
      title.className="week-title";
      if(latest) {
        const q=(latest.question||"").toLowerCase();
        title.textContent= q.includes("работ")||q.includes("карьер")?"работа":
          q.includes("люб")||q.includes("отнош")?"любовь":
          latest.kind==="daily"?"карта дня":"расклад";
      }
      const mark=document.createElement("span");
      mark.className="week-mark"+(latest?"":" dot");
      if(latest){
        const img=document.createElement("img");
        img.src="./assets/journal-week-knot.svg";img.alt="";
        mark.appendChild(img);
      }
      const name=document.createElement("span");
      name.className="weekday-name";name.textContent=labels[i];
      button.append(title,mark,name);
      if(latest)button.addEventListener("click",()=>openHistoryItem(latest));
      container.appendChild(button);
    }
  }

  function openHistoryItem(item) {
    if (!item) return;
    window.uzelHistoryReplay = true;
    try {
      const positions=Array.isArray(item.positions)&&item.positions.length===item.cards.length
        ? item.positions : item.cards.map((_,i)=>"Карта "+(i+1));
      displayReading({
        cards:item.cards,
        positions,
        interpretation:item.interpretation
      },item.question||"");
    } finally {
      window.uzelHistoryReplay = false;
    }
  }

  function renderHistory() {
    const list=el("history-list");
    if (!list) return;
    list.replaceChildren();
    const records=safeLoad();
    if (!records.length) {
      const wrap=document.createElement("div");
      wrap.className="empty-state";
      wrap.innerHTML='<img alt="" src="./assets/uzel-knot.svg"><h2>Пока ни одного узла</h2><p>После первого расклада он появится здесь — вместе с вопросом и трактовкой.</p>';
      list.appendChild(wrap);
      return;
    }
    records.forEach(item=>{
      const row=document.createElement("button");row.type="button";row.className="history-entry";
      const image=document.createElement("img");
      image.src="./images/"+(cardImageMap[item.cards[0]]||"rubashka.png");
      image.alt=item.cards[0]||"Карта Таро"; image.loading="lazy";
      const middle=document.createElement("span");middle.className="history-copy";
      const title=document.createElement("strong");
      title.textContent=item.question || (item.cards.length===1?"Одна карта":"Расклад на "+item.cards.length+" карты");
      const subtitle=document.createElement("small");
      const date=new Date(item.savedAt);
      subtitle.textContent=item.cards.length+" "+(item.cards.length===1?"карта":item.cards.length===2?"карты":"карты")+" · "+(Number.isNaN(date.getTime())?"":date.toLocaleDateString("ru-RU"));
      middle.append(title,subtitle);
      const arrow=document.createElement("span");arrow.className="arrow";arrow.textContent="›";
      row.append(image,middle,arrow);
      row.addEventListener("click",()=>openHistoryItem(item));
      list.appendChild(row);
    });
  }

  function syncHomeModes(next) {
    homeModes.forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.homeMode===next)));
    const start=el("start");
    if (start) start.textContent=namesForMode[next]||"Начать расклад";
  }

  window.uzelSyncHomeModes=syncHomeModes;

  window.uzelOnShow=function (view) {
    const navView = ({setup:"setup",draw:"setup",result:"setup",home:"home",history:"history",tarologist:"tarologist"})[view]||"home";
    tabs.forEach(t=>t.setAttribute("aria-selected",String(t.dataset.tab===navView)));
    const eyebrow=el("screen-label");
    if (eyebrow) eyebrow.textContent=({
      home:"ТВОЯ НИТЬ",setup:"РАСКЛАД · НОВЫЙ ВОПРОС",
      draw:"РАСКЛАД · ВЫБОР КАРТ",result:"РАСКЛАД · ТРАКТОВКА",
      history:"ИСТОРИЯ",tarologist:"ТАРОЛОГ"
    })[view] || "MYSTIC TAROT";
    if (["home","setup","history","tarologist"].includes(view)) dailyFlowPending = false;
    if (view==="home"){updateToday();updateThread();renderWeek();}
    if (view==="history") renderHistory();
  };

  function updateTelegramTheme() {
    const theme=tg?(tg.colorScheme==="light"?"paper":"night"):"paper";
    document.documentElement.dataset.uzelTheme=theme;
    const themeColor=document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.content=theme==="paper"?"#f2eee6":"#191519";
  }

  tabs.forEach(button=>button.addEventListener("click",function(){
    const tab=button.dataset.tab;
    if (tab==="history") renderHistory();
    show(tab);
  }));
  homeModes.forEach(button=>button.addEventListener("click",function(){
    setMode(button.dataset.homeMode);
  }));
  const recent=el("thread-recent");
  if (recent) recent.addEventListener("click",function(){
    const latest=safeLoad()[0];
    if(latest)openHistoryItem(latest);
    else show("setup");
  });
  const all=el("view-all");
  if (all) all.addEventListener("click",function(){renderHistory();show("history")});
  const newQuestion=el("thread-new");
  if (newQuestion) newQuestion.addEventListener("click",function(){show("setup")});
  const todayTab=el("thread-today");
  if (todayTab) todayTab.addEventListener("click",()=>openToday());
  const homeQuestion=el("home-question");
  const start=el("start");
  if (start && homeQuestion) start.addEventListener("click",function(){
    const v=homeQuestion.value.trim();
    if (v) {
      el("question").value=v.slice(0,350);
      el("counter").textContent=String(el("question").value.length);
    }
  });
  const homeQuestionEl=el("home-question");
  if(homeQuestionEl)homeQuestionEl.addEventListener("input",function(){
    this.style.height="45px";
    this.style.height=Math.max(45,Math.min(this.scrollHeight,116))+"px";
  });
    const dailyButton=el("daily-card-button");
  if (dailyButton) dailyButton.addEventListener("click",openToday);
  const dailyLink=el("today-link");
  if (dailyLink) dailyLink.addEventListener("click",openToday);
  function openToday() {
    const daily=safeLoad().find(x=>x.kind==="daily"&&isToday(x.savedAt));
    if (daily) { openHistoryItem(daily);return; }
    dailyFlowPending = true;
    setMode("one");
    el("question").value="Что мне важно заметить сегодня?";
    el("counter").textContent=String(el("question").value.length);
    resetCards();
    show("draw");
  }

  document.querySelectorAll("[data-question-preset]").forEach(button=>{
    button.addEventListener("click",function(){
      const value=({
        career:"Что мне важно понять о моей работе сейчас?",
        relationships:"Что происходит в моих отношениях?",
        decision:"На что опереться при выборе?"
      })[button.dataset.questionPreset];
      if (!value) return;
      el("question").value=value;
      el("counter").textContent=String(value.length);
      if (button.dataset.questionPreset==="career" && mode==="three") el("layout").value="career";
      if (button.dataset.questionPreset==="relationships" && mode==="three") el("layout").value="relationships";
      if (button.dataset.questionPreset==="decision" && mode==="three") el("layout").value="decision";
      el("question").focus();
    });
  });
  const toBot=el("return-to-bot");
  if (toBot) toBot.addEventListener("click",function(){
    if(tg && typeof tg.close==="function") tg.close();
    else window.location.href="https://t.me/mystictarotcards_bot";
  });

  updateTelegramTheme();
  if(tg&&typeof tg.onEvent==="function")tg.onEvent("themeChanged",updateTelegramTheme);
  syncHomeModes(mode);
  updateToday();
  updateThread();
  renderWeek();
  window.uzelOnShow("home");
})();
