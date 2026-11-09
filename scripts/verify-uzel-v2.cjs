// Visual regression smoke checks for the Telegram Mini App.
// Executed against the static files on the PR branch. No backend requests.
const {chromium}=require("playwright");
const fs=require("node:fs");
const assert=require("node:assert/strict");
const path=require("node:path");
const BASE="http://127.0.0.1:8765/";
const OUT="ui-preview";
fs.mkdirSync(OUT,{recursive:true});
const widths=[320,360,390,430];
const logs=[];
function rect(v){return {x:v.x,y:v.y,right:v.right,bottom:v.bottom,width:v.width,height:v.height}}
(async()=>{
  const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
  try {
    for(const theme of ["light","dark"]){
      for(const width of widths){
        const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:1});
        const errors=[];
        page.on("pageerror",e=>errors.push(e.message));
        await page.addInitScript((scheme)=>{
          window.Telegram={WebApp:{
            colorScheme:scheme,ready(){},expand(){},onEvent(){},close(){},
            HapticFeedback:{selectionChanged(){}}
          }};
        },theme);
        await page.goto(BASE,{waitUntil:"networkidle"});
        // Hosted Telegram script may replace the test stub. Assert each Figma theme directly.
        await page.evaluate((scheme)=>{document.documentElement.dataset.uzelTheme=scheme==="dark"?"night":"paper";},theme);
        await page.evaluate(async()=>{await document.fonts.ready});
        const info=await page.evaluate(()=>{
          const box=(selector)=>{
            const el=document.querySelector(selector);
            if(!el)return null;
            const b=el.getBoundingClientRect();
            return {x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:b.width,height:b.height}
          };
          return {
            scrollWidth:document.documentElement.scrollWidth,
            innerWidth:innerWidth,
            home:box("#home"),today:box(".today-tile"),question:box("#home-question"),
            modes:box(".home-modes"),action:box(".home-actions"),week:box(".week-history"),
            nav:box(".tab-bar"),title:box("#today-title"),
            view:document.querySelector(".view.active")?.id,
            images:[...document.querySelectorAll("#home img")].map(x=>({src:x.src,loaded:x.complete,naturalWidth:x.naturalWidth}))
          };
        });
        assert.equal(info.view,"home");
        assert(info.scrollWidth<=width+1,theme+" / "+width+" px horizontal overflow "+JSON.stringify(info));
        for(const key of ["today","question","modes","action","week","nav"]){
          assert(info[key] && info[key].width>0,theme+" / "+width+" missing "+key);
        }
        assert(info.today.bottom <= info.question.y+1,theme+" / "+width+" today overlaps question");
        assert(info.question.bottom <= info.modes.y+1,theme+" / "+width+" question overlaps modes");
        assert(info.modes.bottom <= info.action.y+1,theme+" / "+width+" modes overlap CTA");
        assert(info.action.bottom <= info.week.y+1,theme+" / "+width+" CTA overlaps history");
        assert(info.nav.y >= 0,theme+" / "+width+" nav out of screen");
        assert(info.action.right<=width+1 && info.action.x>=-1,"action outside screen");
        assert.equal(errors.length,0,theme+" / "+width+" JS errors: "+errors.join("; "));
        const file=path.join(OUT,theme+"-home-"+width+".png");
        await page.screenshot({path:file,fullPage:true});
        logs.push({theme,width,view:"home",...info});
        if(width===390){
          // Verify both open and closed daily-card compositions, using actual client storage.
          await page.evaluate(()=>{
            localStorage.setItem("mystic-tarot-uzel-history-v1",JSON.stringify([{
              savedAt:new Date().toISOString(),id:"test-daily",kind:"daily",
              cards:["Верховная Жрица (II)"],question:"Что мне важно заметить сегодня?",
              positions:["Главная тема"],interpretation:"Посмотри на то, что уже знаешь."
            }]));
          });
          await page.reload({waitUntil:"networkidle"});
          await page.evaluate((scheme)=>{document.documentElement.dataset.uzelTheme=scheme==="dark"?"night":"paper";},theme);
          assert(await page.locator(".today-tile.is-open").count()===1,"Daily card opened state missing");
          assert(await page.locator("#today-title").innerText()==="Верховная Жрица","Daily card title missing");
          await page.screenshot({path:path.join(OUT,theme+"-daily-open-390.png"),fullPage:true});
          logs.push({theme,width,view:"daily-open"});
          // One-card flow and visible geometry after reveal.
          await page.locator('[data-home-mode="one"]').click();
          await page.locator("#home-question").fill("Какой настрой выбрать сегодня?");
          await page.locator("#start").click();
          assert(await page.locator("#draw").isVisible(),"home CTA did not open cards");
          assert((await page.locator("#draw-question").innerText()).includes("Какой настрой выбрать сегодня?"),"question was not carried into draw");
          const cards=page.locator("#cards .card");
          assert.equal(await cards.count(),1,"single-card draw is not single");
          await cards.first().click();
          assert(await cards.first().evaluate(n=>n.classList.contains("picked")),"card not revealed");
          const bounds=await cards.first().boundingBox();
          assert(bounds && bounds.width<=191 && bounds.height<=330,"card is too large: "+JSON.stringify(bounds));
          await page.screenshot({path:path.join(OUT,theme+"-draw-390.png"),fullPage:true});
          logs.push({theme,width,view:"draw",card:bounds});
        }
        await page.close();
      }
    }
    fs.writeFileSync(path.join(OUT,"geometry.json"),JSON.stringify(logs,null,2));
    process.stdout.write("Visual smoke tests passed: "+widths.length*2+" mobile home sizes, 2 draw screens.\n");
  }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
