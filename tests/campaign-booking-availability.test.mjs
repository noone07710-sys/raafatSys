import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../app.js',import.meta.url),'utf8')
 .replace(/^import[^\n]*\n/,'').replace(/\nbootstrap\(\);\s*$/,'');
function setup(){
 const app=new Function('localStorage','document','crypto','createClient','window','FormData','File',
  source+'\nreturn {s,campaignBookingPeriod,overlappingBookingPeriods,campaignSiteConflict,selectedSiteCards,reservedCampaignChoices,removeUnavailableCampaignChoices};'
 )({getItem:()=>null,setItem:()=>{}},{baseURI:'https://example.test/raafatSys/'},
  {randomUUID:()=> 'test-id'},()=>{},{},class{},class{});
 app.s.demo=true;
 app.s.staff={role:'admin'};
 app.s.data.packages=[{id:'pA',code:'A',name:'الباقة A',pricing_mode:'fixed_term'}];
 app.s.data.ad_sites=[
  {id:'site1',code:'A-1',name:'لوحة محجوزة',package_id:'pA',active:true,site_type:'roadside',governorate:'صلاح الدين',address:'تكريت'},
  {id:'site2',code:'A-2',name:'لوحة متاحة',package_id:'pA',active:true,site_type:'roadside',governorate:'صلاح الدين',address:'سامراء'}
 ];
 app.s.data.campaigns=[{id:'active',title:'حملة مستمرة',start_date:'2026-11-15',months:3}];
 app.s.data.campaign_sites=[{campaign_id:'active',site_id:'site1'}];
 const draft={package_id:'pA',start_date:'2026-12-01',months:3,quantity:1};
 app.s.modal={table:'campaigns',data:draft,siteIds:[]};
 return {app,draft};
}

test('hides booked boards and shows only available boards for overlapping new campaigns',()=>{
 const {app,draft}=setup();
 const html=app.selectedSiteCards(draft);
 assert.doesNotMatch(html,/data-site-id="site1"/);
 assert.match(html,/data-site-id="site2"/);
 assert.match(html,/1 قطعة محجوزة/);
 assert.equal(app.campaignSiteConflict('site1',draft).title,'حملة مستمرة');
});

test('a board becomes bookable immediately after the previous campaign period',()=>{
 const {app,draft}=setup();
 // Starting Nov 15 + three months means last occupied day is Feb 14.
 draft.start_date='2027-02-14';
 assert.ok(app.campaignSiteConflict('site1',draft));
 draft.start_date='2027-02-15';
 assert.equal(app.campaignSiteConflict('site1',draft),null);
 assert.match(app.selectedSiteCards(draft),/data-site-id="site1"/);
});

test('editing an existing campaign keeps its own booked site selectable',()=>{
 const {app,draft}=setup();
 draft.id='active';
 app.s.modal.siteIds=['site1'];
 assert.equal(app.campaignSiteConflict('site1',draft),null);
 assert.match(app.selectedSiteCards(draft),/data-site-id="site1" checked/);
});

test('conflicting selections are dropped, while unrelated selections remain',()=>{
 const {app,draft}=setup();
 app.s.modal.siteIds=['site1','site2'];
 const conflicts=app.removeUnavailableCampaignChoices(draft);
 assert.deepEqual(conflicts.map(x=>x.siteId),['site1']);
 assert.deepEqual(app.s.modal.siteIds,['site2']);
 assert.equal(app.reservedCampaignChoices(draft).length,0);
});

test('future reservations also block overlapping campaigns and never block different dates',()=>{
 const {app,draft}=setup();
 app.s.data.campaigns[0].start_date='2027-09-01';
 app.s.data.campaigns[0].months=6;
 draft.start_date='2027-08-01';
 draft.months=1;
 assert.equal(app.campaignSiteConflict('site1',draft),null);
 draft.months=3;
 assert.ok(app.campaignSiteConflict('site1',draft));
 draft.start_date='2028-03-01';
 assert.equal(app.campaignSiteConflict('site1',draft),null);
});
