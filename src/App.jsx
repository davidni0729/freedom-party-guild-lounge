import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const SKILL_SUGGESTIONS = ["AI", "影像", "設計", "工程", "策展", "社群", "聲音", "空間", "品牌", "資源"];
const EMPTY_EVENT = { mode: "idle", endsAt: null, round: 0, matchCount: 0 };
const IDENTITY_KEY = "guild:identity:v2";

function readIdentity() {
  try { return JSON.parse(localStorage.getItem(IDENTITY_KEY)) || null; }
  catch { return null; }
}

function saveIdentity(identity) {
  if (identity) localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
  else localStorage.removeItem(IDENTITY_KEY);
}

async function api(path, { method = "GET", body, hostToken, participantToken, headers = {} } = {}) {
  const response = await fetch(path, {
    method,
    headers: {
      ...(body && !(body instanceof Blob) ? { "content-type": "application/json" } : {}),
      ...(hostToken ? { authorization: `Bearer ${hostToken}` } : {}),
      ...(participantToken ? { "x-participant-token": participantToken } : {}),
      ...headers,
    },
    body: body instanceof Blob ? body : body ? JSON.stringify(body) : undefined,
  });
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || `伺服器暫時無法回應（${response.status}）`);
  return payload;
}

function usePolling(load, interval = 2500, initialValue = null) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try { setValue(await load()); setError(""); }
    catch (nextError) { setError(nextError.message); }
  }, [load]);
  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, interval);
    return () => window.clearInterval(timer);
  }, [refresh, interval]);
  return { value, setValue, error, refresh };
}

function RoleIcon({ role, size = 24 }) {
  const Icon = ROLES[role]?.icon || Sparkle;
  return <Icon size={size} weight="fill" aria-hidden="true" />;
}

function AppNav({ surface, onSurface }) {
  return <nav className="app-nav" aria-label="工作人員介面切換">
    <div className="brand-lockup"><span className="brand-mark">FW</span><span>巫師公會交誼廳</span></div>
    <div className="surface-tabs">
      {[["checkin", "手機預覽"], ["lounge", "交誼廳大屏"], ["admin", "主持控制台"]].map(([id, label]) =>
        <button key={id} className={surface === id ? "active" : ""} onClick={() => onSurface(id)}>{label}</button>)}
    </div>
    <span className="prototype-chip">HOST MODE</span>
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

function fileToPhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const scale = Math.min(1, 960 / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.84));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function ProfileForm({ draft, onChange, onNext, onBack }) {
  const inputRef = useRef(null);
  const [skillText, setSkillText] = useState("");
  const addSkill = (skill) => {
    const clean = skill.trim();
    if (!clean || draft.skills.includes(clean) || draft.skills.length >= 3) return;
    onChange({ ...draft, skills: [...draft.skills, clean] }); setSkillText("");
  };
  const handlePhoto = async (file) => { if (file) onChange({ ...draft, photo: await fileToPhoto(file) }); };
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

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const source = new URL(src, window.location.href);
    if (source.origin !== window.location.origin) image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("識別卡圖片載入失敗"));
    image.src = source.href;
  });
}

async function makeBadgeBlob(member) {
  const role = ROLES[member.role] || ROLES.mechanic;
  const canvas = document.createElement("canvas");
  canvas.width = 1080; canvas.height = 1440;
  const ctx = canvas.getContext("2d");
  const template = await loadImage(role.badge);
  ctx.drawImage(template, 0, 0, 1080, 1440);
  ctx.fillStyle = "rgba(255,255,255,.94)"; ctx.fillRect(145, 745, 790, 405);
  if (member.photo) {
    const photo = await loadImage(member.photo);
    ctx.save(); ctx.beginPath(); ctx.arc(300, 905, 115, 0, Math.PI * 2); ctx.clip();
    const ratio = Math.max(230 / photo.width, 230 / photo.height);
    const width = photo.width * ratio; const height = photo.height * ratio;
    ctx.drawImage(photo, 300 - width / 2, 905 - height / 2, width, height); ctx.restore();
  } else {
    ctx.fillStyle = role.color; ctx.beginPath(); ctx.arc(300, 905, 115, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = "#0a0a0a"; ctx.font = "900 62px Arial"; ctx.fillText(member.nickname, 465, 865, 430);
  ctx.fillStyle = role.color === "#eaff00" ? "#7a8300" : role.color; ctx.font = "800 32px Arial"; ctx.fillText(`${role.title} / ${role.real}`, 465, 920);
  ctx.fillStyle = "#111"; ctx.font = "700 28px Arial"; ctx.fillText((member.skills || []).join(" · "), 465, 975, 430);
  ctx.font = "500 25px Arial"; ctx.fillText(member.greeting || "自由創造・連結彼此・實驗未來", 465, 1025, 430);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("無法產生圖片")), "image/png"));
}

async function downloadBadge(member) {
  const blob = await makeBadgeBlob(member);
  const filename = `自由派對_${member.nickname}_公會徽章.png`;
  const file = new File([blob], filename, { type: "image/png" });
  const isAppleMobile = /iPhone|iPad|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isAppleMobile && navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: "我的巫師公會識別卡" });
    return "已開啟分享選單，可選擇「儲存影像」";
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = filename; link.style.display = "none";
  document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
  return "識別卡 PNG 已下載";
}

function DownloadButton({ member, compactText = false, label = "" }) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true); setStatus("");
    try { setStatus(await downloadBadge(member)); }
    catch (error) { if (error.name !== "AbortError") setStatus(`下載失敗：${error.message}`); }
    finally { setBusy(false); }
  };
  return <><button className="secondary-action" disabled={busy} onClick={run}><DownloadSimple /> {busy ? "正在產生圖片…" : label || (compactText ? "下載識別卡" : "下載識別卡 PNG")}</button>{status && <p className="download-status" role="status">{status}</p>}</>;
}

function ToggleRow({ value, onChange, title, body }) {
  return <label className="toggle-row"><span><strong>{title}</strong><small>{body}</small></span><input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} /><i aria-hidden="true" /></label>;
}

function BadgePreview({ draft, onBack, onComplete, submitting, error }) {
  const [wall, setWall] = useState(draft.wall ?? true);
  const [match, setMatch] = useState(draft.match ?? true);
  return <section className="mobile-screen form-screen preview-screen"><MobileHeader step="03 / 03" title="確認公會徽章" onBack={onBack} />
    <div className="mobile-content form-content"><BadgeCard member={draft} /><DownloadButton member={draft} />
      <div className="consent-panel"><ToggleRow value={wall} onChange={setWall} title="點亮交誼廳大屏" body="角色、照片、暱稱與技能會公開顯示。" /><ToggleRow value={match} onChange={setMatch} title="參與現場隨機媒合" body="媒合對象會看到你的完整卡片。" /></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-action" disabled={submitting} onClick={() => onComplete({ ...draft, wall, match, online: true })}>{submitting ? "正在同步到交誼廳…" : "完成報到，進入交誼廳"}</button>
    </div>
  </section>;
}

function LiveCountdown({ endsAt, onDone }) {
  const [left, setLeft] = useState(() => Math.max(0, Number(endsAt) - Date.now()));
  const doneRef = useRef(false);
  useEffect(() => {
    doneRef.current = false;
    const tick = () => {
      const next = Math.max(0, Number(endsAt) - Date.now()); setLeft(next);
      if (next === 0 && !doneRef.current) { doneRef.current = true; onDone?.(); }
    };
    tick(); const timer = window.setInterval(tick, 200); return () => window.clearInterval(timer);
  }, [endsAt, onDone]);
  const seconds = Math.ceil(left / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

const CELEBRATION_PIECES = [
  ["-148px", "410px", "420deg", "#eaff00", "0ms"], ["-116px", "350px", "-310deg", "#ff2db2", "30ms"],
  ["-82px", "455px", "540deg", "#00d8ff", "60ms"], ["-48px", "320px", "-440deg", "#a955ff", "15ms"],
  ["-18px", "430px", "380deg", "#ff5724", "75ms"], ["22px", "370px", "-520deg", "#eaff00", "35ms"],
  ["55px", "465px", "460deg", "#ff2db2", "90ms"], ["88px", "335px", "-360deg", "#00d8ff", "10ms"],
  ["122px", "425px", "580deg", "#a955ff", "55ms"], ["152px", "365px", "-460deg", "#ff5724", "85ms"],
  ["-170px", "280px", "330deg", "#00d8ff", "110ms"], ["170px", "295px", "-390deg", "#eaff00", "120ms"],
  ["-132px", "505px", "620deg", "#a955ff", "100ms"], ["135px", "510px", "-610deg", "#ff2db2", "105ms"],
  ["-65px", "535px", "470deg", "#ff5724", "125ms"], ["70px", "550px", "-500deg", "#00d8ff", "130ms"],
];

function Celebration({ name }) {
  return <div className="celebration-layer" role="status" aria-live="assertive">
    <div className="celebration-glow" />
    {CELEBRATION_PIECES.map(([x, y, spin, color, delay], index) => <i key={index} className="celebration-piece" style={{ "--x": x, "--y": y, "--spin": spin, "--piece": color, "--delay": delay }} />)}
    <div className="celebration-message"><CheckCircle weight="fill" /><span>連結成功</span><strong>恭喜你和 {name}<br />成功見面！</strong><small>願這次相遇，成為下一個好點子的開始。</small></div>
  </div>;
}

function MatchReveal({ match }) {
  const [met, setMet] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  useEffect(() => { setMet(false); setCelebrating(false); }, [match?.id]);
  useEffect(() => {
    if (!celebrating) return undefined;
    const timer = window.setTimeout(() => setCelebrating(false), 2600);
    return () => window.clearTimeout(timer);
  }, [celebrating]);
  const celebrate = () => {
    if (met) return;
    setMet(true); setCelebrating(true);
    navigator.vibrate?.([60, 40, 100]);
  };
  if (!match) return <div className="match-reveal pending-match"><Sparkle weight="fill" /><h2>正在召喚你的夥伴…</h2><p>請保持頁面開啟，結果很快就會出現。</p></div>;
  return <div className="match-reveal">{celebrating && <Celebration name={match.nickname} />}<div className="match-title"><Sparkle weight="fill" /><span>召喚成功</span><Sparkle weight="fill" /></div><h2>去找到你的<br />自由夥伴</h2><BadgeCard member={match} compact /><p className="match-question">開場題：{ROLES[match.role]?.question}</p><DownloadButton member={match} label="下載對方的識別名牌" /><button className={`primary-action meet-action ${met ? "met" : ""}`} disabled={met} onClick={celebrate}>{met ? <CheckCircle weight="fill" /> : <Check />} {met ? "太好了，你們見面了！" : "我們已經見面"}</button><button className="text-action">我還沒找到 TA</button></div>;
}

function CheckedIn({ member, event, match, onEdit }) {
  return <section className="mobile-screen checked-screen"><header className="checked-header"><span className="mini-mark">FW</span><span className="live-dot">ONLINE</span></header>
    <div className="mobile-content checked-content"><div className="success-stamp"><CheckCircle weight="fill" /><span>報到完成・已同步大屏與媒合名單</span></div><BadgeCard member={member} />
      {event.mode === "matched" ? <MatchReveal match={match} /> : event.mode === "countdown" ? <div className="summon-alert"><span>相遇儀式即將開始</span><strong><LiveCountdown endsAt={event.endsAt} /></strong><p>請保持頁面開啟，配對即將揭曉。</p></div> : <div className="status-card"><Broadcast /><div><strong>{member.wall ? "你已點亮交誼廳" : "報到資料已完成保存"}</strong><span>{member.match ? "你已進入下一輪媒合候選名單。" : "你目前沒有參與隨機媒合。"}</span></div></div>}
      <div className="checked-actions">{event.mode !== "matched" && <DownloadButton member={member} compactText />}<button className="text-action" onClick={onEdit}>編輯資料</button></div>
    </div>
  </section>;
}

function dataUrlToBlob(dataUrl) {
  const [meta, data] = dataUrl.split(",");
  const bytes = Uint8Array.from(atob(data), (char) => char.charCodeAt(0));
  return new Blob([bytes], { type: meta.match(/data:(.*?);/)?.[1] || "image/jpeg" });
}

function CheckInApp({ member, setMember, identity, setIdentity, event }) {
  const [step, setStep] = useState(member ? 4 : 0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(member || { id: identity?.id || crypto.randomUUID(), nickname: "", role: "", skills: [], greeting: "", photo: "" });

  useEffect(() => { if (member && step === 0) { setDraft(member); setStep(4); } }, [member, step]);
  useEffect(() => {
    if (!member || !identity) return undefined;
    const heartbeat = () => api(`/api/participants/${identity.id}/heartbeat`, { method: "POST", participantToken: identity.token }).catch(() => {});
    heartbeat(); const timer = window.setInterval(heartbeat, 20000); return () => window.clearInterval(timer);
  }, [member, identity]);

  const matchLoader = useCallback(async () => {
    if (!identity || event.mode !== "matched") return null;
    return (await api(`/api/matches/me?participantId=${encodeURIComponent(identity.id)}`, { participantToken: identity.token })).match;
  }, [identity, event.mode]);
  const { value: match } = usePolling(matchLoader, 1800, null);

  const complete = async (next) => {
    setSubmitting(true); setError("");
    const nextIdentity = identity || { id: next.id || crypto.randomUUID(), token: crypto.randomUUID() + crypto.randomUUID() };
    try {
      let saved = await api("/api/participants", {
        method: "POST", participantToken: nextIdentity.token,
        body: { id: nextIdentity.id, nickname: next.nickname.trim(), role: next.role, skills: next.skills, greeting: next.greeting.trim(), wall: next.wall, match: next.match },
      });
      if (next.photo?.startsWith("data:")) {
        try {
          const uploaded = await api(`/api/participants/${nextIdentity.id}/photo`, { method: "POST", participantToken: nextIdentity.token, body: dataUrlToBlob(next.photo), headers: { "content-type": "image/jpeg" } });
          saved = { ...saved, photo: uploaded.photo };
        } catch { saved = { ...saved, photo: next.photo }; }
      } else if (next.photo) saved = { ...saved, photo: next.photo };
      saveIdentity(nextIdentity); setIdentity(nextIdentity); setMember(saved); setDraft(saved); setStep(4);
    } catch (nextError) { setError(nextError.message); }
    finally { setSubmitting(false); }
  };

  return <main className="checkin-stage"><div className="phone-shell">
    {step === 0 && <Welcome onStart={() => setStep(1)} />}
    {step === 1 && <RoleSelection selected={draft.role} onSelect={(role) => setDraft({ ...draft, role })} onNext={() => setStep(2)} onBack={() => setStep(0)} />}
    {step === 2 && <ProfileForm draft={draft} onChange={setDraft} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
    {step === 3 && <BadgePreview draft={draft} onBack={() => setStep(2)} onComplete={complete} submitting={submitting} error={error} />}
    {step === 4 && <CheckedIn member={draft} event={event} match={match} onEdit={() => setStep(2)} />}
  </div><aside className="checkin-copy"><span className="section-label">MOBILE CHECK-IN</span><h2>六十秒，<br />把陌生變成<br /><em>可以開始的對話。</em></h2><p>照片、暱稱、角色與技能會生成你的公會徽章。是否登上大屏、是否參與媒合，始終由你決定。</p><div className="copy-stats"><strong>4</strong><span>種公會角色</span><strong>1</strong><span>次意外相遇</span></div></aside></main>;
}

function LoungeMemberCard({ member, index }) {
  const role = ROLES[member.role] || ROLES.mechanic;
  return <article className="lounge-member" style={{ "--role-color": role.color, "--delay": `${index * 40}ms` }}><div className="member-photo">{member.photo ? <img src={member.photo} alt="" /> : <span>{member.nickname.slice(0, 1)}</span>}</div><div><span className="member-role"><RoleIcon role={member.role} size={14} /> {role.title}</span><strong>{member.nickname}</strong><small>{member.skills.join(" · ")}</small></div></article>;
}

function LoungeScreen({ members, event, hostToken, setEvent }) {
  const [qr, setQr] = useState("");
  const completeRound = useCallback(async () => {
    try { setEvent(await api("/api/host/complete-round", { method: "POST", hostToken })); } catch { /* next poll retries */ }
  }, [hostToken, setEvent]);
  useEffect(() => {
    const url = `${window.location.origin}${window.location.pathname}?surface=checkin&entry=qr`;
    QRCode.toDataURL(url, { margin: 1, width: 240, color: { dark: "#050505", light: "#eaff00" } }).then(setQr);
  }, []);
  return <main className={`lounge-stage mode-${event.mode}`}><div className="lounge-poster-texture" aria-hidden="true" /><header className="lounge-header"><div><span>FREEDOM PARTY / GUILD LOUNGE</span><h1>巫師公會交誼廳</h1></div><div className="online-count"><i /> {members.length} 位成員正在交誼廳</div></header>
    {event.mode === "idle" && <><section className="lounge-center"><div className="portal-copy"><span className="section-label">THE GUILD LOUNGE</span><h2>自由的力量<br />正在匯聚</h2><p>掃描右側 QR Code，選擇你的角色，領取公會徽章。</p></div><div className="role-totals">{Object.values(ROLES).map((role) => <div key={role.id} style={{ "--role-color": role.color }}><RoleIcon role={role.id} /><strong>{members.filter((m) => m.role === role.id).length}</strong><span>{role.title}</span></div>)}</div></section><section className={`member-wall ${members.length === 0 ? "empty" : ""}`}>{members.length ? members.map((item, index) => <LoungeMemberCard key={item.id} member={item} index={index} />) : <div className="empty-wall"><Sparkle size={34} /><strong>等待第一位公會成員點亮大屏</strong><span>掃描 QR Code 完成報到後，識別卡會即時出現在這裡。</span></div>}</section><aside className="qr-panel"><span>JOIN THE GUILD</span>{qr && <img src={qr} alt="僅供手機報到的 QR Code" />}<strong>掃碼領取<br />公會徽章</strong><small>此 QR Code 僅開啟手機報到</small></aside></>}
    {event.mode === "countdown" && <section className="countdown-scene"><span className="ritual-kicker"><Sparkle weight="fill" /> THE ENCOUNTER RITUAL <Sparkle weight="fill" /></span><h2>相遇儀式<br />即將開始</h2><strong className="giant-countdown"><LiveCountdown endsAt={event.endsAt} onDone={completeRound} /></strong><p>請保持手機活動頁開啟，配對即將揭曉</p><div className="countdown-role-row">{Object.values(ROLES).map((role) => <span key={role.id} style={{ "--role-color": role.color }}><RoleIcon role={role.id} /> {role.title}</span>)}</div></section>}
    {event.mode === "matched" && <section className="matched-scene"><span className="ritual-kicker"><Sparkle weight="fill" /> CONNECTIONS UNLOCKED <Sparkle weight="fill" /></span><h2>召喚完成</h2><div className="match-stat"><strong>{event.matchCount || 0}</strong><span>位夥伴<br />收到召喚</span></div><p>看看手機，找到你的自由夥伴。給彼此五分鐘，從一個技能開始聊天。</p><div className="conversation-prompt"><span>本輪開場題</span><strong>「你最近最想完成的一件事是什麼？」</strong></div></section>}
  </main>;
}

function Stat({ label, value, note, accent }) { return <div className={`stat-card ${accent ? "accent" : ""}`}><span>{label}</span><strong>{String(value).padStart(2, "0")}</strong><small>{note}</small></div>; }

function AdminDashboard({ members, event, hostToken, setEvent }) {
  const [seconds, setSeconds] = useState(30);
  const [actionError, setActionError] = useState("");
  const roleCounts = Object.values(ROLES).map((role) => ({ ...role, count: members.filter((item) => item.role === role.id).length }));
  const updateEvent = async (payload) => {
    setActionError("");
    try { setEvent(await api("/api/host/event", { method: "POST", hostToken, body: payload })); }
    catch (error) { setActionError(error.message); }
  };
  const start = () => updateEvent({ mode: "countdown", durationSeconds: seconds });
  const reset = () => updateEvent({ mode: "idle" });
  const resetData = async () => {
    if (!window.confirm("確定清除所有報到與媒合資料？此動作無法復原。")) return;
    try { await api("/api/host/reset", { method: "DELETE", hostToken }); setEvent(EMPTY_EVENT); }
    catch (error) { setActionError(error.message); }
  };
  return <main className="admin-stage"><header className="admin-header"><div><span className="section-label">HOST CONTROL</span><h1>主持人控制台</h1><p>自由派對・巫師公會交誼廳</p></div><div className="system-live"><i /> 系統連線正常</div></header><section className="admin-grid"><div className="admin-main"><div className="admin-stats"><Stat label="完成報到" value={members.length} note="正式資料庫" /><Stat label="目前在線" value={members.filter((m) => m.online).length} note="最近 90 秒有連線" /><Stat label="願意媒合" value={members.filter((m) => m.match).length} note="本輪候選者" accent /><Stat label="已完成輪次" value={event.round} note="今日活動" /></div>
    <div className="control-panel"><div className="panel-heading"><div><span>ENCOUNTER CONTROL</span><h2>啟動相遇儀式</h2></div><Timer size={34} /></div><div className="timer-presets">{[10, 30, 60, 180].map((value) => <button key={value} className={seconds === value ? "active" : ""} onClick={() => setSeconds(value)}>{value < 60 ? `${value} 秒` : `${value / 60} 分鐘`}</button>)}</div><div className="event-status"><span>目前狀態</span><strong>{event.mode === "idle" ? "交誼廳開放中" : event.mode === "countdown" ? "媒合倒數中" : "媒合已揭曉"}</strong></div>{event.mode === "idle" ? <button className="summon-button" disabled={members.filter((m) => m.match && m.online).length < 2} onClick={start}><Play weight="fill" /> 啟動本輪媒合</button> : <button className="summon-button stop" onClick={reset}>結束本輪並返回交誼廳</button>}{actionError && <p className="form-error">{actionError}</p>}</div>
    <div className="member-table-panel"><div className="panel-title"><h2>現場成員</h2><span>{members.length} MEMBERS</span></div><div className="member-table"><div className="table-head"><span>成員</span><span>公會角色</span><span>技能</span><span>狀態</span></div>{members.length ? members.slice(0, 12).map((item) => <div className="table-row" key={item.id}><span className="table-person"><i style={{ background: ROLES[item.role]?.color }}>{item.nickname.slice(0, 1)}</i><strong>{item.nickname}</strong></span><span className="table-role"><RoleIcon role={item.role} /> {ROLES[item.role]?.title}</span><span>{item.skills.join("、")}</span><span className={item.online ? "status-online" : "status-offline"}>● {item.online ? "在線" : "離線"}</span></div>) : <p className="table-empty">尚未有人完成報到</p>}</div></div></div>
    <aside className="admin-side"><div className="role-distribution"><div className="panel-title"><h2>公會力量</h2><span>LIVE</span></div>{roleCounts.map((role) => <div className="distribution-row" key={role.id}><span className="distribution-icon" style={{ color: role.color }}><RoleIcon role={role.id} /></span><div><strong>{role.title}</strong><small>{role.real}</small></div><b>{role.count}</b><i><em style={{ width: `${Math.max(0, role.count * 24)}%`, background: role.color }} /></i></div>)}</div><div className="host-note"><Broadcast size={28} /><div><strong>主持提示</strong><p>{event.mode === "idle" ? "至少有兩位在線且願意媒合的成員後，即可啟動倒數。" : event.mode === "countdown" ? "提醒大家保持頁面開啟，倒數結束後配對結果會在手機揭曉。" : "請給彼此五分鐘，從卡片上的一個技能開始對話。"}</p></div></div><button className="danger-action" onClick={resetData}>清除所有報到與媒合資料</button></aside>
  </section></main>;
}

function HostGate() {
  return <main className="host-gate"><div><span className="brand-mark">FW</span><h1>工作人員入口</h1><p>這個畫面只開放給持有工作人員連結的裝置。請使用主持人專用網址重新進入。</p><a href="?surface=checkin&entry=qr">返回手機報到</a></div></main>;
}

export function App() {
  const initialParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const requested = initialParams.get("surface");
  const [identity, setIdentity] = useState(readIdentity);
  const [member, setMember] = useState(null);
  const [hostToken, setHostToken] = useState(() => sessionStorage.getItem("guild:host:v1") || "");
  const [hostStatus, setHostStatus] = useState(() => import.meta.env.DEV && initialParams.get("staff") === "1" ? "verified" : hostToken ? "checking" : "public");
  const [surface, setSurface] = useState(["checkin", "lounge", "admin"].includes(requested) ? requested : "checkin");

  useEffect(() => {
    if (localStorage.getItem("guild:migration:v2") !== "done") {
      localStorage.removeItem("guild:member"); localStorage.removeItem("guild:event");
      localStorage.setItem("guild:migration:v2", "done");
    }
  }, []);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const supplied = hash.get("host");
    const token = supplied || hostToken;
    if (!token || hostStatus === "verified") return;
    if (supplied) window.history.replaceState({}, "", window.location.pathname + window.location.search);
    setHostStatus("checking");
    api("/api/host/verify", { hostToken: token }).then(() => {
      sessionStorage.setItem("guild:host:v1", token); setHostToken(token); setHostStatus("verified");
    }).catch(() => { sessionStorage.removeItem("guild:host:v1"); setHostToken(""); setHostStatus("denied"); });
  }, [hostStatus, hostToken]);

  const hostVerified = hostStatus === "verified";
  const memberLoader = useCallback(async () => {
    if (!identity) return null;
    try { return await api(`/api/participants/${identity.id}`, { participantToken: identity.token }); }
    catch (error) { if (/找不到/.test(error.message)) { saveIdentity(null); setIdentity(null); } throw error; }
  }, [identity]);
  const eventLoader = useCallback(() => api("/api/event"), []);
  const membersLoader = useCallback(() => hostVerified ? api("/api/host/participants", { hostToken }).then((data) => data.participants) : Promise.resolve([]), [hostVerified, hostToken]);
  const memberPoll = usePolling(memberLoader, 5000, null);
  const eventPoll = usePolling(eventLoader, 1500, EMPTY_EVENT);
  const membersPoll = usePolling(membersLoader, 1800, []);

  useEffect(() => { if (memberPoll.value) setMember(memberPoll.value); }, [memberPoll.value]);
  const event = eventPoll.value || EMPTY_EVENT;
  const members = membersPoll.value || [];
  const changeSurface = (next) => {
    if (next !== "checkin" && !hostVerified) return;
    setSurface(next); const url = new URL(window.location.href); url.searchParams.set("surface", next); url.searchParams.delete("entry"); window.history.replaceState({}, "", url.pathname + url.search);
  };

  const staffRequested = surface !== "checkin";
  if (staffRequested && !hostVerified) {
    if (hostStatus === "checking") return <main className="host-gate"><div><Sparkle size={34} /><h1>正在驗證工作人員連結…</h1></div></main>;
    return <HostGate />;
  }

  return <div className={`app surface-${surface} ${hostVerified ? "host-session" : "public-checkin"}`}>
    {hostVerified && <AppNav surface={surface} onSurface={changeSurface} />}
    {surface === "checkin" && <CheckInApp member={member} setMember={setMember} identity={identity} setIdentity={setIdentity} event={event} />}
    {surface === "lounge" && <LoungeScreen members={members.filter((item) => item.wall)} event={event} hostToken={hostToken} setEvent={eventPoll.setValue} />}
    {surface === "admin" && <AdminDashboard members={members} event={event} hostToken={hostToken} setEvent={eventPoll.setValue} />}
  </div>;
}
