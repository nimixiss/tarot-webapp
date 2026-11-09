/* «Узел+» v2 — timeline built from saved local readings, no fabricated history. */
"use strict";
(function () {
  const historyKey="mystic-tarot-uzel-history-v1";
  const labels=["пн","вт","ср","чт","пт","сб","вс"];
  function items() {
    try {
      const list=JSON.parse(localStorage.getItem(historyKey)||"[]");
      return Array.isArray(list)?list:[];
    } catch (_) {return [];}
  }
  function localDateKey(value) {
    const date=new Date(value);
    if(Number.isNaN(date.getTime()))return "";
    return [date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");
  }
  function renderWeek() {
    const parent=document.getElementById("week-days");
    if(!parent)return;
    parent.replaceChildren();
    const now=new Date();
    const monday=new Date(now.getFullYear(),now.getMonth(),now.getDate()-(now.getDay()+6)%7);
    const records=items();
    const todayKey=localDateKey(now);
    for(let i=0;i<7;i++){
      const d=new Date(monday.getFullYear(),monday.getMonth(),monday.getDate()+i);
      const key=localDateKey(d);
      const dayRecords=records.filter(r=>r&&localDateKey(r.savedAt)===key);
      const btn=document.createElement("button");
      btn.type="button";
      btn.className="week-day"+(dayRecords.length?" has-event":"")+(dayRecords.length>1?" multi":"")+(key===todayKey?" is-today":"");
      btn.setAttribute("aria-label",labels[i]+", "+d.toLocaleDateString("ru-RU")+
        (dayRecords.length?", раскладов: "+dayRecords.length:""));
      const topic=document.createElement("span");
      topic.className="topic";
      if(dayRecords.length) {
        const recent=dayRecords[0];
        const name=(recent.kind==="daily"?"карта дня":recent.question?.trim()||"расклад");
        topic.textContent=name.length>18?name.slice(0,16)+"…":name;
      }
      let symbol;
      if(dayRecords.length) {
        symbol=document.createElement("img");
        symbol.src=dayRecords.length>1?"./assets/v2-week-double.svg":"./assets/v2-week-knot.svg";
        symbol.alt="";
      } else {
        symbol=document.createElement("span");
      }
      symbol.className="symbol";
      const label=document.createElement("span");label.className="day-label";label.textContent=labels[i];
      btn.append(topic,symbol,label);
      if(dayRecords.length)btn.addEventListener("click",function(){show("history");});
      else btn.disabled=true;
      parent.append(btn);
    }
  }
  const oldShow=window.uzelOnShow;
  window.uzelOnShow=function(view){
    if(typeof oldShow==="function")oldShow(view);
    if(view==="home")renderWeek();
  };
  const oldSave=window.uzelSaveReading;
  window.uzelSaveReading=function(data){
    if(typeof oldSave==="function")oldSave(data);
    renderWeek();
  };
  const field=document.getElementById("home-question");
  if(field)field.addEventListener("input",function(){
    field.style.height="42px";
    field.style.height=Math.min(Math.max(field.scrollHeight,42),88)+"px";
    field.style.overflowY=field.scrollHeight>88?"auto":"hidden";
  });
  renderWeek();
})();
