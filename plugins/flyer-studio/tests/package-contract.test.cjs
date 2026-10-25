"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
test("package checks read the registry and reject drift in both directions", () => {
  const source = String.raw`
import importlib.util,json,shutil,tempfile
from pathlib import Path
spec=importlib.util.spec_from_file_location('flyer_package','scripts/build-local-package.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
STAGES={'run-a':'first','run-b':'second'}
def write(path,data):
 path.parent.mkdir(parents=True,exist_ok=True)
 path.write_text(data if isinstance(data,str) else json.dumps(data))
def build():
 root=Path(tempfile.mkdtemp())
 write(root/'rules.md','# 節\n')
 write(root/'scripts/run.py','')
 write(root/'agents/lens.md','---\nname: lens\n---\n')
 write(root/'references/design-knowledge-index.json',{'entries':[{'id':'DD01','path':'rules.md','section':'節','usedBy':list(STAGES.values())}]})
 caps=[{'kind':'skill','ref':'skills/'+n,'stage':s} for n,s in STAGES.items()]+[{'kind':'agent','ref':'agents/lens'}]
 write(root/'plugin-composition.yaml',{'version':'1.0.0','capabilities':caps,
  'dependencies':[{'from':'skills/run-a','to':'skills/run-b','type':'calls'}],
  'implementation':{'owner':'skills/run-a','entrypoint':'scripts/run.py','workflow':'rules.md#節','knowledgeIndex':'references/design-knowledge-index.json',
   'attached_resources':{'scripts':['scripts/run.py'],'references':['references/design-knowledge-index.json','references/package-contract.json']}},'retired':[]})
 write(root/'references/package-contract.json',{'manifests':['plugin.json'],'required_files':['package.json','package-lock.json','EVALS.json']})
 write(root/'tests/run.test.cjs','')
 for name in STAGES:
  write(root/'skills'/name/'SKILL.md','---\nname: '+name+'\nversion: 1.0.0\nreference_refs:\n  - ../../rules.md#節\nknowledge_refs:\n  - DD01\n---\n')
  write(root/'skills'/name/'workflow-manifest.json',{'skill':name,'workflowId':name,'version':'1.0.0',
   'phases':[{'id':'A','dependsOn':[],'resourceIds':['rules']}],'resources':[{'id':'rules','path':'../../rules.md','phaseIds':['A']}]})
 for file in ['plugin.json','EVALS.json']:
  write(root/file,{'version':'1.0.0'})
 write(root/'package.json',{'version':'1.0.0','scripts':{'test':'node --test tests/*.test.cjs'}})
 write(root/'package-lock.json',{'version':'1.0.0','packages':{'':{'version':'1.0.0'}}})
 return root
CONTRACT={'manifests':['plugin.json'],'entry_points':{'skills':['run-a','run-b'],'agents':['lens']}}
def errors(root):
 return module.check_stage_contracts(root)+module.check_registry(root)+module.check_links(root)+module.check_entry_points(root,CONTRACT)+module.check_versions(root,'1.0.0',CONTRACT)
def expect(mutate,needle):
 root=build()
 try:
  mutate(root)
  found=errors(root)
  assert any(needle in e for e in found),(needle,found)
 finally:
  shutil.rmtree(root)
root=build();assert errors(root)==[],errors(root);shutil.rmtree(root)
# repo共通feedbackの正規symlinkだけを独立キットから外す。同名実体と任意symlinkは拒否。
sandbox=Path(tempfile.mkdtemp());root=build();moved=sandbox/'plugins/flyer-studio';moved.parent.mkdir();shutil.move(root,moved);root=moved
external=sandbox/'plugins/harness-creator/skills/run-skill-feedback';copied=sandbox/'kit'
try:
 write(external/'SKILL.md','---\nname: run-skill-feedback\nversion: 0.1.0\n---\n')
 write(external/'workflow-manifest.json',{'version':'0.1.0'})
 link=root/'skills/run-skill-feedback';link.symlink_to('../../harness-creator/skills/run-skill-feedback',target_is_directory=True)
 assert errors(root)==[],errors(root)
 shutil.copytree(root,copied,ignore=lambda folder,names:module.IGNORE(folder,names,root=root))
 assert not (copied/'skills/run-skill-feedback').exists()
 assert (copied/'skills/run-a/SKILL.md').exists()
 link.unlink();link.symlink_to(external,target_is_directory=True)
 assert any('登録簿に無い' in e for e in errors(root)),errors(root)
 link.unlink();write(link/'SKILL.md','unregistered copy')
 assert any('登録簿に無い' in e for e in errors(root)),errors(root)
finally:
 shutil.rmtree(sandbox)

def rename(root):
 write(root/'skills/run-a/SKILL.md','---\nname: wrong\nreference_refs:\n  - missing.md\nknowledge_refs:\n  - DD99\n---\n')
for needle in ['frontmatter name不一致','stage参照切れ','未知の指針ID']:
 expect(rename,needle)
def manifest(root,**change):
 file=root/'skills/run-b/workflow-manifest.json';data=json.loads(file.read_text());data.update(change);write(file,data)
expect(lambda r:manifest(r,phases=[{'id':'A','dependsOn':['B']},{'id':'B','dependsOn':['A']}]),'依存循環')
expect(lambda r:manifest(r,maxImprovementCycles=3),'cycleBudget')
def loops(root):
 write(root/'references/design-contract.json',{'cycleBudget':3})
 write(root/'skills/run-a/SKILL.md','---\nname: run-a\nreference_refs:\n  - ../../rules.md#節\nknowledge_refs:\n  - DD01\ngoal_seek:\n  enabled: true\n  max_loops: 4\n---\n')
expect(loops,'goal_seek.max_loops が cycleBudget と不一致: run-a')
def composition_budget(root):
 write(root/'references/design-contract.json',{'cycleBudget':3})
 file=root/'plugin-composition.yaml';data=json.loads(file.read_text());data['revisionBudget']={'maxCycles':4};write(file,data)
expect(composition_budget,'revisionBudget.maxCycles が cycleBudget と不一致')

expect(lambda r:manifest(r,resources=[],phases=[{'id':'A','dependsOn':[]}]),'resourcesに無い')
expect(lambda r:write(r/'skills/run-b/references/extra.md','x'),'resourcesに無いskill資産')
# 未登録の skill フォルダは、その場所で 1 回だけ報告する（SKILL.md と二重に数えない）。
root=build()
try:
 write(root/'skills/run-c/SKILL.md','---\nname: run-c\n---\n');found=errors(root)
 assert found.count('登録簿に無い: skills/run-c')==1 and not any('skills/run-c/' in e for e in found),found
finally:
 shutil.rmtree(root)
expect(lambda r:write(r/'scripts/extra.py',''),'登録簿に無い: scripts/extra.py')
# owner がフォルダを指しても、manifest の無い skill フォルダの中身は信頼しない。
expect(lambda r:((r/'skills/run-a/workflow-manifest.json').unlink(),write(r/'skills/run-a/extra.md','x')),'登録簿に無い: skills/run-a/extra.md')
expect(lambda r:(r/'scripts/run.py').unlink(),'登録された資産が無い')
# 直下は配布キットへそのまま写るので、登録簿・配布契約・登録済みのscriptsが名指ししないものを止める。
def accept(mutate):
 root=build()
 try:
  mutate(root);found=errors(root);assert found==[],found
 finally:
  shutil.rmtree(root)
expect(lambda r:write(r/'handoff.txt','会話の書き出し'),'登録簿に無い: handoff.txt')
expect(lambda r:write(r/'notes/memo.md','x'),'登録簿に無い: notes')
def unlisted(root):
 file=root/'references/package-contract.json';data=json.loads(file.read_text())
 data['required_files'].remove('package-lock.json');write(file,data)
expect(unlisted,'登録簿に無い: package-lock.json')
expect(lambda r:write(r/'package.json',{'version':'1.0.0','scripts':{}}),'登録簿に無い: tests')
expect(lambda r:write(r/'.env.local','x'),'登録簿に無い: .env.local')
expect(lambda r:write(r/'.private-notes/x.md','x'),'登録簿に無い: .private-notes')
expect(lambda r:write(r/'scripts/.secret','x'),'登録簿に無い: scripts/.secret')
# npm scripts が scripts/ のファイルを実行しても、scripts/ の中身はフォルダごと信頼されない。
def npm_runs_file(root,name):
 write(root/'package.json',{'version':'1.0.0','scripts':{'test':'node --test tests/*.test.cjs','doctor':'node scripts/run.py'}})
 write(root/name,'x')
for name in ['scripts/.secret','scripts/extra.py']:
 expect(lambda r:npm_runs_file(r,name),'登録簿に無い: '+name)
# '..' で名指ししたフォルダの外へ出る語は、行き先を登録しない。
def npm_escape(root):
 write(root/'package.json',{'version':'1.0.0','scripts':{'test':'node --test tests/*.test.cjs','x':'node scripts/../.env.local'}})
 write(root/'.env.local','x')
expect(npm_escape,'登録簿に無い: .env.local')
# glob は glob を含まない最も深い親だけを登録し、直下のフォルダ全体を信頼しない。親の中でも隠し名は信頼しない。
def npm_glob(root,name):
 write(root/'package.json',{'version':'1.0.0','scripts':{'test':'node --test tests/*.test.cjs','lint':'python3 scripts/sub/*.py'}})
 write(root/'scripts/sub/a.py','');write(root/name,'x')
accept(lambda r:npm_glob(r,'scripts/sub/b.py'))
for name in ['scripts/extra.py','scripts/.secret','scripts/sub/.secret']:
 expect(lambda r:npm_glob(r,name),'登録簿に無い: '+name)
# フォルダ単位の登録（attached_resources の '/' 終わり・npm の glob）でも、隠し名は登録で信頼しない。
def presets(root,name):
 file=root/'plugin-composition.yaml';data=json.loads(file.read_text())
 data['implementation']['attached_resources']['presets']=['references/presets/'];write(file,data)
 write(root/'references/presets/x/preset.json',{'id':'x'});write(root/name,'x')
accept(lambda r:presets(r,'references/presets/x/notes.md'))
expect(lambda r:presets(r,'references/presets/x/.secret'),'登録簿に無い: references/presets/x/.secret')
expect(lambda r:presets(r,'references/presets/.hidden/a.md'),'登録簿に無い: references/presets/.hidden')
expect(lambda r:write(r/'tests/.env.local','x'),'登録簿に無い: tests/.env.local')
# 写らないフォルダ（.claude・node_modules）へは降りない。shipped() も登録照合の walk も同じ ignored() で外す。
root=build()
try:
 write(root/'.claude/notes.md','[切れ](missing.md)');write(root/'node_modules/pkg/README.md','[切れ](missing.md)')
 walked=[p.relative_to(root).parts for p in module.shipped(root)]
 assert not any(parts[0] in ('.claude','node_modules') for parts in walked),walked
 assert errors(root)==[],errors(root)
finally:
 shutil.rmtree(root)
for name in ['draft.tmp','node_modules/pkg/index.js','__pycache__/run.pyc','.DS_Store','scripts/.DS_Store','skills/run-a/.DS_Store','.claude/settings.json','.gitignore']:
 accept(lambda r:write(r/name,'x'))
# 実物の .gitignore が除外する名前は、どれも IGNORE で配布キットから外れる。
rules=[l.strip() for l in Path('.gitignore').read_text().splitlines() if l.strip() and not l.startswith('#')]
assert rules,'.gitignore'
for prefix in ['','scripts/']:
 for rule in rules:
  accept(lambda r:write(r/(prefix+rule.replace('*','any').rstrip('/')+('/x' if rule.endswith('/') else '')),'x'))
# '.' で始まるフォルダも、配布契約の manifest を含めば中へ降りて照合する。
def dot_manifest(root):
 file=root/'references/package-contract.json';data=json.loads(file.read_text())
 data['manifests'].append('.claude-plugin/plugin.json');write(file,data)
 write(root/'.claude-plugin/plugin.json',{'version':'1.0.0'})
accept(dot_manifest)
expect(lambda r:(dot_manifest(r),write(r/'.claude-plugin/.env.local','x')),'登録簿に無い: .claude-plugin/.env.local')
expect(lambda r:write(r/'skills/notes.md','x'),'登録簿に無い: skills/notes.md')
# 素材は catalog の file と旧名の file で登録され、形式の崩れた行は素材フォルダ全体を通す理由にならない。
def catalog(root):
 file=root/'plugin-composition.yaml';data=json.loads(file.read_text())
 data['implementation']['attached_resources']['assets']=['assets/catalog.json'];write(file,data)
 write(root/'assets/catalog.json',{'entries':[{'file':'logo.png','provenance':{'aliases':[{'file':'old/logo.png'}]}},{'file':''},{'file':3},'broken',{'provenance':'x'}]})
 write(root/'assets/logo.png','x');write(root/'assets/old/logo.png','x')
accept(catalog)
expect(lambda r:(catalog(r),write(r/'assets/notes.txt','x')),'登録簿に無い: assets/notes.txt')
def index(root,used):
 write(root/'references/design-knowledge-index.json',{'entries':[{'id':'DD01','path':'rules.md','section':'節','usedBy':used}]})
expect(lambda r:index(r,['first','second','ghost']),'usedByの未知のstage')
expect(lambda r:index(r,['first']),'usedByに無い指針')
def twin(root):
 file=root/'references/design-knowledge-index.json';data=json.loads(file.read_text())
 data['entries'].append(dict(data['entries'][0],id='DD02'));write(file,data)
expect(twin,'指針の参照先が重複')
expect(lambda r:write(r/'rules.md','# 節\n\n[先](agents/lens.md#無い見出し)\n'),'本文リンク切れ: rules.md')
def depend(root):
 file=root/'plugin-composition.yaml';data=json.loads(file.read_text())
 data['dependencies'].append({'from':'skills/run-a','to':'skills/run-z','type':'calls'});write(file,data)
expect(depend,'未登録の部品への依存')
expect(lambda r:write(r/'skills/run-a/SKILL.md','---\nname: run-a\nuser-invocable: false\nreference_refs:\n  - ../../rules.md#節\nknowledge_refs:\n  - DD01\n---\n'),'入口の不一致')
expect(lambda r:write(r/'EVALS.json',{'version':'0.9.0'}),'版の不一致: EVALS.json')
def locked_version(root,top=None,package=None):
 file=root/'package-lock.json';data=json.loads(file.read_text())
 if top: data['version']=top
 if package: data['packages']['']['version']=package
 write(file,data)
expect(lambda r:locked_version(r,top='0.9.0'),'版の不一致: package-lock.json =')
expect(lambda r:locked_version(r,package='0.9.0'),'版の不一致: package-lock.json#packages[""].version')
def revision_without_contract(root):
 file=root/'plugin-composition.yaml';data=json.loads(file.read_text())
 data['dependencies'].append({'from':'skills/run-b','to':'skills/run-a','type':'revision','fixClass':'premise'})
 write(file,data)
expect(revision_without_contract,'fixRouting の無い revision 関係')
expect(revision_without_contract,'部品の依存循環')
def unknown_type(root):
 file=root/'plugin-composition.yaml';data=json.loads(file.read_text())
 data['dependencies'].append({'from':'skills/run-b','to':'skills/run-a','type':'skip-cycle'})
 write(file,data)
expect(unknown_type,'未知の依存type')
expect(unknown_type,'部品の依存循環')

print('package registry negative cases: PASS')
`;
  const result = spawnSync("python3", ["-c", source], {
    cwd: path.resolve(__dirname, ".."),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test("package asset gate rejects unsafe scope, aliases, privacy types and changed originals", () => {
  const source = String.raw`
import importlib.util,json,shutil,tempfile
from pathlib import Path
spec=importlib.util.spec_from_file_location('flyer_package','scripts/build-local-package.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def build():
 root=Path(tempfile.mkdtemp())
 (root/'assets').mkdir();(root/'assets/canonical.png').write_bytes(b'image')
 (root/'assets/old.png').write_bytes(b'image')
 (root/'references/presets/case').mkdir(parents=True)
 (root/'references/presets/case/preset.json').write_text(json.dumps({'id':'case'}))
 original={'id':'OLD','file':'old.png','sha256':m.digest(root/'assets/old.png')}
 entry={'id':'MAIN','aliases':['OLD'],'kind':'reference','file':'canonical.png','sha256':original['sha256'],
 'preset':'case','usage':'reference-only','privacy':{'containsPeople':True},'provenance':{'project':'case-project','aliases':[original]}}
 return root,{'entries':[entry]}
def check(mutate=None,needle=None):
 root,data=build()
 try:
  if mutate: mutate(root,data)
  (root/'assets/catalog.json').write_text(json.dumps(data))
  errors=m.check_asset_catalog(root)
  if needle: assert any(needle in e for e in errors),(needle,errors)
  else: assert errors==[],errors
 finally: shutil.rmtree(root)
check()
check(lambda r,d:d['entries'][0].pop('preset'),'案件素材のpreset欠落')
check(lambda r,d:d['entries'][0].update(preset='missing'),'素材preset参照切れ')
check(lambda r,d:d['entries'][0]['privacy'].update(containsPeople='may-contain-third-parties'),'privacy.containsPeopleは真偽値')
check(lambda r,d:d['entries'][0].update(usage='selectable'),'参照素材の用途')
check(lambda r,d:d['entries'].append(dict(d['entries'][0],id='SECOND',aliases=[],provenance={})),'素材SHAの重複')
check(lambda r,d:d['entries'][0].update(aliases=['MAIN']),'素材ID/別名の重複')
check(lambda r,d:d['entries'][0]['provenance'].update(aliases=[]),'素材別名の履歴欠落')
check(lambda r,d:(r/'assets/old.png').write_bytes(b'changed'),'素材別名の元ファイル/SHA')
check(lambda r,d:d['entries'][0].update(file='../outside.png'),'素材SHA/境界')
# 形の崩れた行は例外で止めず、どの素材の何が崩れたかを返す。
check(lambda r,d:d['entries'][0].update(preset=['case']),'素材preset参照切れ')
check(lambda r,d:d['entries'][0].update(provenance='case-project'),'素材provenanceの形式')
check(lambda r,d:d['entries'][0].update(privacy='none'),'privacy.containsPeopleは真偽値')
check(lambda r,d:d['entries'][0].update(file=3),'素材SHA/境界')
check(lambda r,d:d['entries'][0].update(sha256=['x']),'素材SHA/境界')
check(lambda r,d:d['entries'][0]['provenance']['aliases'][0].update(id=['OLD']),'素材別名の履歴欠落')
check(lambda r,d:d['entries'].append('broken'),'素材エントリの形式')
check(lambda r,d:(r/'references/presets/case/preset.json').write_text('[]'),'素材preset参照切れ')
# 台帳そのものの形が崩れていても例外で止めず、台帳の形式として返す。
for shape in [[],{'entries':3},{}]:
 root,_=build()
 try:
  (root/'assets/catalog.json').write_text(json.dumps(shape))
  errors=m.check_asset_catalog(root)
  assert any('素材台帳の形式' in e for e in errors),(shape,errors)
  assert m.catalog_entries(root) is None,shape
 finally: shutil.rmtree(root)
# check() の件数も同じ読み口を通す。台帳だけ差し替えて読ませ、実ファイルは変えない。
# 崩れた台帳は 0 件と形式エラー、正しい形の台帳は空でも entries の数を数える。fail は errors の数と一致する。
real=m.load
for shape,count,malformed in [([],0,True),({'entries':3},0,True),({},0,True),({'entries':[]},0,False),({'entries':[{},{}]},2,False)]:
 m.load=lambda f,shape=shape:shape if Path(f)==m.ROOT/'assets/catalog.json' else real(f)
 try: report=m.check()
 finally: m.load=real
 assert report['assets']==count and report['fail']==len(report['errors']),(shape,report)
 assert any('素材台帳の形式' in e for e in report['errors'])==malformed,(shape,report['errors'])
print('asset gate negative cases: PASS')
`;
  const result = spawnSync("python3", ["-c", source], {
    cwd: path.resolve(__dirname, ".."), encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test("FIX routing agrees across composition, contract and workflow without bypassing the dependency DAG", () => {
  const source = String.raw`
import importlib.util,json,shutil,tempfile
from pathlib import Path
spec=importlib.util.spec_from_file_location('flyer_package','scripts/build-local-package.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def write(file,data):
 file.parent.mkdir(parents=True,exist_ok=True)
 file.write_text(data if isinstance(data,str) else json.dumps(data))
def build():
 root=Path(tempfile.mkdtemp())
 stages={'run-intake-flyer':'intake','run-analyze-flyer':'analyze','run-create-flyer':'create'}
 for name in stages: write(root/'skills'/name/'SKILL.md','---\nname: '+name+'\n---\n')
 comp={'capabilities':[{'kind':'skill','ref':'skills/'+n,'stage':stage} for n,stage in stages.items()],
 'implementation':{'attached_resources':{'references':['references/']}},'dependencies':[
 {'from':'skills/run-intake-flyer','to':'skills/run-analyze-flyer','type':'calls','analysisMode':'source-artifact'},
 {'from':'skills/run-intake-flyer','to':'skills/run-create-flyer','type':'calls','analysisMode':'new-from-brief'},
 {'from':'skills/run-create-flyer','to':'skills/run-analyze-flyer','type':'calls','analysisMode':'source-artifact'},
 {'from':'skills/run-create-flyer','to':'skills/run-intake-flyer','type':'revision','fixClass':'premise'}]}
 write(root/'references/design-contract.json',{'fixRouting':{'deterministic':'run-create-flyer','within-plan':'run-create-flyer','premise':'run-intake-flyer'}})
 write(root/'references/workflow.md','| deterministic | 機械修正 | run-create-flyer | する |\n| within-plan | 配置修正 | run-create-flyer | する |\n| premise | 前提再確認 | run-intake-flyer → 元画像があれば分析、無ければ制作 | する |\n')
 return root,comp
def check(mutate=None,needle=None):
 root,comp=build()
 try:
  if mutate: mutate(root,comp)
  write(root/'plugin-composition.yaml',comp)
  errors=m.check_registry(root)
  if needle: assert any(needle in e for e in errors),(needle,errors)
  else: assert errors==[],errors
 finally: shutil.rmtree(root)
check() # 有効な revision は呼出のDAGに循環を作らない。
check(lambda r,c:c['dependencies'].pop(),'revision 関係が fixRouting と不一致')
check(lambda r,c:c['dependencies'][3].update(to='skills/run-analyze-flyer'),'revision 関係が fixRouting と不一致')
check(lambda r,c:c['dependencies'][3].update({'from':'skills/run-analyze-flyer'}),'revision 関係が fixRouting と不一致')
check(lambda r,c:c['dependencies'][3].update(fixClass='within-plan'),'revision 関係が fixRouting と不一致')
check(lambda r,c:c['dependencies'][0].update(type='revision',fixClass='premise'),'revision 関係が fixRouting と不一致')
check(lambda r,c:c['dependencies'].append(dict(c['dependencies'][3])),'revision 関係が fixRouting と不一致')
check(lambda r,c:c['dependencies'][1].update(analysisMode='source-artifact'),'通常呼出の analysisMode/前提分岐が不一致')
check(lambda r,c:c['dependencies'][2].update(condition='brief.analysisMode=source-artifact、または fixClass=premise の FIX'),'通常呼出の analysisMode/前提分岐が不一致')
check(lambda r,c:c['dependencies'][2].update(fixClass='premise'),'通常呼出の analysisMode/前提分岐が不一致')
check(lambda r,c:write(r/'references/workflow.md','| premise | 前提 | run-analyze-flyer | する |\n'),'workflow 改善表が fixRouting と不一致: premise')
check(lambda r,c:c['dependencies'].append({'from':'skills/run-analyze-flyer','to':'skills/run-create-flyer','type':'calls'}),'部品の依存循環')
print('FIX routing and DAG negative cases: PASS')
`;
  const result = spawnSync("python3", ["-c", source], {
    cwd: path.resolve(__dirname, ".."), encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test("policy coverage follows usedBy DD bodies, related sections and stage contracts", () => {
  const source = String.raw`
import copy,importlib.util,json,shutil,tempfile
from pathlib import Path
spec=importlib.util.spec_from_file_location('flyer_package','scripts/build-local-package.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
root=Path(tempfile.mkdtemp())
try:
 shutil.copytree(m.ROOT/'references',root/'references')
 comp=m.composition(m.ROOT)
 for cap in comp['capabilities']:
  if cap['kind']=='skill':
   file=m.capability_file(m.ROOT,cap);dest=root/file.relative_to(m.ROOT)
   dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(file,dest)
 index=json.loads((root/'references/design-knowledge-index.json').read_text())['entries']
 contract=json.loads((root/'references/design-contract.json').read_text())
 def check(mutate=None,needle=None):
  current=copy.deepcopy(contract);entries=copy.deepcopy(index)
  if mutate:mutate(current,entries)
  (root/'references/design-contract.json').write_text(json.dumps(current))
  errors=m.check_policy_coverage(root,comp,entries)
  if needle:assert any(needle in e for e in errors),(needle,errors)
  else:assert errors==[],errors
 check()
 for key,file in [('analysisPolicyFiles','references/design-rules.md'),('analysisPolicyFiles','references/designer-knowledge.md'),('analysisPolicyFiles','references/style-profiles.md'),('analysisPolicyFiles','skills/assign-flyer-review/references/review-contract.md'),('analysisPolicyFiles','skills/run-analyze-flyer/references/analysis-contract.md'),('analysisPolicyFiles','schemas/analysis-review.schema.json'),('analysisPolicyFiles','references/workflow.md'),('reviewPolicyFiles','skills/assign-flyer-review/references/review-contract.md'),('reviewPolicyFiles','references/workflow.md')]:
  check(lambda c,e:c[key].remove(file),'規範集合の被覆漏れ: '+key+' -> '+file)
 check(lambda c,e:c.pop('analysisPolicyFiles'),'規範集合がありません: analysisPolicyFiles')
 def remove_role(entries,role):
  for entry in entries:
   if 'review:'+role in entry['usedBy']:
    entry['relatedSections']=[r for r in entry.get('relatedSections',[]) if not r.startswith('references/designer-knowledge.md#'+role)]
 for role in ['composition','color']:
  check(lambda c,e:remove_role(e,role),'専門知見の索引接続漏れ: review:'+role)
 def additional_related(contract,entries):
  entries[0].setdefault('relatedSections',[]).append('references/new-judgment.md#節')
 check(additional_related,'規範集合の被覆漏れ: analysisPolicyFiles -> references/new-judgment.md')
 print('DD/policy coverage negative cases: PASS')
finally:shutil.rmtree(root)
`;
  const result = spawnSync("python3", ["-c", source], {
    cwd: path.resolve(__dirname, ".."), encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});
