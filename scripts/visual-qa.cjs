/* Visual QA for Uzел+ Mini App: Figma 390px reference, 320px narrow. */
"use strict";
const http=require("node:http");
const fs=require("node:fs");
const path=require("node:path");
const assert=require("node:assert/strict");
const {chromium}=require("playwright-core");
const root=process.cwd();
const screenshots=path.join(root,"qa","screenshots");
fs.mkdirSync(screenshots,{recursive:true});
const mime={".html":"text/html",".js":"text/javascript",".css":"text/css",".png":"image/png",".svg":"image/svg+xml",".jpg":"image/jpeg"};
const server=http.createServer((req,res)=>{
  const uri=decodeURIComponent((req.url||"/").split("?")[0]);
  const file=path.join(root,uri==="/"?"/index.html":uri);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
  fs.readFile(file,(err,data)=>{
    if(err){res.writeHead(404).end("Not found");return}
    res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream","Cache-Control":"no-store"});
    res.end(data);
  });
});
(async()=>{
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const base="http://127.0.0.1:"+server.address().port+"/";
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||"/usr/bin/google-chrome",args:["--no-sandbox"]});
  const errors=[];
  async function makePage(theme,width=390,height=741){
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,colorScheme:theme==="night"?"dark":"light",isMobile:true,hasTouch:true});
    if(theme==="night")await context.addInitScript(()=>{window.Telegram={WebApp:{colorScheme:"dark",ready(){},expand(){},onEvent(){},HapticFeedback:{selectionChanged(){}}}}});
    const page=await context.newPage();
    page.on("pageerror",error=>errors.push(error.message));
    await page.route("https://telegram.org/js/telegram-web-app.js",route=>route.fulfill({status:200,contentType:"text/javascript",body:"/* Telegram is supplied by the environment */"}));
    await page.goto(base,{waitUntil:"domcontentloaded"});
    await page.locator("#home.active").waitFor();
    await page.evaluate(()=>document.fonts.ready);
    return {page,context};
  }
  function checkLayout(rect,label,strict=true){
    assert(rect.docWidth<=rect.viewWidth+1,label+": horizontal overflow "+JSON.stringify(rect));
    assert(rect.tabTop>rect.mainTop,label+": invalid tab top");
    if(strict)assert(rect.startBottom<=rect.tabTop+1,label+": CTA behind tab "+JSON.stringify(rect));
  }
  async function measurements(page){
    return page.evaluate(()=>{
      const box=s=>document.querySelector(s)?.getBoundingClientRect();
      const start=box("#start"),tab=box(".tab-bar"),main=box("#home");
      return {docWidth:document.documentElement.scrollWidth,viewWidth:innerWidth,tabTop:tab?.top,mainTop:main?.top,startBottom:start?.bottom,dayCardWidth:box("#daily-card-button")?.width};
    });
  }
  const today=new Date().toISOString();
  const daily={id:"test-daily",savedAt:today,kind:"daily",cards:["Верховная Жрица (II)"],question:"Что мне важно заметить сегодня?",interpretation:"Ответ уже внутри — дай ему прозвучать. У тебя уже достаточно информации, чтобы услышать собственную интуицию.",positions:["Главная тема"]};
  for(const theme of ["paper","night"]){
    const {page,context}=await makePage(theme);
    const old=await measurements(page);checkLayout(old,theme+" closed");
    await page.screenshot({path:path.join(screenshots,theme+"-closed-390.png")});
    const cardSrc=await page.locator("#today-image").getAttribute("src");
    assert(cardSrc.includes(theme==="paper"?"journal-card-back":"night-card-back"));
    await page.evaluate(x=>localStorage.setItem("mystic-tarot-uzel-history-v1",JSON.stringify([x])),daily);
    await page.reload({waitUntil:"domcontentloaded"});
    await page.evaluate(()=>document.fonts.ready);
    assert.equal(await page.locator("#home").getAttribute("data-daily"),"true");
    checkLayout(await measurements(page),theme+" opened");
    const openedRects=await page.evaluate(()=>{
      const rect=s=>document.querySelector(s).getBoundingClientRect();
      const title=rect("#today-title"),text=rect("#today-description"),action=rect("#today-link"),question=rect("#home-question");
      return {titleBottom:title.bottom,textTop:text.top,textBottom:text.bottom,actionTop:action.top,actionBottom:action.bottom,questionTop:question.top};
    });
    assert(openedRects.titleBottom<=openedRects.textTop+3,theme+" title overlaps description: "+JSON.stringify(openedRects));
    assert(openedRects.textBottom<openedRects.questionTop-8,theme+" daily text overlaps question: "+JSON.stringify(openedRects));
    assert(openedRects.actionBottom<openedRects.questionTop-8,theme+" day action overlaps question: "+JSON.stringify(openedRects));
    await page.screenshot({path:path.join(screenshots,theme+"-opened-390.png")});
    await page.locator("#today-link").click();
    assert(await page.locator("#result.active").count()===1,theme+" opened reading did not navigate");
    await page.screenshot({path:path.join(screenshots,theme+"-result.png")});
    await context.close();
  }
  {
    const {page,context}=await makePage("paper",320,600);
    const r=await measurements(page);checkLayout(r,"paper narrow",false);
    await page.screenshot({path:path.join(screenshots,"paper-closed-320.png")});
    await context.close();
  }
  {
    const {page,context}=await makePage("night",320,600);
    const r=await measurements(page);checkLayout(r,"night narrow",false);
    await page.screenshot({path:path.join(screenshots,"night-closed-320.png")});
    await context.close();
  }
  {
    const {page,context}=await makePage("night");
    await page.locator('[data-home-mode="one"]').click();
    await page.locator("#start").click();
    assert.equal(await page.locator("#cards .card").count(),1);
    await page.locator("#cards .card").first().click();
    assert(await page.locator("#submit").isEnabled());
    const cardWidth=await page.locator("#cards .card").first().evaluate(el=>el.getBoundingClientRect().width);
    assert(cardWidth<=165,"one-card layout too wide: "+cardWidth);
    const actions=await page.evaluate(()=>({reshuffleBottom:document.querySelector("#reshuffle").getBoundingClientRect().bottom,tabTop:document.querySelector(".tab-bar").getBoundingClientRect().top}));
    assert(actions.reshuffleBottom<=actions.tabTop+1,"one-card actions behind bottom nav: "+JSON.stringify(actions));
    await page.screenshot({path:path.join(screenshots,"night-draw-one.png")});
    await page.locator("#submit").scrollIntoViewIfNeeded();
    assert(await page.locator("#submit").isVisible());
    await context.close();
  }
  {
    const {page,context}=await makePage("paper");
    await page.locator("#start").click();
    assert.equal(await page.locator("#cards .card").count(),3);
    for(let i=0;i<3;i++)await page.locator("#cards .card").nth(i).click();
    assert(await page.locator("#submit").isEnabled());
    await page.screenshot({path:path.join(screenshots,"paper-draw-three.png")});
    await context.close();
  }
  assert.equal(errors.length,0,"Uncaught browser errors: "+errors.join("; "));
  await browser.close();
  console.log("Visual QA passed: responsive pages, real daily state, accessible actions, no horizontal overflow. Screenshots in qa/screenshots.");
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>server.close());
