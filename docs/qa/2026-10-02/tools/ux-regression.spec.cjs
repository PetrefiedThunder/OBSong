const path=require('node:path'),{createRequire}=require('node:module');
const req=createRequire(path.join(process.env.QA_BROWSER_TOOLS||'/private/tmp/obsong-qa-tools','package.json'));
const {test,expect}=req('@playwright/test');
test.beforeEach(async({context,baseURL})=>{
 await context.route('**/*',r=>new URL(r.request().url()).origin===new URL(baseURL).origin?r.continue():r.abort('blockedbyclient'));
});
test('empty studio cannot generate notes before an image is analyzed',async({page})=>{
 await page.goto('/studio');
 await expect(page.getByRole('heading',{name:'Studio',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Generate Composition'})).toBeDisabled();
});
test('scene demo loads locally and enables MIDI export',async({page})=>{
 await page.goto('/studio');
 await page.getByRole('button',{name:/Ocean Horizon/}).click();
 await page.getByRole('button',{name:'Play Demo',exact:true}).click();
 await expect(page.getByRole('button',{name:'Save to Library'})).toBeVisible();
 const downloaded=page.waitForEvent('download');
 await page.getByRole('button',{name:'Export as MIDI'}).click();
 const file=await downloaded;
 expect(file.suggestedFilename()).toMatch(/\.mid$/);
});
test('UX-001 sign-in dialog keeps keyboard focus inside',async({page})=>{
 await page.goto('/compositions');
 await page.getByRole('button',{name:'Sign In',exact:true}).click();
 await expect(page.getByRole('dialog')).toBeVisible();
 test.fail(true,'UX-001: modal has no focus containment.');
 await page.getByRole('dialog').getByRole('button',{name:'Sign In',exact:true}).focus();
 await page.keyboard.press('Tab');
 expect(await page.evaluate(()=>!!document.activeElement.closest('[role=dialog]'))).toBe(true);
});
test('UX-002 selected musical key exposes pressed state',async({page})=>{
 await page.goto('/studio');
 await page.getByRole('button',{name:'D',exact:true}).click();
 test.fail(true,'UX-002: selection is represented by CSS color only.');
 await expect(page.getByRole('button',{name:'D',exact:true})).toHaveAttribute('aria-pressed','true');
});

test('UX-003 home controls meet WCAG AA text contrast',async({page})=>{
 await page.goto('/');
 await expect(page.getByRole('heading',{name:'Turn Images into Musical Landscapes'})).toBeVisible();
 await page.evaluate(require('node:fs').readFileSync(req.resolve('axe-core/axe.min.js'),'utf8'));
 const violations=await page.evaluate(async()=>(await axe.run(document,{runOnly:['color-contrast']})).violations);
 test.fail(true,'UX-003: accent buttons and badges have insufficient text contrast.');
 expect(violations).toEqual([]);
});
test('UX-006 Play Demo begins playback',async({page})=>{
 await page.goto('/studio');
 await page.getByRole('button',{name:/Ocean Horizon/}).click();
 await page.getByRole('button',{name:'Play Demo',exact:true}).click();
 await expect(page.getByRole('button',{name:'Save to Library'})).toBeVisible();
 test.fail(true,'UX-006: Play Demo loads notes but does not start playback.');
 await expect(page.getByRole('button',{name:'⏹ Stop',exact:true})).toBeEnabled();
});
