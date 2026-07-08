// ※ 이미지 에셋인 milky_way02.png는 픽셀 오류 방지를 위해 알파 채널이 포함된 투명 PNG-24 포맷으로 저장해 주세요.
// ===========================================================
//  🔊 Web Audio API 오디오 시스템
// ===========================================================
const SoundManager = {
    ctx: null, masterGain: null, isMuted: false, bgm: null, bgmGain: null,
    init() {
        if (this.ctx) return;
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AC();
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);
            const saved = localStorage.getItem('xnot_mute');
            this.isMuted = saved === 'true';
            this.masterGain.gain.value = this.isMuted ? 0 : 0.6;

            // BGM 오디오 객체 동적 생성 및 노드 연동
            this.bgm = new Audio('audio/bgm_lobby.mp3');
            this.bgm.loop = true;
            this.bgmGain = this.ctx.createGain();
            this.bgmGain.gain.setValueAtTime(0.25, this.ctx.currentTime);
            const bgmSource = this.ctx.createMediaElementSource(this.bgm);
            bgmSource.connect(this.bgmGain);
            this.bgmGain.connect(this.masterGain);

            if (!this.isMuted) {
                this.bgm.play().catch(e => {});
            }

            this.updateMuteUI();
        } catch(e) {}
    },
    resume() {
        this.init();
        if (this.ctx && this.ctx.state==='suspended') this.ctx.resume();
        if (this.bgm && !this.isMuted && this.bgm.paused) {
            this.bgm.play().catch(e => {});
        }
    },
    setMute(v) {
        this.isMuted = v;
        localStorage.setItem('xnot_mute', v);
        if (this.masterGain && this.ctx) this.masterGain.gain.setValueAtTime(v?0:0.6, this.ctx.currentTime);
        if (this.bgm) {
            if (v) {
                this.bgm.pause();
            } else {
                this.bgm.play().catch(e => {});
            }
        }
        this.updateMuteUI();
    },
    updateMuteUI() { const b = document.getElementById('mute-btn'); if (b) b.innerText = this.isMuted ? '🔇' : '🔊'; },
    _play(freq, type, dur, vol=0.3, freqEnd=null) {
        if (this.isMuted || !this.ctx) return;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.connect(g); g.connect(this.masterGain);
        o.type = type;
        o.frequency.setValueAtTime(freq, this.ctx.currentTime);
        if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, this.ctx.currentTime + dur);
        g.gain.setValueAtTime(vol, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
        o.start(); o.stop(this.ctx.currentTime + dur + 0.01);
    },
    playTick()    { this.resume(); this._play(800,'triangle',0.04,0.18,100); },
    playLaunch(s) { this.resume(); this._play(240+s*10,'triangle',0.28,0.4,55); },
    playBounce(p) {
        this.resume();
        const stone = selectedStone || { id: 1, rarity: 'Rare' };
        const stoneId = stone.id;

        if (stoneId === 0) {
            const freq = p ? 1100 : 900;
            const dur = p ? 0.08 : 0.05;
            this._play(freq, 'triangle', dur, p ? 0.25 : 0.15, p ? 800 : 700);
        } else if (stoneId === 1) {
            if (p) {
                [880,1320,1760].forEach((f,i)=>this._play(f,'sine',0.5,0.2/(i+1)));
            } else {
                this._play(140, 'sine', 0.13, 0.35, 400);
            }
        } else if (stoneId === 2) {
            const startFreq = p ? 200 : 160;
            const dur = p ? 0.15 : 0.11;
            const vol = p ? 0.45 : 0.35;
            this._play(startFreq, 'sawtooth', dur, vol, startFreq - 100);
            this._play(startFreq - 40, 'triangle', dur + 0.03, vol * 0.7, startFreq - 120);
        } else if (stoneId === 3) {
            const volMult = p ? 1.5 : 0.8;
            [880, 1320, 1760].forEach((f, i) => {
                this._play(f, 'sine', p ? 0.5 : 0.3, (0.2 / (i+1)) * volMult);
            });
        }
    },
    playSink() { this.resume(); for(let i=0;i<3;i++) { const d=i*0.08; setTimeout(()=>this._play(180-i*35,'sine',0.14,0.25,40),d*1000); } },
    playUpgrade() { this.resume(); this._play(523,'sine',0.12,0.15); setTimeout(()=>this._play(659,'sine',0.18,0.15),100); },
    playFanfare() {
        this.resume();
        const notes=[261,329,392,523,659,784];
        notes.forEach((f,i)=>setTimeout(()=>this._play(f,'triangle',0.4,0.12),i*70));
    },
    pauseAll() {
        if (this.bgm) this.bgm.pause();
        if (this.ctx && this.ctx.state !== 'suspended') this.ctx.suspend();
    },
    resumeAll() {
        if (this.isMuted === true) return;
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
        if (this.bgm && this.bgm.paused) this.bgm.play().catch(e => {});
    }
};

function toggleMute(e) { e?.preventDefault(); SoundManager.resume(); SoundManager.setMute(!SoundManager.isMuted); haptic('light'); }

// ===========================================================
//  🌐 다국어 사전 (i18n Localization)
// ===========================================================
const i18n = {
    ko: {
        introTitle:'XNOT 물수제비 채굴', introDesc:'XNOT 물수제비 채굴은 차세대 디지털 자산인 XNOT 코인을 강물 위 물수제비의 탄성을 이용해 채굴하는 하이퍼 캐주얼 광산 게임입니다. 돌을 튕겨 최적의 탄성을 얻고 SP를 채굴하세요!',
        introStartBtn:'게임 시작 ⛏️', introInfoBtn:'게임 소개 ℹ️', introInfoTitle:'게임 소개',
        lobbyTitle:'룰렛을 터치하여 돌을 뽑으세요', spinBtn:'룰렛 돌리기', shopBtn:'⚙️ 돌 능력 강화 상점',
        stoneReady:'돌 준비 완료!', launchBtn:'돌 던지기 (하트 1 소모)', wheelTouch:'돌 뽑기 터치!',
        stone0:'납작한 슬레이트', stone0Desc:'안정적인 각도, 평균 튕김 수 최고 (대박: 0.1%)',
        stone1:'거친 강가 조약돌', stone1Desc:'표준 성능의 무난한 기본 조약돌 (대박: 2%)',
        stone2:'고밀도 현무암', stone2Desc:'평균적으론 무겁지만 2.5% 확률로 관성 폭발 대박',
        stone3:'XNOT 황금 운석', stone3Desc:'50% 확률로 타 특성 복제, 1/200만 확률로 은하 활공',
        ready:'READY', prepareMsg:'돌을 잡고 위로 빠르게 던지세요!', swipeGuide:'▲ 위로 빠르게 쓸어올리세요! ▲',
        heartsLack:'하트 부족! 에너지를 충전하세요.', watchAd:'❤️ 유튜브 시청하고 하트 완충',
        adTitle:'유튜브 광고 시청 중...', adDesc:'하트를 충전하기 위해 대표님 채널 영상을 시청하고 있습니다.', adComplete:'시청 완료 시 하트 5개가 완충됩니다.',
        perfectTiming:'완벽한 타이밍과 각도!', goodTiming:'좋은 타이밍!', badTiming:'조금 어긋난 타이밍...',
        missMsg:'타이밍을 놓쳐 돌이 수면에 가라앉았습니다.', sinkMsg:'동력을 잃어 가라앉았습니다.',
        resTitle:'물수제비 결과', resStone:'🪨 선택한 돌', resBounces:'🎯 튕김 횟수', resPerfects:'⭐ Perfect 횟수', resEarned:'💎 획득 SP', resConfirm:'확인',
        perfect:'PERFECT', bouncesUnit:'회',
        lightningLaunch:'초광속 발사!', fastLaunch:'쾌속 발사!', normalLaunch:'일반 발사', speedText:'속도', upgradeSuccess:'속성 강화 성공!'
    },
    en: {
        introTitle:'XNOT Stone Skipper', introDesc:'XNOT Stone Skipper is a hyper-casual mining game where you mine XNOT Coin using the elasticity of skipping stones. Bounce stones to mine SP!',
        introStartBtn:'Start Game ⛏️', introInfoBtn:'Game Info ℹ️', introInfoTitle:'Game Info',
        lobbyTitle:'Touch the wheel to pick a stone', spinBtn:'SPIN WHEEL', shopBtn:'⚙️ Upgrade Properties',
        stoneReady:'STONE READY!', launchBtn:'LAUNCH STONE (Cost 1 ❤️)', wheelTouch:'Touch to Spin!',
        stone0:'Flat Slate', stone0Desc:'Highly stable angle, best average skips (Jackpot: 0.1%)',
        stone1:'Rough Pebble', stone1Desc:'Standard performance starter stone (Jackpot: 2%)',
        stone2:'Dense Basalt', stone2Desc:'Heavy avg, 2.5% chance of inertia explosion jackpot',
        stone3:'XNOT Gold Meteor', stone3Desc:'50% mimic chance, 1/2M galaxy glide lottery',
        ready:'READY', prepareMsg:'Grab the stone and swipe up fast!', swipeGuide:'▲ SWIPE UP FAST! ▲',
        heartsLack:'No hearts! Recharge energy.', watchAd:'❤️ Watch YouTube to Refill',
        adTitle:'Watching Ad...', adDesc:'Watching the channel video to recharge hearts.', adComplete:'5 hearts will be refilled.',
        perfectTiming:'Perfect timing and angle!', goodTiming:'Good timing!', badTiming:'Slightly off timing...',
        missMsg:'Missed timing, the stone sank.', sinkMsg:'Inertia lost, stone sank.',
        resTitle:'Skip Results', resStone:'🪨 Selected Stone', resBounces:'🎯 Bounces', resPerfects:'⭐ Perfects', resEarned:'💎 Earned SP', resConfirm:'Confirm',
        perfect:'PERFECT', bouncesUnit:'times',
        lightningLaunch:'Lightning Launch!', fastLaunch:'Fast Launch!', normalLaunch:'Normal Launch', speedText:'Speed', upgradeSuccess:'Upgrade Success!'
    }
};

let currentLang = 'en';
function initLang() {
    let lang = 'en';
    try { lang = (window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code || navigator.language || 'en').toLowerCase().split('-')[0]; } catch(e){}
    currentLang = i18n[lang] ? lang : 'en';
}
function t(k) { return (i18n[currentLang]?.[k]) || (i18n['en']?.[k]) || k; }
function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const k=el.getAttribute('data-i18n');
        if(t(k)!==k) el.innerText=t(k);
    });

    const introStart = document.getElementById('intro-start-btn');
    if (introStart) introStart.innerText = t('introStartBtn');

    const introInfo = document.getElementById('intro-info-btn');
    if (introInfo) introInfo.innerText = t('introInfoBtn');

    const shopBtn = document.getElementById('shop-btn');
    if (shopBtn) shopBtn.innerText = t('shopBtn');

    const mainBtn = document.getElementById('main-btn');
    if (mainBtn) mainBtn.innerText = t('spinBtn');

    const message = document.getElementById('message');
    if (message) message.innerText = t('prepareMsg');

    const scoreDisp = document.getElementById('score-display');
    if (scoreDisp) scoreDisp.innerText = t('ready');

    const swipeGuide = document.getElementById('swipe-guide');
    if (swipeGuide) swipeGuide.innerText = t('swipeGuide');
}

// ===========================================================
//  📳 텔레그램 햅틱 진동 피드백
// ===========================================================
function haptic(type) {
    try {
        const h = window.Telegram?.WebApp?.HapticFeedback;
        if (!h) return;
        if (['light','medium','heavy'].includes(type)) h.impactOccurred(type);
        else if (['error','success'].includes(type)) h.notificationOccurred(type);
    } catch(e) {}
}

// ===========================================================
//  🪨 돌 고유 데이터 구조 명세
// ===========================================================
const STONES = [
    {
        id: 0, nameKey: 'stone0', name: '납작한 슬레이트', rarity: 'Ordinary', color: '#94a3b8',
        img: 'images/stone_slate.png', w: 150, h: 69, mult: 1.5,
        physics: { vzDecay:0.87, vyDecay:0.965, baseVz:1.0, friction:0.995, critChance:0.001, critMult:1.1 }
    },
    {
        id: 1, nameKey: 'stone1', name: '거친 강가 조약돌', rarity: 'Rare', color: '#38bdf8',
        img: 'images/stone_pebble.png', w: 85, h: 85, mult: 1.0,
        physics: { vzDecay:0.82, vyDecay:0.94, baseVz:1.5, friction:0.986, critChance:0.02, critMult:1.25 }
    },
    {
        id: 2, nameKey: 'stone2', name: '고밀도 현무암', rarity: 'Legendary', color: '#c084fc',
        img: 'images/stone_basalt.png', w: 95, h: 95, mult: 0.6,
        physics: {
            vzDecay:0.70, vyDecay:0.90, baseVz:0.8, friction:0.970, critChance:0.025,
            critPhysics: { vzDecay:0.90, vyDecay:0.98, baseVz:1.6, friction:0.998 }
        }
    },
    {
        id: 3, nameKey: 'stone3', name: 'XNOT 황금 운석', rarity: 'Mythic', color: '#ffd700',
        img: 'images/stone_gold.png', w: 90, h: 85, mult: 2.5,
        physics: {
            lottoChance: 1/2036265,
            lottoPhysics: { vzDecay:0.99, vyDecay:0.999, baseVz:2.5, friction:0.9999 }
        }
    }
];

// ===========================================================
//  📊 게임 구동 전역 상태 엔진 변수
// ===========================================================
let playerHearts = 5;
let playerSP = 0;
let upgrades = { weight:0, elasticity:0, spin:0 };
let gaugeSpeedMult = 2.0;
const UPGRADE_BASE_COST = 300, MAX_LV = 10;

let selectedStone = null;
let isSpinning = false;
let currentStatus = 'PRE_SPIN'; 
let isPlaying = false;
let isDead = false;

let bounceCount = 0, perfectCount = 0, hasTappedBounce = false, tapsInCurrentCycle = 0;
let launchAngle = 20;
let angleVal = 0.5, angleDir = 1;
let angleTimerId = null;
let animFrameId = null;

// 실시간 3축 물리학 벡터
let stone = { x:0, y:0, z:0, vx:0, vy:0, vz:0, activePhys:null, isCrit:false, isLotto:false };
const GRAVITY = 0.16; // 💡 1번 수정: 부드러운 순정 중력값 복구
let swipeSpeed = 0;
let markerProgress = 0; 
let tapWindowStart = 0; 
let isWindowActive = false; 

// 화면 포지션 기준점
let W = window.innerWidth, H = window.innerHeight;
let CX = W/2, HORIZON_Y = H * 0.42;   
let STONE_FIXED_X = CX;               
let STONE_FIXED_Y = H * 0.68;         

// 입력 핸들러 제어 변수
let isDragging = false, dragTouchId = null;
let startX = 0, startY = 0, startTime = 0;

// 동적 수면 백드롭 이미지 프리 캐싱 레이어
const BG_FILES = [
    'images/foreground.png',
    'images/midground.png',
    'images/background.png',
    'images/foreground_lake.png',
    'images/midground_lake.png',
    'images/background_lake.png',
    'images/foreground_river.png',
    'images/midground_river.png',
    'images/background_river.png'
];
const bgImgCache = {};
BG_FILES.forEach(p => {
    const i = new Image();
    i.src = p;
    bgImgCache[p] = i;
});
let currentBgPath = BG_FILES[0];
let currentTheme = 'lake';

const RARITY_BG = { Ordinary: new Image(), Rare: new Image(), Legendary: new Image(), Mythic: new Image() };
RARITY_BG.Ordinary.src  = 'images/background_ordinary.png';
RARITY_BG.Rare.src      = 'images/background_rare.png';
RARITY_BG.Legendary.src = 'images/background_legendary.png';
RARITY_BG.Mythic.src    = 'images/background_mythic.png';

// 엔티티 오브젝트 풀
let particles = [];
let wakes = [];
let rippleLayers = [];
for (let i=0; i<14; i++) rippleLayers.push({ z: i/14 });

const LAYERS = [
    { id:'sky',      parallax:0.0  },
    { id:'far-isle', parallax:0.04 },
    { id:'horizon',  parallax:0.10 },
    { id:'water-far',parallax:0.20 },
    { id:'water-mid',parallax:0.42 },
    { id:'water-near',parallax:0.78},
    { id:'shore',    parallax:1.4  }
];
let layerProgress = 0; 

// ===========================================================
//  🖼️ 디스플레이 렌더러 파이프라인 컨텍스트 초기화
// ===========================================================
const bgCanvas = document.getElementById('bg-canvas');
const bgCtx    = bgCanvas.getContext('2d');
const fxCanvas = document.getElementById('fx-canvas');
const fxCtx    = fxCanvas.getContext('2d');

function resizeCanvases() {
    W = window.innerWidth; H = window.innerHeight;
    bgCanvas.width = fxCanvas.width  = W;
    bgCanvas.height = fxCanvas.height = H;
    CX = W/2; HORIZON_Y = H*0.42;
    STONE_FIXED_X = CX; STONE_FIXED_Y = H*0.68;
}
window.addEventListener('resize', resizeCanvases);
resizeCanvases();

// ===========================================================
//  💾 데이터 입출력 (Local & Cloud Storage)
// ===========================================================
function saveData() {
    const d = { sp:playerSP, upgrades, walletAddress: userWalletAddress };
    localStorage.setItem('xnot_v4_save', JSON.stringify(d));
    try { window.Telegram?.WebApp?.CloudStorage?.setItem('stone_v4', JSON.stringify(d)); } catch(e){}
}
function loadData() {
    const raw = localStorage.getItem('xnot_v4_save');
    if (raw) {
        try {
            const p = JSON.parse(raw);
            playerSP = p.sp||0;
            if (p.upgrades) { upgrades.weight=p.upgrades.weight||0; upgrades.elasticity=p.upgrades.elasticity||0; upgrades.spin=p.upgrades.spin||0; }
            userWalletAddress = p.walletAddress||null;
        } catch(e){}
    }
    updateAssetUI();
    try {
        window.Telegram?.WebApp?.CloudStorage?.getItem('stone_v4', (err,val)=>{
            if (!err&&val) {
                const p=JSON.parse(val);
                if ((p.sp||0)>playerSP) { playerSP=p.sp; updateAssetUI(); saveData(); }
                if (p.walletAddress && !userWalletAddress) { userWalletAddress = p.walletAddress; }
            }
        });
    } catch(e){}
}

// ===========================================================
//  📱 텔레그램 SDK 초기화 샌드박스
// ===========================================================
function initTMA() {
    if (!window.Telegram?.WebApp) return;
    const tg = window.Telegram.WebApp;
    tg.ready(); tg.expand();
    try { tg.setHeaderColor('#050510'); tg.setBackgroundColor('#050510'); } catch(e){}
    const u = tg.initDataUnsafe?.user;
    if (u) {
        document.getElementById('user-name').innerText = u.first_name||u.username||'Guest';
        document.getElementById('user-card').style.display = 'flex';
    }
}

// ===========================================================
//  💎 TON Connect 지갑 연동 로직
// ===========================================================
let tonConnectUI = null;
let userWalletAddress = null;

function initTonConnect() {
    try {
        const TCUI = window.TONConnectUI;
        if (TCUI) {
            // manifestUrl을 도메인에 관계없이 정상 서빙하도록 origin 주소와 결합
            const manifestUrl = window.location.origin + '/tonconnect-manifest.json';
            tonConnectUI = new TCUI.TonConnectUI({
                manifestUrl: manifestUrl,
                buttonRootId: 'ton-connect-button'
            });

            tonConnectUI.onStatusChange(wallet => {
                const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
                const baseName = tgUser ? (tgUser.first_name || tgUser.username) : 'Guest';
                
                if (wallet) {
                    userWalletAddress = wallet.account.address;
                    console.log("TON 지갑 연결됨:", userWalletAddress);
                    
                    const uName = document.getElementById('user-name');
                    if (uName) {
                        uName.innerText = `${baseName} (${shortenAddress(userWalletAddress)})`;
                    }
                    saveData();
                } else {
                    userWalletAddress = null;
                    console.log("TON 지갑 연결 해제됨");
                    
                    const uName = document.getElementById('user-name');
                    if (uName) {
                        uName.innerText = baseName;
                    }
                    saveData();
                }
            });
        }
    } catch (e) {
        console.error("TON Connect 초기화 실패:", e);
    }
}

function shortenAddress(addr) {
    if (!addr) return '';
    return addr.slice(0, 4) + '...' + addr.slice(-4);
}

// ===========================================================
//  🎨 인터페이스 헬퍼 메소드
// ===========================================================
function updateAssetUI() {
    const hc = document.getElementById('hearts-count');
    const sc = document.getElementById('sp-count');
    if (hc) hc.innerText = playerHearts;
    if (sc) sc.innerText = playerSP.toLocaleString();
    
    const rt = document.getElementById('roulette-title');
    const mb = document.getElementById('main-btn');
    
    if (playerHearts <= 0 && currentStatus === 'PRE_SPIN') {
        if (rt) rt.innerText = t('heartsLack');
        if (mb) {
            mb.innerText = t('watchAd');
            mb.style.background = 'linear-gradient(135deg,#ef4444,#dc2626)';
            mb.style.color = '#fff';
        }
    } else if (currentStatus === 'PRE_SPIN') {
        if (rt) rt.innerText = t('lobbyTitle');
        if (mb) {
            mb.innerText = t('spinBtn');
            mb.style.background = 'linear-gradient(135deg,var(--neon-lime),#a8ff00)';
            mb.style.color = 'var(--ink)';
        }
    }
}
function setAssetBarVisible(v) { document.getElementById('asset-bar').style.display = v?'flex':'none'; }

function triggerShake(strength='medium') {
    const el = document.getElementById('game-container');
    el.classList.remove('shaking');
    void el.offsetWidth;
    el.classList.add('shaking');
    haptic(strength==='heavy'?'heavy':'medium');
    setTimeout(()=>el.classList.remove('shaking'), 480);
}

function spawnDramaticText(text, cls='neon-lime') {
    const d = document.createElement('div');
    d.className = `dramatic-text ${cls}`;
    d.innerText = text;
    document.getElementById('game-container').appendChild(d);
    setTimeout(()=>d.remove(), 1900);
}

function changeRandomBg() {
    currentTheme = Math.random() < 0.5 ? 'lake' : 'river';
    currentBgPath = `images/foreground_${currentTheme}.png`;
    document.getElementById('game-container').style.background = `url('${currentBgPath}') no-repeat center/cover`;
}

// ===========================================================
//  🎰 룰렛 물리 정지 가챠 머신 로직
// ===========================================================
function getCurrentRotation(el) {
    const tr = window.getComputedStyle(el).transform;
    if (tr==='none') return 0;
    const v = tr.split('(')[1].split(')')[0].split(',');
    let a = Math.round(Math.atan2(parseFloat(v[1]),parseFloat(v[0]))*(180/Math.PI));
    return a<0?a+360:a;
}

function triggerWheel(e) {
    e?.preventDefault();
    SoundManager.resume();
    if (playerHearts<=0) { openYoutubeCharge(); return; }
    if (isSpinning || currentStatus!=='PRE_SPIN') return;
    isSpinning = true;

    const idx = Math.floor(Math.random()*STONES.length);
    const stone_def = STONES[idx];
    
    const offsets = [315, 225, 135, 45]; 
    const offset = offsets[idx];
    const totalRot = 2160 + offset; 

    const wEl = document.getElementById('roulette-wheel');
    wEl.style.transition = 'transform 3.8s cubic-bezier(0.15, 0.85, 0.15, 1)';
    wEl.style.transform = `rotate(${totalRot}deg)`;

    let lastSector = 0;
    const tick = () => {
        if (!isSpinning) return;
        const cur = Math.floor(getCurrentRotation(wEl)/45);
        if (cur!==lastSector) { haptic('light'); SoundManager.playTick(); lastSector=cur; }
        requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    wEl.addEventListener('transitionend', ()=>{
        wEl.style.transition = 'none';
        wEl.style.transform = `rotate(${offset}deg)`; 

        selectedStone = stone_def;
        document.getElementById('stone-desc-text').innerText = t(selectedStone.nameKey+'Desc');
        
        const rt = document.getElementById('roulette-title');
        if (rt) rt.innerText = t('stoneReady');
        
        const sectors = wEl.querySelectorAll('.wheel-sector');
        sectors.forEach((sec, sIdx) => {
            if(sIdx === idx) sec.classList.add('highlight');
            else sec.classList.remove('highlight');
        });

        const mb = document.getElementById('main-btn');
        if (mb) {
            mb.innerText = t('launchBtn');
            mb.style.background = 'linear-gradient(135deg,var(--neon-lime),#a8ff00)';
            mb.style.color = 'var(--ink)';
        }

        currentStatus = 'SPIN_DONE';
        isSpinning = false;
        haptic('success');
    }, { once:true });
}

// ===========================================================
//  🕹️ 인게임 진입 및 조작 인터페이스 활성화
// ===========================================================
function handleMainBtn(e) {
    e?.preventDefault();
    SoundManager.resume();
    if (playerHearts<=0 && currentStatus==='PRE_SPIN') { openYoutubeCharge(); return; }
    if (currentStatus==='PRE_SPIN') { triggerWheel(); return; }
    if (currentStatus==='SPIN_DONE') {
        playerHearts--;
        updateAssetUI();
        playSeamlessTransition();
    }
}

// ===========================================================
//  🎬 심리스 프레임 스케일 트랜지션
// ===========================================================
function playSeamlessTransition() {
    const overlay = document.getElementById('transition-overlay');
    const img     = document.getElementById('transition-stone-img');
    const roulette = document.getElementById('roulette-screen');

    overlay.style.display = 'flex';
    overlay.style.background = 'rgba(5,5,20,0)';

    img.style.backgroundImage = `url('${selectedStone.img}')`;
    img.style.width  = `${selectedStone.w}px`;
    img.style.height = `${selectedStone.h}px`;
    img.style.transform = 'scale(1)';
    img.style.opacity = '1';
    img.style.transition = 'none';

    requestAnimationFrame(()=>{
        requestAnimationFrame(()=>{
            img.style.transition = 'transform 0.55s cubic-bezier(0.2,0,0.8,1), opacity 0.55s ease';
            img.style.transform  = 'scale(8)';
            img.style.opacity    = '0';

            overlay.style.transition = 'background 0.3s ease 0.2s';
            overlay.style.background = 'rgba(5,5,20,0.95)';

            roulette.style.transition = 'opacity 0.35s ease 0.15s';
            roulette.style.opacity = '0';

            setTimeout(()=>{
                roulette.style.display = 'none'; roulette.style.opacity = ''; roulette.style.transition = '';
                overlay.style.display = 'none'; overlay.style.background = ''; overlay.style.transition = '';
                img.style.transform = 'scale(1)'; img.style.opacity = '1'; img.style.transition = '';
                startGameplay();
            }, 580);
        });
    });
}

function startGameplay() {
    gaugeSpeedMult = 2.0;
    setStoneStyle();
    const stoneEl = document.getElementById('ingame-stone');
    stoneEl.style.display = 'block'; stoneEl.style.left = `${CX}px`;
    stoneEl.style.bottom = '80px'; stoneEl.style.top = 'auto';
    stoneEl.style.transform = 'translateX(-50%) scale(1)'; stoneEl.style.opacity = '1';

    document.getElementById('score-display').innerText = t('ready');
    document.getElementById('message').innerText       = t('prepareMsg');
    document.getElementById('swipe-guide').style.display = 'block';
    document.getElementById('angle-gauge-wrap').style.display = 'block';

    currentStatus = 'READY_TO_LAUNCH';
    updateGaugePerfectZone();
    startAngleGauge();
    bindLaunchEvents();
    drawStaticBackground();
}

function setStoneStyle() {
    const el = document.getElementById('ingame-stone');
    const s  = selectedStone;
    el.style.width  = `${s.w}px`; el.style.height = `${s.h}px`;
    el.style.backgroundImage    = `url('${s.img}')`;
    el.style.backgroundSize     = 'contain'; el.style.backgroundRepeat = 'no-repeat'; el.style.backgroundPosition = 'center';
    el.style.backgroundColor    = 'transparent'; el.style.border = 'none'; el.style.boxShadow = 'none';
    
    el.style.filter = s.rarity==='Mythic'
        ? 'drop-shadow(0 0 22px rgba(255,215,0,0.85)) drop-shadow(0 8px 14px rgba(0,0,0,0.5))'
        : 'drop-shadow(0 6px 12px rgba(0,0,0,0.55))';
}

// ===========================================================
//  📐 삼각함수 보정 각도 피치 게이지
// ===========================================================
function getAngleZone(angleVal) {
    const perfSize = Math.min(0.10, 0.05 + ((upgrades.perfectZone || 0) * 0.005));
    const pMin = 0.5 - (perfSize / 2);
    const pMax = 0.5 + (perfSize / 2);

    if ((angleVal >= 0.00 && angleVal <= 0.01) || (angleVal >= 0.99 && angleVal <= 1.00)) {
        return 'EASTEREG';
    }
    if ((angleVal > 0.01 && angleVal <= 0.06) || (angleVal >= 0.94 && angleVal < 0.99)) {
        return 'RED';
    }
    if (angleVal >= pMin && angleVal <= pMax) {
        return 'PERFECT';
    }
    if ((angleVal >= pMin - 0.15 && angleVal < pMin) || (angleVal > pMax && angleVal <= pMax + 0.15)) {
        return 'GREEN';
    }
    return 'YELLOW';
}

function updateGaugePerfectZone() {
    const perfSize = Math.min(0.10, 0.05 + ((upgrades.perfectZone || 0) * 0.005));
    const bg = document.getElementById('angle-gauge-bg');
    if (!bg) return;

    let easterBot = document.getElementById('gz-easter-bot');
    if (!easterBot) {
        easterBot = document.createElement('div');
        easterBot.className = 'gauge-zone';
        easterBot.id = 'gz-easter-bot';
        easterBot.style.background = 'rgba(255, 215, 0, 0.7)';
        easterBot.style.borderTop = '1px dashed var(--neon-gold)';
        easterBot.style.borderBottom = '1px dashed var(--neon-gold)';
        bg.appendChild(easterBot);
    }
    let easterTop = document.getElementById('gz-easter-top');
    if (!easterTop) {
        easterTop = document.createElement('div');
        easterTop.className = 'gauge-zone';
        easterTop.id = 'gz-easter-top';
        easterTop.style.background = 'rgba(255, 215, 0, 0.7)';
        easterTop.style.borderTop = '1px dashed var(--neon-gold)';
        easterTop.style.borderBottom = '1px dashed var(--neon-gold)';
        bg.appendChild(easterTop);
    }

    const set = (id, bot, h) => {
        const el = document.getElementById(id);
        if (el) {
            el.style.bottom = `${bot}%`;
            el.style.height = `${h}%`;
        }
    };

    set('gz-easter-bot', 0, 1);
    set('gz-red-bot', 1, 5);
    set('gz-safe-bot', (0.5 - perfSize / 2 - 0.15) * 100, 15);
    set('gz-perfect', (0.5 - perfSize / 2) * 100, perfSize * 100);
    set('gz-safe-top', (0.5 + perfSize / 2) * 100, 15);
    set('gz-red-top', 94, 5);
    set('gz-easter-top', 99, 1);
}

function startAngleGauge() {
    angleVal=0.5; angleDir=1;
    const tick = () => {
        if (currentStatus!=='READY_TO_LAUNCH') return;
        angleVal += angleDir*0.010*gaugeSpeedMult;
        if (angleVal>=1) { angleVal=1; angleDir=-1; }
        else if (angleVal<=0) { 
            angleVal=0; 
            angleDir=1; 
            gaugeSpeedMult = Math.min(3.0, parseFloat((gaugeSpeedMult + 0.2).toFixed(1)));
        }
        document.getElementById('gauge-bar').style.height = `${angleVal*100}%`;
        document.getElementById('gauge-marker').style.bottom = `${angleVal*100}%`;
        launchAngle = 5+angleVal*30;
        angleTimerId = requestAnimationFrame(tick);
    };
    angleTimerId = requestAnimationFrame(tick);
}

// ===========================================================
//  🤚 고속 스와이프 투척 메커니즘
// ===========================================================
function bindLaunchEvents() {
    const el = document.getElementById('ingame-stone');
    el.addEventListener('mousedown', dragStart);
    el.addEventListener('touchstart', dragStart, {passive:false});
    window.addEventListener('mousemove', dragMove);
    window.addEventListener('touchmove', dragMove, {passive:false});
    window.addEventListener('mouseup', dragEnd);
    window.addEventListener('touchend', dragEnd);
}
function unbindLaunchEvents() {
    const el = document.getElementById('ingame-stone');
    el.removeEventListener('mousedown', dragStart); el.removeEventListener('touchstart', dragStart);
    window.removeEventListener('mousemove', dragMove); window.removeEventListener('touchmove', dragMove);
    window.removeEventListener('mouseup', dragEnd); window.removeEventListener('touchend', dragEnd);
}
function dragStart(e) {
    if (currentStatus!=='READY_TO_LAUNCH') return;
    SoundManager.resume(); isDragging = true;
    if (e.touches?.length>0) { dragTouchId=e.touches[0].identifier; startX=e.touches[0].clientX; startY=e.touches[0].clientY; }
    else { dragTouchId=null; startX=e.clientX; startY=e.clientY; }
    startTime = Date.now();
    e.cancelable && e.preventDefault();
}
function dragMove(e) {
    if (!isDragging || currentStatus!=='READY_TO_LAUNCH') return;
    let cx, cy;
    if (e.touches) {
        let t=null; for(let i=0;i<e.touches.length;i++) { if(e.touches[i].identifier===dragTouchId){t=e.touches[i];break;} }
        if (!t) return; cx=t.clientX; cy=t.clientY;
    } else { cx=e.clientX; cy=e.clientY; }
    const dy=startY-cy, dx=cx-startX;
    const el=document.getElementById('ingame-stone');
    el.style.transform=`translate(calc(-50% + ${dx}px), ${-Math.max(0,dy)}px) scale(${dy>0?1.05:1})`;
    if (dy>=150) triggerLaunch(150, dx);
    e.cancelable && e.preventDefault();
}
function dragEnd(e) {
    if (!isDragging) return;
    if (e.changedTouches) {
        let ok=false; for(let i=0;i<e.changedTouches.length;i++){if(e.changedTouches[i].identifier===dragTouchId){ok=true;break;}} if(!ok)return;
    }
    isDragging=false;
    let cx,cy; if (e.changedTouches){cx=e.changedTouches[0].clientX;cy=e.changedTouches[0].clientY;} else{cx=e.clientX;cy=e.clientY;}
    const dy=startY-cy, dx=cx-startX;
    if (dy>15) triggerLaunch(dy,dx);
    else { const el=document.getElementById('ingame-stone'); el.style.transition='transform 0.3s'; el.style.transform='translateX(-50%) scale(1)'; setTimeout(()=>el.style.transition='',350); }
}

// ===========================================================
//  🚀 동적 물리학 탄성 계수 대입 발사
// ===========================================================
function triggerLaunch(dy, dx) {
    isDragging = false; unbindLaunchEvents(); cancelAnimationFrame(angleTimerId);
    document.getElementById('swipe-guide').style.display = 'none';
    document.getElementById('angle-gauge-wrap').style.display = 'none';

    const dur = Math.max(1, Date.now()-startTime); const effDy = Math.min(dy, 150);
    swipeSpeed = Math.min((effDy/dur)*15, 38); const distFact = effDy/150;

    stone.x = 0; stone.y = 0; stone.z = 15;
    const rad = launchAngle*Math.PI/180;
    stone.vy = (swipeSpeed*Math.cos(rad))*distFact;
    stone.vz = (swipeSpeed*Math.sin(rad)*0.75)*distFact;
    stone.vx = ((dx/dur)*2)*distFact;

    let zone = getAngleZone(angleVal);

    if (gaugeSpeedMult >= 3.0 && zone === 'PERFECT') {
        zone = 'EASTEREG';
    }

    let ap=null, isCrit=false, isLotto=false; const ss = selectedStone;
    if (ss.rarity==='Mythic') {
        if (window.forceLotto || Math.random()<ss.physics.lottoChance) { ap=JSON.parse(JSON.stringify(ss.physics.lottoPhysics)); isLotto=true; }
        else {
            const ref = Math.random()<0.5 ? STONES[0] : STONES[2];
            if (ref===STONES[2] && (window.forceCrit||Math.random()<ref.physics.critChance)) { ap=JSON.parse(JSON.stringify(ref.physics.critPhysics)); isCrit=true; }
            else { ap=JSON.parse(JSON.stringify(ref.physics)); if (window.forceCrit||Math.random()<(ap.critChance||0)) isCrit=true; }
        }
    } else if (ss.rarity==='Legendary') {
        if (window.forceCrit||Math.random()<ss.physics.critChance) { ap=JSON.parse(JSON.stringify(ss.physics.critPhysics)); isCrit=true; }
        else { ap=JSON.parse(JSON.stringify(ss.physics)); }
    } else {
        ap=JSON.parse(JSON.stringify(ss.physics)); if (window.forceCrit||Math.random()<(ap.critChance||0)) isCrit=true;
    }

    const sf = swipeSpeed/20; if (ap) ap.friction = Math.min(0.9994, (ap.friction||0.978) + sf*0.0006);

    stone.activePhys = ap; stone.isCrit = isCrit; stone.isLotto = isLotto;
    bounceCount = 0; perfectCount = 0; isDead = false; hasTappedBounce = false; tapsInCurrentCycle = 0;
    markerProgress = 0; 
    isWindowActive = false; 
    tapWindowStart = 0;
    for (let i=0;i<14;i++) rippleLayers[i].z = i/14; layerProgress = 0;

    currentStatus = 'FLYING'; isPlaying = true;
    document.getElementById('score-display').innerText = 'BOUNCE: 0';

    SoundManager.playLaunch(swipeSpeed);

    let mult = 1.0;
    if (zone === 'EASTEREG') {
        mult = 2.0;
        if (gaugeSpeedMult >= 3.0) {
            document.getElementById('message').innerText = "⚡ MAX SPEED HYPER DRIVE! ⚡";
        } else {
            document.getElementById('message').innerText = "⚡ 하이퍼 드라이브 발사! ⚡";
        }
        spawnDramaticText("HYPER DRIVE!", 'neon-gold');
        triggerShake('heavy');

        const flash = document.createElement('div');
        flash.style.cssText = 'position:absolute;inset:0;background:rgba(255,215,0,0.4);z-index:250;pointer-events:none;animation:fade-flash 0.5s ease forwards;';
        document.getElementById('game-container').appendChild(flash);
        setTimeout(() => { flash.remove(); }, 520);

    } else if (zone === 'PERFECT') {
        const stoneRandom = 0.9 + Math.random() * 0.2;
        const swipeWeight = 1.0 + (swipeSpeed * 0.01);
        mult = 1.5 * stoneRandom * swipeWeight;
        document.getElementById('message').innerText = "✨ PERFECT LAUNCH! ✨";
        spawnDramaticText("PERFECT LAUNCH!", 'neon-lime');
        triggerShake('medium');

    } else if (zone === 'GREEN') {
        mult = 1.2;
        document.getElementById('message').innerText = "👍 안정적인 그린 발사";
        haptic('medium');

    } else if (zone === 'RED') {
        mult = 0.0;
        stone.vy = 0;
        stone.vz = 0;
        haptic('error');
        triggerWaterMiss();
        document.getElementById('message').innerText = "❌ MISS! 투척 실패";

    } else {
        mult = 1.0;
        document.getElementById('message').innerText = t('normalLaunch');
        haptic('medium');
    }

    stone.vy *= mult;
    stone.vz *= mult;
    gaugeSpeedMult = 2.0;

    document.getElementById('game-container').addEventListener('mousedown', registerBounceTap);
    document.getElementById('game-container').addEventListener('touchstart', registerBounceTap, {passive:true});

    runGameLoop();
}

function runGameLoop() {
    if (!isPlaying) return;
    updatePhysics(); draw7LayerBG(); drawFxCanvas();
    animFrameId = requestAnimationFrame(runGameLoop);
}

// ===========================================================
//  ⚙️ 고정식 2.5D 스크롤 물리 계산 파이프라인
// ===========================================================
function updatePhysics() {
    if (!isDead) {
        stone.z += stone.vz;
        stone.vz -= GRAVITY; 
        stone.x += stone.vx;
        stone.y += stone.vy;
    } else {
        stone.vz -= GRAVITY * 0.5;
        stone.z += stone.vz;
        applyStonePos();
        return;
    }

    rippleLayers.forEach(l => { l.z += stone.vy*0.0007; if (l.z>=1.0) l.z -= 1.0; });

    for (let i=wakes.length-1;i>=0;i--) {
        const w=wakes[i]; w.xL+=w.vxL; w.xR+=w.vxR; w.y+=w.vy; w.vy*=0.94; w.alpha-=0.022;
        if (w.alpha<=0) wakes.splice(i,1);
    }

    layerProgress += stone.vy * 0.00008;

    const wm = 1 + (upgrades.weight * 0.0008); 
    const sfm = 1 + (swipeSpeed * 0.0001);
    const fr = stone.activePhys ? stone.activePhys.friction : 0.978;
    const baseFr = Math.min(0.9998, fr * wm * sfm);
    const k = 0.04;
    const effectiveFriction = 0.985 + (baseFr - 0.985) * Math.exp(-k * stone.vy);
    stone.vy *= effectiveFriction;
    stone.vx *= Math.min(0.999, 0.99 * wm);

    if (stone.vz < 0) {
        if (!isWindowActive && !hasTappedBounce && !isDead) {
            tapWindowStart = Date.now();
            isWindowActive = true;
        }
    }
    
    if (isWindowActive) {
        markerProgress += 0.04; // 0.05에서 20% 감속된 속도 적용
        if (markerProgress >= 1.0) {
            isWindowActive = false;
        }
    }

    if (stone.vz < 0 && stone.z <= 0 && !isDead) {
        if (hasTappedBounce) {
            triggerWaterMiss();
        } else {
            if (stone.vy > 0.8) {
                processBounce('GOOD', true);
            } else {
                triggerWaterSink();
            }
        }
    }

    if (stone.vz < 0 && stone.z < -6 && !isDead) {
        triggerWaterMiss();
    }

    if (stone.vy<0.8 && !isDead) { triggerWaterSink(); }
    if (currentStatus==='FLYING' && !isDead) { createTrailParticle(STONE_FIXED_X, STONE_FIXED_Y); }

    applyStonePos();
}

function applyStonePos() {
    const el = document.getElementById('ingame-stone');
    const bounceOff = isDead ? stone.z*2 : stone.z * 1.8;
    const x = STONE_FIXED_X; const y = STONE_FIXED_Y - bounceOff;

    el.style.left = `${x}px`; el.style.top = `${y}px`; el.style.bottom = 'auto';

    const rot = stone.y * 2.8;
    if (isDead) {
        const op = Math.max(0, 1+stone.z/50);
        el.style.transform = `translate(-50%,-50%) scale(0.9) rotate(${rot}deg)`; el.style.opacity = op;
    } else {
        el.style.transform = `translate(-50%,-50%) scale(1) rotate(${rot}deg)`; el.style.opacity = '1';
    }
}

// ===========================================================
//  🎯 실시간 타이밍 탭 판정 레이어
// ===========================================================
function registerBounceTap(e) {
    if (currentStatus !== 'FLYING' || isDead) return;

    if (stone.vz >= 0) {
        hasTappedBounce = true; 
        stone.vy *= 0.40;       
        stone.vz *= 0.40;
        spawnDramaticText('연타 패널티! 밸런스 붕괴', 'neon-red');
        haptic('error');
        return;
    }

    if (!isWindowActive || hasTappedBounce) {
        hasTappedBounce = true;
        stone.vy *= 0.40;
        stone.vz *= 0.40;
        spawnDramaticText('연타 패널티! 밸런스 붕괴', 'neon-red');
        haptic('error');
        return;
    }

    // Immediately close the window to prevent multi-tap exploits
    isWindowActive = false; 

    if (markerProgress < 1.0) {
        hasTappedBounce = true;
        processBounce('PERFECT', false);
    } else {
        hasTappedBounce = true;
        processBounce('BAD', false);
    }
}

function processBounce(rating, isAuto = false) {
    bounceCount++; const ex = STONE_FIXED_X, ey = STONE_FIXED_Y;

    if (!isAuto) {
        spawnRatingText(ex, ey, rating);
    }
    spawnRipple(ex, ey);

    const wakeCount = 26;
    for (let i = 0; i < wakeCount / 2; i++) {
        const vxL = -Math.random() * 4 - 2;
        const vyL = -stone.vy * 0.3;
        particles.push(new WakeParticle(ex, ey, vxL, vyL));

        const vxR = Math.random() * 4 + 2;
        const vyR = -stone.vy * 0.3;
        particles.push(new WakeParticle(ex, ey, vxR, vyR));
    }

    const em = Math.pow(1.08, upgrades.elasticity);
    const sp = stone.activePhys || selectedStone.physics; const rarity = selectedStone.rarity;

    if (rarity==='Mythic') triggerShake('heavy');
    else if (rarity==='Legendary') triggerShake('medium');
    else if (rarity==='Rare') triggerShake('light');

    let pCount = rarity==='Mythic'?13 : rarity==='Legendary'?60 : rarity==='Rare'?35 : 22;
    let baseVz=0, multEff=1;

    // 💡 2번 수정: PERFECT 및 GOOD 판정 시 가속 메커니즘을 순정 정통 공식으로 원상복구
    const baseVzFactor = sp.baseVz || 1.5;

    if (rating==='PERFECT') {
        perfectCount++; 
        baseVz = baseVzFactor * selectedStone.mult * 1.35; 
        multEff = 1.06;
        
        if (!isAuto) {
            stone.vy = stone.vy * 1.35 + (upgrades.weight * 1.5); // 강력한 전진 가속 복구!
            const earned = Math.round(100*selectedStone.mult*2.5);
            document.getElementById('message').innerText = `${t('perfectTiming')} (+${earned} SP)`;
            playerSP += earned;
        } else {
            stone.vy = stone.vy * (sp.vyDecay || 0.95);
        }
        
        createParticles(ex,ey,true,false,Math.round(pCount*1.5));
        haptic('heavy'); SoundManager.playBounce(true);
        if (perfectCount===1 && !isAuto) { spawnDramaticText(t('perfect')+' BOUNCE!','neon-lime'); triggerShake('medium'); }
        if (rarity==='Mythic') spawnGodSplash(ex,ey);
    } else if (rating==='GOOD') {
        baseVz = baseVzFactor * selectedStone.mult * 1.0; 
        multEff = 0.98;
        
        if (!isAuto) {
            stone.vy = stone.vy * 1.15 + (upgrades.weight * 0.5); // 쾌적한 속도 유지
            const earned = Math.round(100*selectedStone.mult*1.2);
            document.getElementById('message').innerText = `${t('goodTiming')} (+${earned} SP)`;
            playerSP += earned;
        } else {
            stone.vy = stone.vy * (sp.vyDecay || 0.95); // 자동 바운스 시 가속 배제하고 고유 감쇄 적용
            const earned = Math.round(100*selectedStone.mult*0.8);
            playerSP += earned;
        }
        
        createParticles(ex,ey,false,false,pCount);
        haptic('medium'); SoundManager.playBounce(false);
        if (rarity==='Mythic') spawnGodSplash(ex,ey);
    } else {
        baseVz = baseVzFactor * selectedStone.mult * 0.4; 
        multEff = 0.40;
        stone.vy *= 0.40; // BAD 판정은 속도 디버프 처리
        const earned = Math.round(100*selectedStone.mult*0.4);
        if (!isAuto) {
            document.getElementById('message').innerText = t('badTiming');
        }
        playerSP += earned; createParticles(ex,ey,false,false,4,true);
        haptic('light'); SoundManager.playBounce(false);
    }

    triggerWake(ex, ey, 1.0);
    const spEl = document.getElementById('sp-count'); spEl.style.transform='scale(1.3)'; spEl.style.color='var(--neon-gold)';
    setTimeout(()=>{ spEl.style.transform=''; spEl.style.color=''; }, 220);

    const bdec = Math.pow(sp.vzDecay || 0.83, bounceCount - 1);
    const sbns = 1 + (swipeSpeed / 30);
    stone.z = 0.1;

    // 💡 1번 수정 연속: PERFECT 고도 반토막(* 0.5) 연산 제거 및 고밀도 현무암 특수 기믹 보존
    if (rating === 'PERFECT') {
        if (selectedStone.id === 2) {
            const basaltBdec = Math.pow(0.88, bounceCount - 1);
            stone.vz = baseVz * em * sbns * basaltBdec * 2.4;
        } else {
            stone.vz = baseVz * em * sbns * bdec;
        }
    } else {
        stone.vz = baseVz * em * sbns * bdec;
    }
    stone.vx *= 0.9;

    isWindowActive = false;
    hasTappedBounce = false;
    tapsInCurrentCycle = 0;
    markerProgress = 0; 
    document.getElementById('score-display').innerText = `BOUNCE: ${bounceCount}`;
    updateAssetUI(); saveData(); spawnBounceMarker(ex, ey, bounceCount);
}

function triggerWaterMiss() {
    if (isDead) return;
    isDead = true;
    stone.vz = -3;
    const ex = STONE_FIXED_X, ey = STONE_FIXED_Y;
    
    spawnRatingText(ex, ey, 'MISS');
    spawnRipple(ex, ey);
    createParticles(ex, ey, false, true, 22);
    document.getElementById('message').innerText = t('missMsg');
    haptic('error');
    SoundManager.playSink();

    const trollBox = document.createElement('div');
    trollBox.style.cssText = 'position:absolute;top:45%;left:50%;transform:translate(-50%,-50%);background:rgba(15,23,42,0.95);border:3px solid #ef4444;border-radius:24px;padding:25px;text-align:center;z-index:9999;box-shadow:0 0 30px rgba(239,68,68,0.6);transition:all 0.3s ease;pointer-events:none;';
    
    const roastMsgs = [
        "🦭<br>물수제비가 아니라<br>그냥 돌덩이 투척인 줄!",
        "🐟<br>축하합니다!<br>물고기 밥 주기 성공!",
        "🥱<br>혹시 졸면서 던지셨나요?<br>(퐁당)"
    ];
    trollBox.innerHTML = `<p style="color:#fff;font-size:16px;font-weight:900;line-height:1.5;margin:0;font-family:'Impact',sans-serif;text-shadow:0 2px 4px #000;">${roastMsgs[Math.floor(Math.random() * roastMsgs.length)]}</p>`;
    document.getElementById('game-container').appendChild(trollBox);

    setTimeout(() => {
        trollBox.remove();
        endGame();
    }, 1000);
}

function triggerWaterSink() {
    if (isDead) return;
    isDead = true;
    stone.vz = -1.5;
    const ex = STONE_FIXED_X, ey = STONE_FIXED_Y;
    spawnRipple(ex,ey); createParticles(ex,ey,false,true,14);
    document.getElementById('message').innerText = t('sinkMsg'); haptic('error'); SoundManager.playSink();

    endGame();
}

function triggerWake(x,y,scale) { wakes.push({ x,y,vxL:-W*0.015*scale,vxR:W*0.015*scale, vy:H*0.022*scale,width:9*scale,alpha:1,xL:x,xR:x }); }

// ===========================================================
//  🖼️ 정통 3단 레이어 중첩 패럴랙스 엔진
// ===========================================================
function drawScaledCenteredCoverImage(ctx, img, W, H, scale = 1.0) {
    if (!img || !img.complete) return;
    const imgW = img.naturalWidth || img.width;
    const imgH = img.naturalHeight || img.height;
    const imgRatio = imgW / imgH;
    const canvasRatio = W / H;
    
    let drawW, drawH;
    if (canvasRatio > imgRatio) {
        drawW = W;
        drawH = W / imgRatio;
    } else {
        drawW = H * imgRatio;
        drawH = H;
    }
    
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();

    ctx.translate(W / 2, H / 2);
    ctx.scale(scale, scale);
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
}

function drawStaticBackground() {
    bgCtx.clearRect(0, 0, W, H);
    const imgBase = bgImgCache[`images/background_${currentTheme}.png`];
    const imgMid  = bgImgCache[`images/midground_${currentTheme}.png`];
    const imgFore = bgImgCache[`images/foreground_${currentTheme}.png`];

    if (imgBase && imgBase.complete) drawScaledCenteredCoverImage(bgCtx, imgBase, W, H, 1.0);
    if (imgMid && imgMid.complete) drawScaledCenteredCoverImage(bgCtx, imgMid, W, H, 1.0);
    if (imgFore && imgFore.complete) drawScaledCenteredCoverImage(bgCtx, imgFore, W, H, 1.0);
}

function draw7LayerBG() {
    bgCtx.clearRect(0, 0, W, H);
    bgCtx.globalCompositeOperation = 'source-over';
    
    const vp = { x: W / 2, y: HORIZON_Y };
    const rarity = selectedStone?.rarity || 'Ordinary';

    const imgBase = bgImgCache[`images/background_${currentTheme}.png`];
    const imgMid  = bgImgCache[`images/midground_${currentTheme}.png`];
    const imgFore = bgImgCache[`images/foreground_${currentTheme}.png`];

    bgCtx.save();
    if (imgBase && imgBase.complete) drawScaledCenteredCoverImage(bgCtx, imgBase, W, H, 1.0);
    bgCtx.restore();

    bgCtx.save();
    if (imgMid && imgMid.complete) {
        const midScale = Math.min(1.3, 1.0 + (stone.y * 0.00012));
        drawScaledCenteredCoverImage(bgCtx, imgMid, W, H, midScale);
    }
    bgCtx.restore();

    bgCtx.save();
    if (imgFore && imgFore.complete) {
        const fgScale = 1.0 + (stone.y * 0.015) % 2.5;
        drawScaledCenteredCoverImage(bgCtx, imgFore, W, H, fgScale);
    }
    bgCtx.restore();

    rippleLayers.forEach(l => {
        const rz = l.z; 
        const lineY = HORIZON_Y + (H - HORIZON_Y) * Math.pow(rz, 2.2); 
        const hw = W * 0.5 * Math.pow(rz, 1.4);
        let lAlpha = rz * 0.18; 
        if (rarity === 'Rare') lAlpha = rz * 0.25; 
        else if (rarity === 'Legendary') lAlpha = rz * 0.28; 
        else if (rarity === 'Mythic') lAlpha = rz * 0.35;

        bgCtx.save();
        bgCtx.beginPath(); 
        bgCtx.moveTo(vp.x - hw, lineY); 
        bgCtx.lineTo(vp.x + hw, lineY);
        
        let sc = 'rgba(255,255,255,' + lAlpha + ')';
        if (rarity === 'Rare') sc = `rgba(0,240,255,${lAlpha})`; 
        else if (rarity === 'Legendary') sc = `rgba(192,132,252,${lAlpha})`; 
        else if (rarity === 'Mythic') sc = `rgba(255,215,0,${lAlpha})`;
        
        bgCtx.strokeStyle = sc; 
        bgCtx.lineWidth = 0.5 + rz * 2.2; 
        bgCtx.stroke();
        bgCtx.restore();
    });

    wakes.forEach(w => {
        bgCtx.save(); 
        bgCtx.beginPath(); 
        bgCtx.moveTo(w.x, w.y); 
        bgCtx.lineTo(w.xL, w.y + (w.y - HORIZON_Y) * 0.2);
        bgCtx.moveTo(w.x, w.y); 
        bgCtx.lineTo(w.xR, w.y + (w.y - HORIZON_Y) * 0.2);
        bgCtx.strokeStyle = `rgba(255,255,255,${w.alpha * 0.8})`; 
        bgCtx.lineWidth = w.width * w.alpha; 
        bgCtx.lineCap = 'round'; 
        bgCtx.stroke(); 
        bgCtx.restore();
    });
}

// ===========================================================
//  ✨ 카툰 속도선 & 이펙트 파티클 렌더링 엔진
// ===========================================================
function drawFxCanvas() {
    fxCtx.clearRect(0,0,W,H);

    if (currentStatus==='FLYING' && !isDead) {
        const speed = stone.vy;
        if (speed > 3) {
            const lineCount = Math.min(72, Math.floor((speed - 3) * 3.5));
            const alpha = Math.max(0, Math.min(0.8, (speed - 3) / 20));
            fxCtx.save(); fxCtx.globalAlpha = alpha;
            for (let i=0; i<lineCount; i++) {
                const angle = (i/lineCount)*Math.PI*2 + (stone.y*0.05);
                const startR = W*0.42 + Math.random()*W*0.10; const endR = W*0.55 + Math.random()*W*0.25;
                const ex1 = CX + Math.cos(angle)*startR; const ey1 = HORIZON_Y + Math.sin(angle)*startR*0.45;
                const ex2 = CX + Math.cos(angle)*endR; const ey2 = HORIZON_Y + Math.sin(angle)*endR*0.45;

                const rarity = selectedStone?.rarity||'Ordinary'; let lc = 'rgba(255,255,255,0.8)';
                if (rarity==='Mythic') lc='rgba(255,215,0,0.9)'; else if (rarity==='Legendary') lc='rgba(192,132,252,0.85)'; else if (rarity==='Rare') lc='rgba(0,240,255,0.85)';

                fxCtx.beginPath(); fxCtx.moveTo(ex1,ey1); fxCtx.lineTo(ex2,ey2); fxCtx.strokeStyle=lc;
                fxCtx.lineWidth = (Math.random()*2+0.5) * Math.max(0.5, Math.min(3.0, (speed - 3) / 10));
                fxCtx.shadowBlur=3; fxCtx.shadowColor='#000'; fxCtx.stroke();
            }
            fxCtx.restore();
        }
    }

    for (let i=particles.length-1;i>=0;i--) { const p=particles[i]; p.update(); p.draw(fxCtx); if (p.alpha<=0) particles.splice(i,1); }

    if (currentStatus==='FLYING' && !isDead) {
        if (isWindowActive) {
            const X = STONE_FIXED_X;
            const stoneY = STONE_FIXED_Y - (isDead ? stone.z*2 : stone.z * 1.8);
            const Y = stoneY - 45; 

            const ratio = Math.max(0, Math.min(1.0, 1.0 - markerProgress));

            fxCtx.save();
            fxCtx.globalAlpha = 1.0;
            fxCtx.translate(X, Y);

            let scale = 1.0 + ratio * 0.3;
            if (markerProgress > 0.75) {
                if (Math.floor(Date.now() / 50) % 2 === 0) {
                    scale = 0; 
                }
            }
            fxCtx.scale(scale, scale);

            fxCtx.font = '900 22px "Impact", "Arial Black", sans-serif';
            fxCtx.textAlign = 'center';
            fxCtx.textBaseline = 'middle';

            fxCtx.strokeStyle = '#3b0712';
            fxCtx.lineWidth = 6;
            fxCtx.strokeText('TAP!', 0, 0);

            fxCtx.strokeStyle = '#f97316';
            fxCtx.lineWidth = 3;
            fxCtx.strokeText('TAP!', 0, 0);

            const grad = fxCtx.createLinearGradient(0, -10, 0, 10);
            grad.addColorStop(0, '#fde047');  
            grad.addColorStop(0.4, '#eab308'); 
            grad.addColorStop(1, '#dc2626');  
            fxCtx.fillStyle = grad;
            fxCtx.fillText('TAP!', 0, 0);
            fxCtx.restore();

            if (Math.random() < 0.4) {
                const sparkCount = Math.random() < 0.5 ? 1 : 2;
                for (let i = 0; i < sparkCount; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = Math.random() * 2 + 1;
                    const size = Math.random() * 3 + 2;
                    const colors = ['#fde047', '#eab308', '#f97316', '#dc2626'];
                    particles.push({
                        x: X + (Math.random() - 0.5) * 40,
                        y: Y + (Math.random() - 0.5) * 15,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed - 1,
                        size: size,
                        alpha: 1.0,
                        decay: Math.random() * 0.04 + 0.03,
                        color: colors[Math.floor(Math.random() * colors.length)],
                        update() {
                            this.x += this.vx;
                            this.y += this.vy;
                            this.alpha -= this.decay;
                        },
                        draw(ctx) {
                            ctx.save();
                            ctx.globalAlpha = Math.max(0, this.alpha);
                            ctx.fillStyle = this.color;
                            ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
                            ctx.restore();
                        }
                    });
                }
            }
        }
    }
}

// ===========================================================
//  ⚙️ 이펙트 서브 모듈 오브젝트 풀 인스턴스 클래스들
// ===========================================================
class WakeParticle {
    constructor(x,y,vx,vy) {
        this.x=x; this.y=y; this.vx=vx; this.vy=vy; this.r=Math.random()*2+1.5; this.alpha=0.75; this.decay=Math.random()*0.025+0.015;
    }
    update() {
        this.x+=this.vx; this.y+=this.vy; this.r+=0.4; this.alpha-=this.decay;
    }
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha=Math.max(0,this.alpha);
        ctx.beginPath();
        ctx.ellipse(this.x,this.y,this.r,this.r*0.4,0,0,Math.PI*2);
        const grad = ctx.createRadialGradient(this.x,this.y,0,this.x,this.y,this.r);
        grad.addColorStop(0,'rgba(255,255,255,0.8)');
        grad.addColorStop(0.35,'rgba(0,240,255,0.4)');
        grad.addColorStop(1,'rgba(0,240,255,0)');
        ctx.fillStyle=grad;
        ctx.shadowBlur=12;
        ctx.shadowColor='rgba(0,240,255,0.5)';
        ctx.fill();
        ctx.restore();
    }
}

class TrailParticle {
    constructor(x,y) {
        this.x=x+(Math.random()-0.5)*22; this.y=y+8; this.vx=(Math.random()-0.5)*2.2; this.vy=-Math.random()*2.8-1.8; this.r=Math.random()*4+3; this.alpha=0.82; this.decay=Math.random()*0.042+0.025;
        const rarity=selectedStone?.rarity||'Ordinary';
        if (rarity==='Mythic') this.color=Math.random()>0.4?'#ffd700':'#f97316';
        else if (rarity==='Legendary') this.color=Math.random()>0.5?'#c084fc':'#e9d5ff';
        else if (rarity==='Rare') this.color=Math.random()>0.5?'#00f0ff':'#ffffff';
        else this.color='rgba(255,255,255,0.42)';
        this.rarity=rarity;
    }
    update() { this.x+=this.vx; this.y+=this.vy; this.r=Math.max(0.2,this.r*0.93); this.alpha-=this.decay; this.x+=(CX-this.x)*0.018; }
    draw(ctx) {
        ctx.save(); ctx.globalAlpha=Math.max(0,this.alpha); ctx.beginPath(); ctx.arc(this.x,this.y,this.r,0,Math.PI*2); ctx.fillStyle=this.color;
        ctx.shadowBlur=this.rarity==='Mythic'?10:5; ctx.shadowColor=this.color; ctx.fill();
        if (this.r>1.5) { ctx.strokeStyle='rgba(0,0,0,0.6)'; ctx.lineWidth=1; ctx.stroke(); }
        ctx.restore();
    }
}

class ShockwaveRing {
    constructor(x,y,isPerfect) { this.x=x; this.y=y; this.radius=6; this.maxR=isPerfect?90:48; this.grow=isPerfect?5:2.8; this.alpha=1; this.decay=isPerfect?0.022:0.042; this.color=isPerfect?'rgba(217,255,0,0.9)':'rgba(255,255,255,0.7)'; }
    update() { this.radius+=this.grow; this.alpha-=this.decay; }
    draw(ctx) {
        ctx.save(); ctx.globalAlpha=Math.max(0,this.alpha); ctx.beginPath(); ctx.ellipse(this.x,this.y,this.radius,this.radius*0.44,0,0,Math.PI*2);
        ctx.strokeStyle=this.color; ctx.lineWidth=3.5; ctx.shadowBlur=14; ctx.shadowColor=this.color; ctx.stroke();
        ctx.strokeStyle='rgba(0,0,0,0.3)'; ctx.lineWidth=1.5; ctx.stroke(); ctx.restore();
    }
}

class SplashParticle {
    constructor(x,y,isPerfect,isSink) {
        this.x=x; this.y=y; const rarity=selectedStone?.rarity||'Ordinary'; let sm=1;
        if (rarity==='Mythic') sm=1.7; else if (rarity==='Legendary') sm=1.35; else if (rarity==='Rare') sm=1.15;
        const isLeft = Math.random() < 0.5;
        this.vx=(isLeft ? (-Math.random() * 5 - 3) : (Math.random() * 5 + 3)) * sm;
        this.vy=(Math.random() - 0.5) * 1.5 - (isSink ? 4.5 : 2.5);
        this.r=(Math.random()*(isPerfect?6:3)+2.2)*(rarity==='Mythic'?1.4:1); this.grav=rarity==='Mythic'?0.26:0.34; this.alpha=1; this.decay=(Math.random()*0.025+0.014)*(rarity==='Mythic'?0.72:1);
        if (rarity==='Mythic') { const rn=Math.random(); this.color=rn>0.65?'#ffd700':rn>0.4?'#d9ff00':rn>0.2?'#f97316':'#ffffff'; }
        else if (rarity==='Legendary') { this.color=Math.random()>0.5?'#c084fc':'#ffd700'; }
        else if (rarity==='Rare') { this.color=Math.random()>0.5?'#00f0ff':'#ffffff'; }
        else { this.color=isPerfect?(Math.random()>0.4?'#ffd700':'#d9ff00'):'#ffffff'; }
        this.rarity=rarity;
    }
    update() { this.x+=this.vx; this.y+=this.vy; this.vy+=this.grav; this.alpha-=this.decay; }
    draw(ctx) {
        ctx.save(); ctx.globalAlpha=Math.max(0,this.alpha); ctx.beginPath(); ctx.arc(this.x,this.y,this.r,0,Math.PI*2); ctx.fillStyle=this.color;
        ctx.shadowBlur=this.rarity==='Mythic'?14:7; ctx.shadowColor=this.color; ctx.fill(); ctx.strokeStyle='rgba(0,0,0,0.45)'; ctx.lineWidth=1; ctx.stroke();
        ctx.restore();
    }
}

class GodSplashParticle {
    constructor(x,y) {
        this.x=x; this.y=y; const angle=Math.random()*Math.PI*2; const spd=Math.random()*22+8;
        this.vx=Math.cos(angle)*spd; this.vy=Math.sin(angle)*spd-(Math.random()*12+6); this.r=Math.random()*9+4; this.alpha=1; this.decay=Math.random()*0.014+0.007; this.grav=0.22;
        const rn=Math.random(); this.color=rn>0.6?'#ffd700':rn>0.35?'#ff8c00':rn>0.15?'#d9ff00':'#ffffff';
    }
    update() { this.x+=this.vx; this.y+=this.vy; this.vy+=this.grav; this.vx*=0.98; this.alpha-=this.decay; }
    draw(ctx) {
        ctx.save(); ctx.globalAlpha=Math.max(0,this.alpha); ctx.beginPath(); ctx.arc(this.x,this.y,this.r,0,Math.PI*2); ctx.fillStyle=this.color;
        ctx.shadowBlur=20; ctx.shadowColor='#ffd700'; ctx.fill(); ctx.strokeStyle='rgba(0,0,0,0.5)'; ctx.lineWidth=1.5; ctx.stroke();
        ctx.restore();
    }
}

function spawnGodSplash(x,y) {
    const count = 22; for (let i=0;i<count;i++) {
        const p=new GodSplashParticle(x,y);
        const isLeft = Math.random() < 0.5;
        p.vx = isLeft ? (-Math.random() * 8 - 5) : (Math.random() * 8 + 5);
        p.vy = -Math.random() * 4 - 3;
        particles.push(p);
    }
    const flash=document.createElement('div'); flash.style.cssText='position:absolute;inset:0;background:rgba(255,215,0,0.35);z-index:250;pointer-events:none;animation:fade-flash 0.4s ease forwards;'; document.getElementById('game-container').appendChild(flash);
    const style=document.createElement('style'); style.textContent='@keyframes fade-flash{from{opacity:1}to{opacity:0}}'; document.head.appendChild(style);
    setTimeout(()=>{ flash.remove(); style.remove(); }, 420);
}

function createParticles(x,y,isPerfect,isSink,count,isBad=false) { if (!isSink && !isBad) particles.push(new ShockwaveRing(x,y,isPerfect)); const n=count>0?count:(isPerfect?38:(isSink?24:16)); for(let i=0;i<n;i++) particles.push(new SplashParticle(x,y,isPerfect,isSink,isBad)); }
function createTrailParticle(x,y) { const cnt = selectedStone?.rarity==='Mythic'?5:(stone.isCrit?3:1); for(let i=0;i<cnt;i++) particles.push(new TrailParticle(x,y)); }

// ===========================================================
//  🎯 DOM 애니메이션 오버레이 이펙트
// ===========================================================
function spawnRipple(x,y) { const r=document.createElement('div'); r.className='ripple'; r.style.left=`${x}px`; r.style.top=`${y}px`; document.getElementById('game-container').appendChild(r); setTimeout(()=>r.remove(),850); }
function spawnRatingText(x,y,rating) { const d=document.createElement('div'); d.className=`effect-text ${rating.toLowerCase()}`; d.style.left=`${x}px`; d.style.top=`${y-45}px`; const map={PERFECT:'PERFECT!',GOOD:'GOOD!',BAD:'BAD',MISS:'MISS'}; d.innerText=map[rating]||rating; document.getElementById('game-container').appendChild(d); setTimeout(()=>d.remove(),920); }
function spawnBounceMarker(x,y,count) {
    const d=document.createElement('div'); d.style.cssText=`position:absolute;left:${x}px;top:${y}px;transform:translate(-50%,-50%);background:rgba(0,0,0,0.75);color:#d9ff00;border:1.5px solid #d9ff00;border-radius:20px;padding:3px 10px;font-size:11px;font-weight:900;z-index:18;pointer-events:none;text-shadow:-1px -1px 0 #000;animation:point-fade 1.5s ease-out forwards;`; d.innerText=`${count}◆`; document.getElementById('game-container').appendChild(d);
    const s=document.createElement('style'); s.textContent='@keyframes point-fade{0%{opacity:1;transform:translate(-50%,-50%) scale(1)}80%{opacity:0.7}100%{opacity:0;transform:translate(-50%,-60%) scale(0.8)}}'; document.head.appendChild(s);
    setTimeout(()=>{ d.remove(); s.remove(); },1500);
}

// ===========================================================
//  🏁 채굴 결과 정산 및 게임 루프 종료
// ===========================================================
function endGame() {
    isPlaying = false;
    cancelAnimationFrame(animFrameId);
    
    fxCtx.clearRect(0, 0, W, H);
    particles = [];
    wakes = [];

    document.getElementById('game-container').removeEventListener('mousedown', registerBounceTap);
    document.getElementById('game-container').removeEventListener('touchstart', registerBounceTap);
    document.getElementById('ingame-stone').style.display = 'none';

    const earnedSP = Math.round(((bounceCount*100)+(perfectCount*150))*selectedStone.mult);
    document.getElementById('res-stone-name').innerText = t(selectedStone.nameKey); document.getElementById('res-stone-name').style.color = selectedStone.color;
    document.getElementById('res-bounce-count').innerText = `${bounceCount} ${t('bouncesUnit')}`; document.getElementById('res-perfect-count').innerText = `${perfectCount} ${t('bouncesUnit')}`;
    document.getElementById('res-earned-sp').innerText = `+${earnedSP.toLocaleString()} SP`;

    playerSP += earnedSP; saveData(); updateAssetUI(); haptic('success'); SoundManager.playFanfare();
    setAssetBarVisible(false); document.getElementById('result-modal').style.display='flex';
}

function closeResultModal() {
    document.querySelectorAll('.troll-box').forEach(el => el.remove());
    document.getElementById('result-modal').style.display='none'; 
    
    currentStatus='PRE_SPIN'; 
    
    const rs=document.getElementById('roulette-screen'); 
    if (rs) {
        rs.style.display='flex'; 
        rs.style.opacity='1';
    }
    
    const rt = document.getElementById('roulette-title');
    if (rt) rt.innerText=t('lobbyTitle'); 
    
    const wc = document.getElementById('wheel-cap-text');
    if (wc) {
        wc.innerText=t('wheelTouch'); 
        wc.style.color='#fff';
    }
    
    const sd = document.getElementById('stone-desc-text');
    if (sd) sd.innerText='';

    const mb = document.getElementById('main-btn');
    if (mb) {
        mb.innerText = t('spinBtn'); 
        mb.style.background = 'linear-gradient(135deg, var(--neon-lime) 0%, #a8ff00 100%)'; 
        mb.style.color = 'var(--ink)';
    }
    
    setAssetBarVisible(true); 
    gaugeSpeedMult = 2.0;
    updateAssetUI(); 
    changeRandomBg(); 
    drawStaticBackground();
}

// ===========================================================
//  📺 유튜브 보상형 에너지 완충 엔진
// ===========================================================
function openYoutubeCharge() {
    document.getElementById('youtube-modal').style.display='flex'; let sec=5; document.getElementById('video-timer').innerText=sec;
    const iv=setInterval(()=>{
        sec--; document.getElementById('video-timer').innerText=sec;
        if (sec<=0) { clearInterval(iv); playerHearts=5; document.getElementById('youtube-modal').style.display='none'; currentStatus='PRE_SPIN'; updateAssetUI(); haptic('success'); }
    },1000);
}

// ===========================================================
//  🛒 돌 스펙 강화 상점 코어 비즈니스 로직
// ===========================================================
function getUpgradeCost(t) { return Math.floor(UPGRADE_BASE_COST*Math.pow(1.65,upgrades[t])); }
function openShop() { if (isSpinning||currentStatus!=='PRE_SPIN') return; SoundManager.resume(); setAssetBarVisible(false); document.getElementById('shop-modal').style.display='flex'; updateShopUI(); haptic('light'); }
function closeShop() { SoundManager.resume(); document.getElementById('shop-modal').style.display='none'; setAssetBarVisible(true); haptic('light'); }

function updateShopUI() {
    document.getElementById('shop-sp-count').innerText=playerSP.toLocaleString();
    ['weight','elasticity','spin'].forEach(type=>{
        const lv=upgrades[type]; const btn=document.getElementById(`btn-${type}`); document.getElementById(`lv-${type}`).innerText=lv;
        if (lv>=MAX_LV) { document.getElementById(`next-lv-${type}`).innerText='Max'; document.getElementById(`cost-${type}`).innerText='MAX'; btn.disabled=true; } 
        else { document.getElementById(`next-lv-${type}`).innerText=lv+1; const cost=getUpgradeCost(type); document.getElementById(`cost-${type}`).innerText=cost.toLocaleString(); btn.disabled=playerSP<cost; }
        
        if (type==='weight') document.getElementById('val-weight').innerText=(lv*0.08).toFixed(1);
        else if (type==='elasticity') document.getElementById('val-elasticity').innerText=Math.round((Math.pow(1.08,lv)-1)*100);
        else if (type==='spin') document.getElementById('val-spin').innerText=Math.round(lv*12.8);
    });
}

function buyUpgrade(type) {
    if (upgrades[type]>=MAX_LV) return; const cost=getUpgradeCost(type); if (playerSP<cost) return;
    playerSP-=cost; upgrades[type]++; saveData(); updateAssetUI(); updateShopUI(); haptic('success'); SoundManager.playUpgrade();
    document.getElementById('message').innerText=`${t('upgradeSuccess')} (Lv.${upgrades[type]})`;
}

// ===========================================================
//  🚪 인트로 및 디버그 매개변수 초기화 진입점
// ===========================================================
function openInfoModal(e) { e?.preventDefault(); SoundManager.resume(); haptic('light'); document.getElementById('intro-info-modal').style.display='flex'; }
function closeInfoModal(e) { e?.preventDefault(); haptic('light'); document.getElementById('intro-info-modal').style.display='none'; }
function closeIntroScreen(e) { e?.preventDefault(); SoundManager.resume(); haptic('success'); const el=document.getElementById('intro-screen'); el.style.opacity='0'; setTimeout(()=>{ el.style.display='none'; setAssetBarVisible(true); },500); }

function initDebugParams() { try { const p=new URLSearchParams(window.location.search); window.debug=p.get('debug')==='true'; window.forceCrit=p.get('forceCrit')==='true'; window.forceLotto=p.get('forceLotto')==='true'; } catch(e){} }

initDebugParams(); initTMA(); initTonConnect(); initLang(); loadData(); applyI18n(); changeRandomBg(); drawStaticBackground();

document.addEventListener('visibilitychange', () => {
    if (document.hidden) SoundManager.pauseAll(); else SoundManager.resumeAll();
});

// ====== Telegram Invitation System Logic ======

// 1. Generate unique referral link with the exact Bot Username
function getReferralLink() {
    const botUsername = "XNOT_Stone_Skipper"; 
    // Retrieve actual Telegram User ID or fallback to localStorage / generated timestamp-based ID
    let userId = '';
    try {
        userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    } catch(e) {}
    
    if (!userId) {
        userId = localStorage.getItem('xnot_user_id') || 'user_' + Date.now();
    }
    
    if (!localStorage.getItem('xnot_user_id')) {
        localStorage.setItem('xnot_user_id', userId);
    }
    
    // Format required for Telegram Mini App deep linking
    return `https://t.me/${botUsername}?startapp=ref_${userId}`;
}

// 2. Initialize Invite Button Listeners
function initInviteSystem() {
    const tgInviteBtn = document.getElementById('btn-tg-invite');
    const copyLinkBtn = document.getElementById('btn-copy-link');
    
    if (!tgInviteBtn || !copyLinkBtn) return;

    // Telegram Native Share Link Trigger
    tgInviteBtn.addEventListener('click', () => {
        const refLink = getReferralLink();
        const shareText = encodeURIComponent("🪨 [XNOT 물수제비 채굴] 나랑 같이 돌 튕기고 코인 채굴하자! 지금 들어오면 한정판 조약돌 지급! 🚀");
        
        // Telegram official share URL schema
        const tgShareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${shareText}`;
        
        // Open Telegram share window
        window.open(tgShareUrl, '_blank');
    });

    // Fallback Clipboard Copy Link
    copyLinkBtn.addEventListener('click', () => {
        const refLink = getReferralLink();
        
        navigator.clipboard.writeText(refLink).then(() => {
            alert("초대 링크가 클립보드에 복사되었습니다! 친구에게 공유해보세요.");
        }).catch(err => {
            console.error('클립보드 복사 실패:', err);
            // Fallback for older webviews/browsers
            const textArea = document.createElement("textarea");
            textArea.value = refLink;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert("초대 링크가 복사되었습니다!");
        });
    });
}

// Call init when document is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInviteSystem);
} else {
    initInviteSystem();
}