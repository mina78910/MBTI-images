const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
async function checkImageOnlyView(page, term, count) {
 await page.locator('#imageOnlyToggle').check();
 await page.locator('#searchInput').fill(term);
 assert.equal(await page.locator('#gallery .viewer-card').count(),count);
 assert(await page.locator('#searchInput').isVisible());
 assert(await page.locator('#gallery .card-details').first().isHidden());
 assert.equal(await page.locator('#gallery .viewer-card').first().evaluate(el=>getComputedStyle(el).boxShadow),'none');
 await page.waitForFunction(()=>document.querySelector('#gallery img').naturalWidth===640);
 const dimensions=await page.locator('#gallery img').first().evaluate(el=>({width:el.clientWidth,height:el.clientHeight}));
 assert(Math.abs(dimensions.height/dimensions.width-360/640)<0.02);
 await page.locator('#excludeSearchInput').evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}))},term);
 assert.equal(await page.locator('#gallery .viewer-card').count(),0);
 await page.locator('#excludeSearchInput').evaluate(el=>{el.value='';el.dispatchEvent(new Event('input',{bubbles:true}))});
 assert.equal(await page.locator('#gallery .viewer-card').count(),count);
 assert(await page.locator('#gallery .card-details').first().isHidden());
 await page.locator('#imageOnlyToggle').uncheck();
 assert(await page.locator('#gallery .card-details').first().isVisible());
 assert.equal(await page.locator('#searchInput').inputValue(),term);
 await page.locator('#imageOnlyToggle').check();
}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try {
 for (const viewport of [{width:1280,height:800},{width:390,height:844}]) {
  const page=await browser.newPage({viewport}); const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://www.gstatic.com/**',async route=>{
   const name=route.request().url().match(/firebase-(\w+)\.js/)[1];
   const src=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
   const imports=src.match(new RegExp('import \\{([^}]+)\\} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-'+name+'\\.js"'))[1].split(',').map(s=>s.trim());
   const body=imports.map(n=> n==='GoogleAuthProvider'?'export class GoogleAuthProvider {}':n==='onAuthStateChanged'?'export function onAuthStateChanged(auth,cb){cb(null)}':n==='onSnapshot'?'export function onSnapshot(q,cb){cb({docs:Array.from({length:40},(_,i)=>({id:String(i),data:()=>({title:"Image "+i,tags:[i%2?"odd":"even"],sortOrder:i,createdAt:{seconds:i},imageUrl:"data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%27640%27%20height=%27360%27%3E%3C/svg%3E"})}))})}':`export function ${n}(){return {}}`).join('\n');
   await route.fulfill({contentType:'application/javascript',body});
  });
  await page.goto('http://127.0.0.1:8000'); await page.waitForFunction(()=>document.querySelectorAll('#gallery .viewer-card').length===40);
  // Filtered dataset, including exclusion, remains the only rendered slideshow content.
  await page.locator('#searchInput').fill('even'); assert.equal(await page.locator('#gallery .viewer-card').count(),20);
  await checkImageOnlyView(page,'even',20);
  await page.locator('#slideshowToggle').click();await page.waitForTimeout(700);
  assert(await page.locator('#toolbar #slideshowControls').count()===1);
  assert.equal(await page.locator('#slideshowControls').evaluate(el=>getComputedStyle(el).position),'static');
  assert(await page.evaluate(()=>scrollY)>10);assert.equal(await page.locator('#slideshowToggle').getAttribute('aria-pressed'),'true');
  assert(await page.locator('#imageOnlyToggle').isChecked());
  assert(await page.locator('#gallery .card-details').first().isHidden());
  const p1=await page.evaluate(()=>scrollY);await page.locator('#slideshowSpeed').selectOption('80');await page.waitForTimeout(700);const p2=await page.evaluate(()=>scrollY);assert(p2-p1>40);
  await page.locator('#slideshowToggle').click();const stopped=await page.evaluate(()=>scrollY);await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>scrollY),stopped);
  // Large cards still scroll without changing their size.
  await page.locator('#sizeRange').evaluate(el=>{el.value='1180';el.dispatchEvent(new Event('input',{bubbles:true}))});
  await page.locator('#slideshowToggle').click();await page.waitForTimeout(400);assert.equal(await page.locator('#sizeRange').inputValue(),'1180');await page.keyboard.press('Escape');assert.equal(await page.locator('#slideshowToggle').getAttribute('aria-pressed'),'false');
  // The rotated portrait shell is the scroll target, rather than the document.
  if(viewport.width<560){
   await page.evaluate(()=>{document.body.classList.add('landscape-view');document.querySelector('.app-shell').scrollTop=0});
   await page.locator('#slideshowToggle').click();await page.waitForTimeout(600);assert(await page.locator('.app-shell').evaluate(el=>el.scrollTop)>20);
   assert.equal(await page.locator('#toolbar #slideshowControls').count(),1);
   await page.locator('#slideshowToggle').click();await page.evaluate(()=>document.body.classList.remove('landscape-view'));
  }
  // Changing the filter to no results stops playback.
  await page.locator('#slideshowToggle').click();await page.locator('#searchInput').fill('missing');await page.waitForTimeout(100);assert.equal(await page.locator('#slideshowToggle').getAttribute('aria-pressed'),'false');assert.equal(await page.locator('#slideshowStatus').innerText(),'表示対象がありません');
  await page.locator('#searchInput').fill('even');
  await page.locator('#slideshowToggle').click();await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));await page.waitForTimeout(200);assert.equal(await page.locator('#slideshowStatus').innerText(),'最後まで表示しました');
  assert.deepEqual(errors,[]); console.log('PASS modern image-only toggle, aspect ratio, include/exclude filters, slideshow speed, stop, large cards, empty, end'+(viewport.width<560?', rotated shell':'')+' '+viewport.width);await page.close();
 }
 // Run the real legacy viewer with a deterministic read-only Firestore response.
 const legacy=await browser.newPage({viewport:{width:390,height:844}});
 await legacy.route('http://127.0.0.1:8000/', route=>{
  const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8')
   .replace(/<script type="module">[\s\S]*?<\/script>/, '')
   .replace('script nomodule src="legacy-viewer.js"','script src="legacy-viewer.js"');
  return route.fulfill({contentType:'text/html',body:html});
 });
 await legacy.route('https://firestore.googleapis.com/**',route=>route.fulfill({json:{documents:Array.from({length:30},(_,i)=>({name:'materials/'+i,fields:{title:{stringValue:'Image '+i},tags:{arrayValue:{values:[{stringValue:i%2?'odd':'even'}]}},imageUrl:{stringValue:'data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%27640%27%20height=%27360%27%3E%3C/svg%3E'}}}))}}));
 await legacy.goto('http://127.0.0.1:8000/');
 await legacy.waitForFunction(()=>document.querySelectorAll('#gallery .viewer-card').length===30);
 await legacy.locator('#searchInput').fill('odd');assert.equal(await legacy.locator('#gallery .viewer-card').count(),15);
 await checkImageOnlyView(legacy,'odd',15);
 await legacy.locator('#slideshowToggle').click();await legacy.waitForTimeout(600);assert(await legacy.evaluate(()=>scrollY)>10);
 await legacy.keyboard.press('Escape');assert.equal(await legacy.locator('#slideshowToggle').getAttribute('aria-pressed'),'false');
 console.log('PASS legacy image-only toggle, aspect ratio, include/exclude filters, scrolling and stop');await legacy.close();
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
