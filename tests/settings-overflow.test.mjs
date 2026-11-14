import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('Raafat branding shows no SYS suffix anywhere in visible app',()=>{
 const source=readFileSync(new URL('../app.js',import.meta.url),'utf8')
  .replace(/^import[^\n]*\n/,'').replace(/\nbootstrap\(\);\s*$/,'');
 const page={innerHTML:''};
 const doc={title:'',querySelector:q=>q==='#app'?page:null,querySelectorAll:()=>[],
  createElement:()=>({style:{},remove(){}}),body:{append(){}}};
 const app=new Function('localStorage','document','crypto','createClient','window',source+
  '\nreturn {s,render,settings,shell,authPage};'
 )({getItem:()=>null,setItem:()=>{}},doc,{randomUUID:()=> 'uid'},()=>{}, {});
 app.s.demo=true;app.s.staff={role:'admin'};app.s.view='settings';
 app.render();
 assert.match(page.innerHTML,/رأفت/);
 assert.doesNotMatch(page.innerHTML,/<span class="brand-sys">SYS<\/span>/);
 assert.doesNotMatch(page.innerHTML,/RAAFAT SYS/);
 assert.equal(doc.title,'رأفت | نظام الإدارة');
 assert.doesNotMatch(app.authPage(),/Sys\./i);
 assert.match(app.settings(),/name="company_logo_file"/,'logo upload still available');
});

test('logo picker is visually clipped without causing 10000px sideways whitespace',()=>{
 const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
 const styles=[...css.matchAll(/\.settings-file-input\s*\{([^}]+)\}/g)];
 assert.ok(styles.length,'logo input should have visually hidden styling');
 const picker=styles.at(-1)[1];
 assert.doesNotMatch(picker, /left\s*:\s*-\d{3,}px/i);
 assert.match(picker,/clip-path\s*:\s*inset\(50%\)/);
 assert.match(css,/\.settings-page\{width:100%;overflow-x:clip\}/);
 assert.match(css,/\.settings-logo-fields\{[^}]*position:relative/);
 assert.match(css,/\.settings-page input,\.settings-page textarea\{min-width:0;max-width:100%\}/);
});
