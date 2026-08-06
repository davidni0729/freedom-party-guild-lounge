import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  ArrowLeft, Broadcast, Camera, Check, CheckCircle, Crown, DownloadSimple,
  GearSix, MagicWand, Play, Sparkle, Timer, UserCircle, UsersThree,
} from "@phosphor-icons/react";

const ROLES = {
  mechanic: { id: "mechanic", title: "機甲師", real: "工程師", power: "把想像鍛造成能運作的工具與系統", color: "#00d8ff", icon: GearSix, badge: "/assets/badge-chrome.png", question: "你最近最想把哪個點子真的做出來？" },
  illusionist: { id: "illusionist", title: "幻術師", real: "設計師", power: "把感受化為畫面、體驗與引人靠近的幻象", color: "#a955ff", icon: MagicWand, badge: "/assets/badge-spectrum.png", question: "你希望人們看到作品時，有什麼感覺？" },
  summoner: { id: "summoner", title: "召喚師", real: "媒合者", power: "召來人、資源與機會，讓新的關係發生", color: "#ff2db2", icon: UsersThree, badge: "/assets/badge-neon.png", question: "如果現在能召喚一位夥伴，你最想找誰？" },
  lord: { id: "lord", title: "城主", real: "金主・老闆", power: "守護場域與資源，讓值得的創作長大", color: "#eaff00", icon: Crown, badge: "/assets/badge-chrome.png", question: "你最近最想支持哪種改變或實驗？" },
};

const MOCK_MEMBERS = [
  { id: "m1", nickname: "光子", role: "mechanic", skills: ["互動裝置", "AI"], greeting: "把光變成可以玩的東西" },
  { id: "m2", nickname: "小璐", role: "illusionist", skills: ["品牌", "視覺"], greeting: "正在找一個瘋狂的共同創作" },
  { id: "m3", nickname: "野島", role: "summoner", skills: ["策展", "社群"], greeting: "我認識一些你該認識的人" },
  { id: "m4", nickname: "森哥", role: "lord", skills: ["空間", "資源"], greeting: "想讓好作品被城市看見" },
  { id: "m5", nickname: "阿布", role: "mechanic", skills: ["前端", "聲音"], greeting: "最近在做一台會呼吸的機器" },
  { id: "m6", nickname: "Miyo", role: "illusionist", skills: ["影像", "動態"], greeting: "喜歡把模糊的感覺做清楚" },
  { id: "m7", nickname: "Vivi", role: "summoner", skills: ["活動", "公關"], greeting: "今天想召喚跨界新朋友" },
  { id: "m8", nickname: "Kai", role: "lord", skills: ["新創", "場域"], greeting: "尋找能長期發生的計畫" },
];

const SKILL_SUGGESTIONS = ["AI", "影像", "設計", "工程", "策展", "社群", "聲音", "空間", "品牌", "資源"];

function readStore(key, fallback) {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; }
  catch { return fallback; }
}

function writeStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("guild:update", { detail: { key } }));
}

function useSharedStore(key, fallback) {
  const [value, setValue] = useState(() => readStore(key, fallback));
  useEffect(() => {
    const sync = (event) => { if (!event.detail || event.detail.key === key) setValue(readStore(key, fallback)); };
    const storage = (event) => { if (!event.key || event.key === key) setValue(readStore(key, fallback)); };
    window.addEventListener("guild:update", sync); window.addEventListener("storage", storage);
    return () => { window.removeEventListener("guild:update", sync); window.removeEventListener("storage", storage); };
  }, [key]);
  const update = (next) => { const resolved = typeof next === "function" ? next(readStore(key, fallback)) : next; writeStore(key, resolved); setValue(resolved); };
  return [value, update];
}

function RoleIcon({ role, size = 24 }) {
  const Icon = ROLES[role]?.icon || Sparkle;
  return <Icon size={size} weight="fill" aria-hidden="true" />;
}

function AppNav({ surface, onSurface }) {
  return <nav className="app-nav" aria-label="原型介面切換">
    <div className="brand-lockup"><span className="brand-mark">FW</span><span>巫師公會交誼廳</span></div>
    <div className="surface-tabs">
      {[["checkin", "手機報到"], ["lounge", "交誼廳大屏"], ["admin", "主持控制台"]].map(([id, label]) =>
        <button key={id} className={surface === id ? "active" : ""} onClick={() => onSurface(id)}>{label}</button>)}
    </div>
    <span className="prototype-chip">LIVE PROTOTYPE</span>
  </nav>;
}

function Welcome({ onStart }) {
  return <section className="mobile-screen welcome-screen">
    <div className="poster-panel" aria-hidden="true" />
    <div className="mobile-content welcome-content">
      <div className="eyebrow"><Sparkle weight="fill" /> FREEDOM PARTY 2026</div>
      <h1>進入<br /><span>巫師公會</span><br />交誼廳</h1>
      <p>選擇你今天想帶來的力量，領取公會徽章，認識一位意想不到的新夥伴。</p>
      <button className="primary-action" onClick={onStart}>領取公會徽章 <span>→</span></button>
      <div className="welcome-meta"><span>約 60 秒完成</span><span>是否上牆由你決定</span></div>
    </div>
  </section>;
}

function MobileHeader({ step, title, onBack }) {
  return <header className="mobile-header">
    <button className="icon-button" onClick={onBack} aria-label="返回"><ArrowLeft /></button>
    <div><span>{step}</span><strong>{title}</strong></div><span className="mini-mark">FW</span>
  </header>;
}

function RoleSelection({ selected, onSelect, onNext, onBack }) {
  return <section className="mobile-screen form-screen"><MobileHeader step="01 / 03" title="選擇今日角色" onBack={onBack} />
    <div className="mobile-content form-content"><p className="helper">角色代表你今天想如何參與，不是職稱，也可以隨時更換。</p>
      <div className="role-grid">{Object.values(ROLES).map((role) =>
        <button key={role.id} className={`role-option ${selected === role.id ? "selected" : ""}`} style={{ "--role-color": role.color }} onClick={() => onSelect(role.id)}>
          <span className="role-icon"><RoleIcon role={role.id} size={30} /></span><strong>{role.title}</strong><small>{role.real}</small><p>{role.power}</p><span className="selection-mark"><Check weight="bold" /></span>
        </button>)}</div>
      <button className="primary-action" disabled={!selected} onClick={onNext}>下一步：建立識別卡</button>
    </div>
  </section>;
}

function ProfileForm({ draft, onChange, onNext, onBack }) {
  const inputRef = useRef(null); const [skillText, setSkillText] = useState("");
  const addSkill = (skill) => { const clean = skill.trim(); if (!clean || draft.skills.includes(clean) || draft.skills.length >= 3) return; onChange({ ...draft, skills: [...draft.skills, clean] }); setSkillText(""); };
  const handlePhoto = (file) => { if (!file) return; const reader = new FileReader(); reader.onload = () => onChange({ ...draft, photo: reader.result }); reader.readAsDataURL(file); };
  const complete = draft.nickname.trim().length >= 2 && draft.skills.length > 0;
  return <section className="mobile-screen form-screen"><MobileHeader step="02 / 03" title="建立你的識別卡" onBack={onBack} />
    <div className="mobile-content form-content profile-form">
      <button className="photo-picker" onClick={() => inputRef.current?.click()}>{draft.photo ? <img src={draft.photo} alt="你的識別照片預覽" /> : <><Camera size={34} /><strong>拍張照片</strong><span>或從相簿選擇</span></>}<span className="photo-edit">{draft.photo ? "更換" : "+"}</span></button>
      <input ref={inputRef} type="file" accept="image/*" capture="user" hidden onChange={(event) => handlePhoto(event.target.files?.[0])} />
      <label className="field-label">暱稱 <span>2–20 字</span></label><input className="text-input" value={draft.nickname} maxLength={20} placeholder="大家要怎麼稱呼你？" onChange={(e) => onChange({ ...draft, nickname: e.target.value })} />
      <label className="field-label">技能／能量 <span>最多 3 個</span></label>
      <div className="skill-input-wrap"><input value={skillText} placeholder="輸入技能後按 Enter" onChange={(e) => setSkillText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(skillText); } }} /><button onClick={() => addSkill(skillText)}>加入</button></div>
      <div className="selected-skills">{draft.skills.map((skill) => <button key={skill} onClick={() => onChange({ ...draft, skills: draft.skills.filter((item) => item !== skill) })}>{skill} ×</button>)}</div>
      <div className="suggested-skills">{SKILL_SUGGESTIONS.filter((item) => !draft.skills.includes(item)).slice(0, 6).map((skill) => <button key={skill} onClick={() => addSkill(skill)}>+ {skill}</button>)}</div>
      <label className="field-label">一句召喚 <span>選填</span></label><textarea value={draft.greeting} maxLength={40} placeholder="例：正在找會做聲音設計的夥伴" onChange={(e) => onChange({ ...draft, greeting: e.target.value })} />
      <button className="primary-action" disabled={!complete} onClick={onNext}>預覽公會徽章</button>
    </div>
  </section>;
}

function BadgeCard({ member, compact = false }) {
  const role = ROLES[member.role] || ROLES.mechanic;
  return <article className={`badge-card ${compact ? "compact" : ""}`} style={{ "--role-color": role.color }}>
    <img className="badge-template" src={role.badge} alt="" />
    <div className="badge-content"><div className="avatar">{member.photo ? <img src={member.photo} alt={`${member.nickname} 的照片`} /> : <UserCircle weight="duotone" />}</div>
      <div className="badge-info"><span className="badge-role"><RoleIcon role={member.role} size={15} /> {role.title}</span><strong>{member.nickname || "神秘旅人"}</strong><div className="badge-skills">{member.skills?.map((skill) => <span key={skill}>{skill}</span>)}</div>{member.greeting && <p>{member.greeting}</p>}</div>
    </div>
  </article>;
}

async function downloadBadge(member) {
  const role = ROLES[member.role]; const canvas = document.createElement("canvas"); canvas.width = 1080; canvas.height = 1440; const ctx = canvas.getContext("2d");
  const load = (src) => new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src; });
  const template = await load(role.badge); ctx.drawImage(template, 0, 0, 1080, 1440); ctx.fillStyle = "rgba(255,255,255,.94)"; ctx.fillRect(145, 745, 790, 405);
  if (member.photo) { const photo = await load(member.photo); ctx.save(); ctx.beginPath(); ctx.arc(300, 905, 115, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(photo, 185, 790, 230, 230); ctx.restore(); }
  else { ctx.fillStyle = role.color; ctx.beginPath(); ctx.arc(300, 905, 115, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = "#0a0a0a"; ctx.font = "900 62px Arial"; ctx.fillText(member.nickname, 465, 865); ctx.fillStyle = role.color === "#eaff00" ? "#7a8300" : role.color; ctx.font = "800 32px Arial"; ctx.fillText(`${role.title} / ${role.real}`, 465, 920); ctx.fillStyle = "#111"; ctx.font = "700 28px Arial"; ctx.fillText(member.skills.join(" · "), 465, 975); ctx.font = "500 25px Arial"; ctx.fillText(member.greeting || "自由創造・連結彼此・實驗未來", 465, 1025, 420);
  const link = document.createElement("a"); link.download = `自由派對_${member.nickname}_公會徽章.png`; link.href = canvas.toDataURL("image/png"); link.click();
}

function ToggleRow({ value, onChange, title, body }) {
  return <label className="toggle-row"><span><strong>{title}</strong><small>{body}</small></span><input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} /><i aria-hidden="true" /></label>;
}

function BadgePreview({ draft, onBack, onComplete }) {
  const [wall, setWall] = useState(true); const [match, setMatch] = useState(true);
  return <section className="mobile-screen form-screen preview-screen"><MobileHeader step="03 / 03" title="確認公會徽章" onBack={onBack} />
    <div className="mobile-content form-content"><BadgeCard member={draft} /><button className="secondary-action" onClick={() => downloadBadge(draft)}><DownloadSimple /> 下載識別卡 PNG</button>
      <div className="consent-panel"><ToggleRow value={wall} onChange={setWall} title="點亮交誼廳大屏" body="角色、照片、暱稱與技能會公開顯示。" /><ToggleRow value={match} onChange={setMatch} title="參與現場隨機媒合" body="媒合對象會看到你的完整卡片。" /></div>
      <button className="primary-action" onClick={() => onComplete({ ...draft, wall, match, online: true })}>完成報到，進入交誼廳</button>
    </div>
  </section>;
}

function LiveCountdown({ endsAt, onDone }) {
  const [left, setLeft] = useState(() => Math.max(0, endsAt - Date.now()));
  useEffect(() => { const tick = () => { const next = Math.max(0, endsAt - Date.now()); setLeft(next); if (next === 0) onDone?.(); }; tick(); const timer = setInterval(tick, 200); return () => clearInterval(timer); }, [endsAt, onDone]);
  const seconds = Math.ceil(left / 1000); return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function MatchReveal({ member }) {
  const others = MOCK_MEMBERS.filter((item) => item.role !== member.role); const match = others[(member.nickname?.length || 0) % others.length];
  return <div className="match-reveal"><div className="match-title"><Sparkle weight="fill" /><span>召喚成功</span><Sparkle weight="fill" /></div><h2>去找到你的<br />自由夥伴</h2><BadgeCard member={match} compact /><p className="match-question">開場題：{ROLES[match.role].question}</p><button className="primary-action"><Check /> 我們已經見面</button><button className="text-action">我還沒找到 TA</button></div>;
}

function CheckedIn({ member, event, onEdit }) {
  return <section className="mobile-screen checked-screen"><header className="checked-header"><span className="mini-mark">FW</span><span className="live-dot">ONLINE</span></header>
    <div className="mobile-content checked-content"><div className="success-stamp"><CheckCircle weight="fill" /><span>報到完成</span></div><BadgeCard member={member} />
      {event.mode === "matched" ? <MatchReveal member={member} /> : event.mode === "countdown" ? <div className="summon-alert"><span>相遇儀式即將開始</span><strong><LiveCountdown endsAt={event.endsAt} /></strong><p>請保持頁面開啟，配對即將揭曉。</p></div> : <div className="status-card"><Broadcast /><div><strong>你已點亮交誼廳</strong><span>下一輪召喚開始時，我們會在這裡通知你。</span></div></div>}
      <div className="checked-actions"><button className="secondary-action" onClick={() => downloadBadge(member)}><DownloadSimple /> 下載識別卡</button><button className="text-action" onClick={onEdit}>編輯資料</button></div>
    </div>
  </section>;
}

function CheckInApp({ member, setMember, event }) {
  const [step, setStep] = useState(member ? 4 : 0); const [draft, setDraft] = useState(member || { id: `u-${Date.now()}`, nickname: "", role: "", skills: [], greeting: "", photo: "" });
  const complete = (next) => { const resolved = { ...next, joinedAt: new Date().toISOString() }; setMember(resolved); setDraft(resolved); setStep(4); };
  return <main className="checkin-stage"><div className="phone-shell">
    {step === 0 && <Welcome onStart={() => setStep(1)} />}{step === 1 && <RoleSelection selected={draft.role} onSelect={(role) => setDraft({ ...draft, role })} onNext={() => setStep(2)} onBack={() => setStep(0)} />}{step === 2 && <ProfileForm draft={draft} onChange={setDraft} onNext={() => setStep(3)} onBack={() => setStep(1)} />}{step === 3 && <BadgePreview draft={draft} onBack={() => setStep(2)} onComplete={complete} />}{step === 4 && <CheckedIn member={draft} event={event} onEdit={() => setStep(2)} />}
  </div><aside className="checkin-copy"><span className="section-label">MOBILE CHECK-IN</span><h2>六十秒，<br />把陌生變成<br /><em>可以開始的對話。</em></h2><p>照片、暱稱、角色與技能會生成你的公會徽章。是否登上大屏、是否參與媒合，始終由你決定。</p><div className="copy-stats"><strong>4</strong><span>種公會角色</span><strong>1</strong><span>次意外相遇</span></div></aside></main>;
}

function LoungeMemberCard({ member, index }) {
  const role = ROLES[member.role]; return <article className="lounge-member" style={{ "--role-color": role.color, "--delay": `${index * 40}ms` }}><div className="member-photo">{member.photo ? <img src={member.photo} alt="" /> : <span>{member.nickname.slice(0, 1)}</span>}</div><div><span className="member-role"><RoleIcon role={member.role} size={14} /> {role.title}</span><strong>{member.nickname}</strong><small>{member.skills.join(" · ")}</small></div></article>;
}

function LoungeScreen({ member, event, setEvent }) {
  const [qr, setQr] = useState(""); const members = useMemo(() => [...MOCK_MEMBERS, ...(member?.wall ? [member] : [])], [member]);
  useEffect(() => { const url = `${window.location.origin}${window.location.pathname}?surface=checkin`; QRCode.toDataURL(url, { margin: 1, width: 240, color: { dark: "#050505", light: "#eaff00" } }).then(setQr); }, []);
  return <main className={`lounge-stage mode-${event.mode}`}><div className="lounge-poster-texture" aria-hidden="true" /><header className="lounge-header"><div><span>FREEDOM PARTY / 08.07</span><h1>巫師公會交誼廳</h1></div><div className="online-count"><i /> {members.length} 位成員正在交誼廳</div></header>
    {event.mode === "idle" && <><section className="lounge-center"><div className="portal-copy"><span className="section-label">THE GUILD LOUNGE</span><h2>自由的力量<br />正在匯聚</h2><p>掃描右側 QR Code，選擇你的角色，領取公會徽章。</p></div><div className="role-totals">{Object.values(ROLES).map((role) => <div key={role.id} style={{ "--role-color": role.color }}><RoleIcon role={role.id} /><strong>{members.filter((m) => m.role === role.id).length}</strong><span>{role.title}</span></div>)}</div></section><section className="member-wall">{members.map((item, index) => <LoungeMemberCard key={item.id} member={item} index={index} />)}</section><aside className="qr-panel"><span>JOIN THE GUILD</span>{qr && <img src={qr} alt="手機報到 QR Code" />}<strong>掃碼領取<br />公會徽章</strong><small>約 60 秒完成</small></aside><button className="demo-summon" onClick={() => setEvent({ mode: "countdown", endsAt: Date.now() + 10000, round: event.round + 1 })}><Play weight="fill" /> DEMO 召喚</button></>}
    {event.mode === "countdown" && <section className="countdown-scene"><span className="ritual-kicker"><Sparkle weight="fill" /> THE ENCOUNTER RITUAL <Sparkle weight="fill" /></span><h2>相遇儀式<br />即將開始</h2><strong className="giant-countdown"><LiveCountdown endsAt={event.endsAt} onDone={() => setEvent({ ...event, mode: "matched" })} /></strong><p>請打開手機活動頁，確認「我在場」</p><div className="countdown-role-row">{Object.values(ROLES).map((role) => <span key={role.id} style={{ "--role-color": role.color }}><RoleIcon role={role.id} /> {role.title}</span>)}</div></section>}
    {event.mode === "matched" && <section className="matched-scene"><span className="ritual-kicker"><Sparkle weight="fill" /> CONNECTIONS UNLOCKED <Sparkle weight="fill" /></span><h2>召喚完成</h2><div className="match-stat"><strong>{Math.floor(members.length / 2)}</strong><span>組相遇<br />正在發生</span></div><p>看看手機，找到你的自由夥伴。給彼此五分鐘，從一個技能開始聊天。</p><div className="conversation-prompt"><span>本輪開場題</span><strong>「你最近最想完成的一件事是什麼？」</strong></div><button className="reset-link" onClick={() => setEvent({ mode: "idle", endsAt: null, round: event.round })}>返回交誼廳</button></section>}
  </main>;
}

function Stat({ label, value, note, accent }) { return <div className={`stat-card ${accent ? "accent" : ""}`}><span>{label}</span><strong>{String(value).padStart(2, "0")}</strong><small>{note}</small></div>; }

function AdminDashboard({ member, event, setEvent }) {
  const members = [...MOCK_MEMBERS, ...(member ? [member] : [])]; const [seconds, setSeconds] = useState(30); const roleCounts = Object.values(ROLES).map((role) => ({ ...role, count: members.filter((item) => item.role === role.id).length })); const start = () => setEvent({ mode: "countdown", endsAt: Date.now() + seconds * 1000, round: event.round + 1 });
  return <main className="admin-stage"><header className="admin-header"><div><span className="section-label">HOST CONTROL</span><h1>主持人控制台</h1><p>自由派對・巫師公會交誼廳</p></div><div className="system-live"><i /> 系統連線正常</div></header><section className="admin-grid"><div className="admin-main"><div className="admin-stats"><Stat label="完成報到" value={members.length} note="+3 最近 10 分鐘" /><Stat label="目前在線" value={members.length - 1} note="可進入候選池" /><Stat label="願意媒合" value={members.filter((m) => m.match !== false).length} note="本輪候選者" accent /><Stat label="已完成輪次" value={event.round} note="今日活動" /></div>
    <div className="control-panel"><div className="panel-heading"><div><span>ENCOUNTER CONTROL</span><h2>啟動相遇儀式</h2></div><Timer size={34} /></div><div className="timer-presets">{[10,30,60,180].map((value) => <button key={value} className={seconds === value ? "active" : ""} onClick={() => setSeconds(value)}>{value < 60 ? `${value} 秒` : `${value / 60} 分鐘`}</button>)}</div><div className="event-status"><span>目前狀態</span><strong>{event.mode === "idle" ? "交誼廳開放中" : event.mode === "countdown" ? "媒合倒數中" : "媒合已揭曉"}</strong></div>{event.mode === "idle" ? <button className="summon-button" onClick={start}><Play weight="fill" /> 啟動本輪媒合</button> : <button className="summon-button stop" onClick={() => setEvent({ mode: "idle", endsAt: null, round: event.round })}>取消並返回交誼廳</button>}</div>
    <div className="member-table-panel"><div className="panel-title"><h2>現場成員</h2><span>{members.length} MEMBERS</span></div><div className="member-table"><div className="table-head"><span>成員</span><span>公會角色</span><span>技能</span><span>狀態</span></div>{members.slice(0,6).map((item) => <div className="table-row" key={item.id}><span className="table-person"><i style={{ background: ROLES[item.role].color }}>{item.nickname.slice(0,1)}</i><strong>{item.nickname}</strong></span><span className="table-role"><RoleIcon role={item.role} /> {ROLES[item.role].title}</span><span>{item.skills.join("、")}</span><span className="status-online">● 在線</span></div>)}</div></div></div>
    <aside className="admin-side"><div className="role-distribution"><div className="panel-title"><h2>公會力量</h2><span>LIVE</span></div>{roleCounts.map((role) => <div className="distribution-row" key={role.id}><span className="distribution-icon" style={{ color: role.color }}><RoleIcon role={role.id} /></span><div><strong>{role.title}</strong><small>{role.real}</small></div><b>{role.count}</b><i><em style={{ width: `${Math.max(16, role.count * 24)}%`, background: role.color }} /></i></div>)}</div><div className="host-note"><Broadcast size={28} /><div><strong>主持提示</strong><p>{event.mode === "idle" ? "建議在自由交流開始前 3 分鐘啟動預告，邀請大家打開手機。" : event.mode === "countdown" ? "提醒大家保持頁面開啟，倒數結束後配對結果會在手機揭曉。" : "請給彼此五分鐘，從卡片上的一個技能開始對話。"}</p></div></div></aside>
  </section></main>;
}

export function App() {
  const params = new URLSearchParams(window.location.search); const requested = params.get("surface"); const [surface, setSurface] = useState(["checkin", "lounge", "admin"].includes(requested) ? requested : "checkin"); const [member, setMember] = useSharedStore("guild:member", null); const [event, setEvent] = useSharedStore("guild:event", { mode: "idle", endsAt: null, round: 0 });
  useEffect(() => { const url = new URL(window.location.href); url.searchParams.set("surface", surface); window.history.replaceState({}, "", url); }, [surface]);
  return <div className={`app surface-${surface}`}><AppNav surface={surface} onSurface={setSurface} />{surface === "checkin" && <CheckInApp member={member} setMember={setMember} event={event} />}{surface === "lounge" && <LoungeScreen member={member} event={event} setEvent={setEvent} />}{surface === "admin" && <AdminDashboard member={member} event={event} setEvent={setEvent} />}</div>;
}
