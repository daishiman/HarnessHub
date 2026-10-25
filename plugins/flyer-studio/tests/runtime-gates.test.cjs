"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const P=require("../scripts/project.cjs"),R=require("../scripts/render.cjs"),C=require("../scripts/checks.cjs"),A=require("../scripts/analysis.cjs"),{fixture}=require("./fixture.cjs");
function setup(t){const top=fs.mkdtempSync(path.join(os.tmpdir(),"flyer-runtime-"));t.after(()=>fs.rmSync(top,{recursive:true,force:true}));const dir=top+"/project";const p=fixture(dir);require("../scripts/essence.cjs").baseline(dir,{request:"試験用の確認済み依頼文"});return {dir,p};}
test("analysisMode decides the analysis gate for the fixture and a new init",t=>{const {dir,p}=setup(t);assert.equal(p.brief.analysisMode,"new-from-brief");assert.equal(A.assertApproved(dir,p).mode,"new-from-brief");const fresh=dir+"-new";P.init(fresh);const brief=P.read(fresh+"/brief.json");assert.equal(brief.analysisMode,"new-from-brief");assert.equal(A.assertApproved(fresh).mode,"new-from-brief");delete brief.analysisMode;P.write(fresh+"/brief.json",brief);assert.throws(()=>A.assertApproved(fresh),/analysisMode/);});
test("source-artifact production rejects missing analysis before opening a browser",async t=>{const {dir,p}=setup(t);p.brief.analysisMode="source-artifact";P.write(dir+"/brief.json",p.brief);await assert.rejects(()=>R.render(dir),/analysis.json/);assert.throws(()=>C.finalize(dir),/analysis.json/);assert.equal(P.read(dir+"/out/delivery.json").status,"pending");});
test("pending feedback blocks production",async t=>{const {dir,p}=setup(t);p.brief.feedback=[{id:"REQ01",kind:"required",request:"回答を第一主役として読みやすくする",source:{variantId:"F07",pngSha256:"a".repeat(64)},targets:["text:answer"],analysis:[{role:"typography",observation:"横回答の文字と入口の強弱を比較して確認する"}],decision:"pending",reason:"候補を比較中で採用方針が未確定のため待つ"}];P.write(dir+"/brief.json",p.brief);await assert.rejects(()=>R.render(dir),/未決/);});
test("vertical mode reaches HTML and defaults preserve horizontal writing",async t=>{const {p}=setup(t);assert.equal(P.validate(p).fail,0);const html=await R.html(p,p.scene.variants[0]);assert.match(html,/writing-mode:vertical-rl;text-orientation:mixed/);assert.match(html,/writing-mode:vertical-rl;text-orientation:upright/);assert.match(html,/writing-mode:horizontal-tb/);});
test("vertical writing without height or unsupported direction is rejected",t=>{const {p}=setup(t);delete p.scene.variants[0].texts.find(t=>t.ref==="lead").h;assert.ok(P.validate(p).fail);p.scene.variants[0].texts[0].writingMode="vertical-lr";assert.ok(P.validate(p).fail);});
test("rotation is explicitly unsupported",t=>{const {p}=setup(t);p.scene.variants[0].texts[0].rotation=12;assert.ok(P.validate(p).issues.some(i=>i.code==="unsupported-rotation"));});
test("render frozen fingerprint rejects input changed after start",t=>{const {dir,p}=setup(t),frozen=P.fingerprint(p);assert.doesNotThrow(()=>R.assertFrozen(dir,frozen));const brief=P.read(dir+"/brief.json");brief.copy.personal+=" ";P.write(dir+"/brief.json",brief);assert.throws(()=>R.assertFrozen(dir,frozen),/描画中/);});
test("render frozen fingerprint rejects changed source bytes",t=>{const {dir,p}=setup(t),frozen=P.fingerprint(p);const e=p.assets.entries.find(e=>e.kind==="photo");fs.appendFileSync(path.join(dir,e.file),"changed");assert.throws(()=>R.assertFrozen(dir,frozen),/描画中/);});

test("baseline削除はrenderとfinalizeの前で停止しcycle台帳を変えない", async t => {
  const { dir, p } = setup(t), frozen = P.fingerprint(p);
  C.cycleStatus(dir);
  const ledger = fs.readFileSync(dir + "/cycle-ledger.json", "utf8");
  fs.rmSync(dir + "/essence-baseline.json", { force: true });
  P.write(dir + "/out/delivery.json", { status: "complete", fail: 0 });
  await assert.rejects(() => R.render(dir), /essence-baseline.json.*ありません/);
  assert.equal(P.read(dir + "/out/delivery.json").status, "pending", "描画前の停止でも旧完了記録を失効させる");
  assert.throws(() => R.assertFrozen(dir, frozen), /essence-baseline.json.*ありません/);
  assert.throws(() => C.finalize(dir), /essence-baseline.json.*ありません/);
  assert.equal(P.read(dir + "/out/delivery.json").status, "pending");
  assert.equal(fs.existsSync(dir + "/out/F07/source.html"), false, "ブラウザ描画へ進んでいない");
  assert.equal(fs.readFileSync(dir + "/cycle-ledger.json", "utf8"), ledger);
});
test("目的の無承認変更はrenderとfinalizeの前で停止する", async t => {
  const { dir, p } = setup(t);
  p.brief.purpose.action = "利用者がまだ承認していない電話申込へ変更";
  P.write(dir + "/brief.json", p.brief);
  await assert.rejects(() => R.render(dir), /本質アンカー.*\/purpose\/action/);
  assert.throws(() => C.finalize(dir), /本質アンカー.*\/purpose\/action/);
  assert.equal(fs.existsSync(dir + "/cycle-ledger.json"), false, "関門で止まった試行はcycleを増やさない");
  assert.equal(fs.existsSync(dir + "/out/F07/source.html"), false);
});
test("intakeのない旧briefは明示baseline作成後に次の制作関門へ進める", async t => {
  const { dir, p } = setup(t), E = require("../scripts/essence.cjs");
  fs.rmSync(dir + "/essence-baseline.json", { force: true });
  assert.equal(fs.existsSync(dir + "/intake.json"), false);
  await assert.rejects(() => R.render(dir), /essence-baseline/);
  assert.equal(fs.existsSync(dir + "/essence-baseline.json"), false, "基準は自動作成されない");
  E.baseline(dir, { request: "旧案件の依頼文と確定事実を確認して制作を再開する" });
  assert.equal(E.assertCurrent(dir).intakeGate, null);
  p.brief.analysisMode = "source-artifact";
  P.write(dir + "/brief.json", p.brief);
  await assert.rejects(() => R.render(dir), /analysis.json/, "明示移行後は次の分析承認関門まで進む");
  assert.throws(() => C.finalize(dir), /analysis.json/);
});
