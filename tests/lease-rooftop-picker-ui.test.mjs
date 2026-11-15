import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../app.js',import.meta.url),'utf8')
 .replace(/^import[^\n]*\n/,'').replace(/\nbootstrap\(\);\s*$/,'');
const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');

function harness(){
 const app={innerHTML:''};
 const document={
  title:'',baseURI:'https://example.test/raafatSys/',
  querySelector:selector=>selector==='#app'?app:null,
  querySelectorAll:()=>[],createElement:()=>({style:{},remove(){}}),
  body:{append(){}}
 };
 const out=new Function('localStorage','document','crypto','createClient','window',
  source+'\nreturn {s,rooftopSizeDetails,rooftopChoiceLabel,leasePropertyPicker,'+
   'optionText,fieldHtml,modalHtml,render,openForm};'
 )({getItem:()=>null,setItem:()=>{}},document,{randomUUID:()=> 'id-1'},()=>{},{});
 out.s.demo=true;
 out.s.staff={role:'admin'};
 out.s.data.landlords=[
  {id:'landlord-1',name:'مالك متعدد الأسطح'},
  {id:'landlord-2',name:'مالك ثاني'}
 ];
 out.s.data.properties=[
  {id:'roof-one',landlord_id:'landlord-1',title:'سطح شارع الزهور',
   width_m:5,height_m:4,area_m2:20,quantity:1,notes:'واجهة الشارع'},
  {id:'roof-two',landlord_id:'landlord-1',title:'سطح شارع الأربعين',
   width_m:10,height_m:3,area_m2:30,quantity:2,notes:'الواجهة المقابلة'},
  {id:'roof-other',landlord_id:'landlord-2',title:'سطح غير تابع للمالك',
   width_m:9,height_m:9,area_m2:81,quantity:7}
 ];
 return out;
}
test('every rooftop option explains actual dimensions, square meters and number of pieces',()=>{
 const app=harness();
 const first=app.rooftopChoiceLabel(app.s.data.properties[0]);
 const second=app.optionText('properties',app.s.data.properties[1]);
 assert.match(first,/سطح شارع الزهور/);
 assert.match(first,/5 × 4 م/);
 assert.match(first,/20 م²/);
 assert.match(first,/العدد 1/);
 assert.match(second,/10 × 3 م/);
 assert.match(second,/30 م²/);
 assert.match(second,/العدد 2/);
 assert.match(second,/مالك متعدد الأسطح/);
});
test('lease property selector stays empty until a landlord is chosen, then limits options to that landlord',()=>{
 const app=harness();
 app.s.modal={kind:'edit',table:'leases',data:{landlord_id:'',property_id:''}};
 const field=app.s.modal.data;
 const empty=app.fieldHtml(['property_id','عقار المالك','lookup:properties',true],field,field);
 assert.match(empty,/name="property_id" required disabled/);
 assert.doesNotMatch(empty,/roof-one/);
 field.landlord_id='landlord-1';
 const selected=app.fieldHtml(['property_id','عقار المالك','lookup:properties',true],field,field);
 assert.match(selected,/roof-one/);
 assert.match(selected,/roof-two/);
 assert.doesNotMatch(selected,/roof-other/);
 assert.match(selected,/10 × 3 م/);
 assert.match(selected,/30 م²/);
});
test('lease modal displays one detailed, selectable rooftop card per rooftop belonging to chosen owner',()=>{
 const app=harness();
 app.s.modal={kind:'edit',table:'leases',data:{
  landlord_id:'landlord-1',property_id:'roof-two',currency:'IQD',
  start_date:'2027-01-01',end_date:'2027-12-31',rent_total:1000000,
  advance_amount:0,payment_frequency:'annual',grace_days:14
 }};
 const cards=app.leasePropertyPicker(app.s.modal.data);
 assert.match(cards,/data-lease-property="roof-one"/);
 assert.match(cards,/data-lease-property="roof-two"/);
 assert.doesNotMatch(cards,/data-lease-property="roof-other"/);
 assert.match(cards,/سطح شارع الزهور/);
 assert.match(cards,/سطح شارع الأربعين/);
 assert.match(cards,/10 × 3 م/);
 assert.match(cards,/30 م²/);
 assert.match(cards,/العدد/);
 assert.match(cards,/aria-pressed="true"/);
 const html=app.modalHtml();
 assert.match(html,/الأسطح والعقارات المسجّلة للمالك/);
 assert.match(html,/data-lease-property="roof-two"/);
 assert.match(html,/المحدد حالياً/);
});
test('branded global selects, searchable popups and mobile sheets are configured across the app',()=>{
 assert.match(source,/function enhanceAppSelects\(\)/);
 assert.match(source,/document\.querySelectorAll\('select'\)/);
 assert.match(source,/function openAppSelectPopup\(select,trigger\)/);
 assert.match(source,/select\.dispatchEvent\(new Event\('change'/);
 assert.match(source,/role="listbox"/);
 assert.match(source,/placeholder="ابحث داخل الخيارات\.\.\."/);
 assert.match(css,/\.app-select-popup\{/);
 assert.match(css,/\.app-select-trigger\{/);
 assert.match(css,/\.raafat-toast-stack\{/);
 assert.match(css,/\.lease-roof-grid\{/);
 assert.match(css,/\.app-select-popup\{position:fixed!important;bottom:0!important/);
 assert.doesNotMatch(source,/\bwindow\.confirm\s*\(/);
 assert.doesNotMatch(source,/\bwindow\.alert\s*\(/);
});
