// ※ 이미지 에셋인 milky_way02.png는 픽셀 오류 방지를 위해 알파 채널이 포함된 투명 PNG-24 포맷으로 저장해 주세요.
// ===========================================================
//  🔊 Web Audio API 오디오 시스템 (텔레그램 인앱 안전 가드 적용)
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
                this.bgm.play().catch(e => { });
            }

            this.updateMuteUI();
        } catch (e) { }
    },
    resume() {
        this.init();
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
        if (this.bgm && !this.isMuted && this.bgm.paused) {
            this.bgm.play().catch(e => { });
        }
    },
    setMute(v) {
        this.isMuted = v;
        localStorage.setItem('xnot_mute', v);
        if (this.masterGain && this.ctx) this.masterGain.gain.setValueAtTime(v ? 0 : 0.6, this.ctx.currentTime);
        if (this.bgm) {
            if (v) {
                this.bgm.pause();
            } else {
                this.bgm.play().catch(e => { });
            }
        }
        this.updateMuteUI();
    },
    updateMuteUI() { const b = document.getElementById('mute-btn'); if (b) b.innerText = this.isMuted ? '🔇' : '🔊'; },
    _play(freq, type, dur, vol = 0.3, freqEnd = null) {
        if (this.isMuted || !this.ctx) return;
        try {
            if (this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => {});
                return;
            }

            const currTime = this.ctx.currentTime;
            if (typeof currTime !== 'number' || isNaN(currTime)) return;

            const o = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            o.connect(g); 
            g.connect(this.masterGain);
            o.type = type;
            
            const safeFreq = Math.max(20, Math.min(20000, freq || 440));
            o.frequency.setValueAtTime(safeFreq, currTime);

            if (freqEnd && freqEnd > 0) {
                const safeEnd = Math.max(20, Math.min(20000, freqEnd));
                o.frequency.exponentialRampToValueAtTime(safeEnd, currTime + dur);
            }

            g.gain.setValueAtTime(vol, currTime);
            g.gain.exponentialRampToValueAtTime(0.001, currTime + dur);
            o.start(currTime); 
            o.stop(currTime + dur + 0.02);
        } catch (e) { }
    },
    playTick() { this.resume(); this._play(800, 'triangle', 0.04, 0.18, 100); },
    playLaunch(s) { this.resume(); this._play(240 + s * 10, 'triangle', 0.28, 0.4, 55); },
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
                [880, 1320, 1760].forEach((f, i) => this._play(f, 'sine', 0.5, 0.2 / (i + 1)));
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
                this._play(f, 'sine', p ? 0.5 : 0.3, (0.2 / (i + 1)) * volMult);
            });
        }
    },
    playSink() { this.resume(); for (let i = 0; i < 3; i++) { const d = i * 0.08; setTimeout(() => this._play(180 - i * 35, 'sine', 0.14, 0.25, 40), d * 1000); } },
    playWoodCrash() {
        this.resume();
        // 둔탁하고 거친 2연타 에러 비프음 (180Hz -> 90Hz)
        this._play(180, 'sawtooth', 0.18, 0.5, 90);
        setTimeout(() => {
            this._play(140, 'sawtooth', 0.25, 0.6, 60);
        }, 120);
    },
    playStrikeWarning() {
        this.resume();
        this._play(220, 'sawtooth', 0.1, 0.35, 140);
    },
    playUpgrade() { this.resume(); this._play(523, 'sine', 0.12, 0.15); setTimeout(() => this._play(659, 'sine', 0.18, 0.15), 100); },
    playFanfare() {
        this.resume();
        const notes = [261, 329, 392, 523, 659, 784];
        notes.forEach((f, i) => setTimeout(() => this._play(f, 'triangle', 0.4, 0.12), i * 70));
    },
    pauseAll() {
        if (this.bgm) this.bgm.pause();
        if (this.ctx && this.ctx.state !== 'suspended') this.ctx.suspend();
    },
    resumeAll() {
        if (this.isMuted === true) return;
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
        if (this.bgm && this.bgm.paused) this.bgm.play().catch(e => { });
    }
};

function toggleMute(e) { e?.preventDefault(); SoundManager.resume(); SoundManager.setMute(!SoundManager.isMuted); haptic('light'); }

// ===========================================================
//  🌐 글로벌 6개 국어 지원 사전 (i18n Localization)
//  지원: 한국어(ko), 영어(en), 러시아어(ru), 인도네시아어(id), 베트남어(vi), 스페인어(es)
// ===========================================================
const i18n = {
    ko: {
        introTitle: 'XNOT 물수제비 채굴', introDesc: 'XNOT 물수제비 채굴은 강물 위 물수제비의 탄성을 이용해 XNOT 코인을 채굴하는 하이퍼 캐주얼 게임입니다. 돌을 튕겨 최적의 탄성을 얻고 SP를 채굴하세요!',
        introStartBtn: '게임 시작 ⛏️', introInfoBtn: '게임 소개 ℹ️', introInfoTitle: '게임 소개',
        lobbyTitle: '룰렛을 터치하여 돌을 뽑으세요', spinBtn: '룰렛 돌리기', spinningBtn: '돌 추첨 중... 🎰', shopBtn: '⚙️ 돌 능력 강화 상점',
        stoneReady: '돌 준비 완료!', launchBtn: '돌 던지기 (하트 1 소모)', wheelTouch: '돌 뽑기 터치!',
        stone0: '납작한 슬레이트', stone0Desc: '안정적인 각도, 평균 튕김 수 최고 (대박: 0.1%)',
        stone1: '거친 강가 조약돌', stone1Desc: '표준 성능의 무난한 기본 조약돌 (대박: 2%)',
        stone2: '고밀도 현무암', stone2Desc: '평균적으론 무겁지만 2.5% 확률로 관성 폭발 대박',
        stone3: 'XNOT 황금 운석', stone3Desc: '50% 확률로 타 특성 복제, 1/200만 확률로 은하 활공',
        ready: 'READY', prepareMsg: '돌을 잡고 위로 빠르게 던지세요!', swipeGuide: '▲ 위로 빠르게 쓸어올리세요! ▲',
        heartsLack: '하트 부족! 에너지를 충전하세요.', watchAd: '❤️ 유튜브 시청하고 하트 완충',
        adTitle: '유튜브 광고 시청 중...', adDesc: '하트를 충전하기 위해 채널 영상을 시청하고 있습니다.', adComplete: '시청 완료 시 하트 5개가 완충됩니다.',
        perfectTiming: '완벽한 타이밍과 각도!', goodTiming: '좋은 타이밍!', badTiming: '조금 어긋난 타이밍...',
        missMsg: '타이밍을 놓쳐 돌이 수면에 가라앉았습니다.', sinkMsg: '동력을 잃어 가라앉았습니다.',
        resTitle: '물수제비 결과', resStone: '🪨 선택한 돌', resBounces: '🎯 튕김 횟수', resPerfects: '⭐ Perfect 횟수', resEarned: '💎 획득 SP', resConfirm: '확인',
        perfect: 'PERFECT', bouncesUnit: '회',
        lightningLaunch: '초광속 발사!', fastLaunch: '쾌속 발사!', normalLaunch: '일반 발사', speedText: '속도', upgradeSuccess: '속성 강화 성공!',
        shopPerfectZone: '🎯 퍼펙트 존 확장', currentVal: '현재', levelText: 'Lv.',
        greenLaunch: '👍 안정적인 그린 발사', missLaunch: '❌ MISS! 투척 실패', hyperLaunch: '⚡ 하이퍼 드라이브 발사! ⚡',
        woodSafe: '🪵 통나무 회피 SAFE!', woodCrashTitle: '🪵 통나무 충돌!', woodCrashAlert: '🪵 콰앙!<br>통나무 충돌 침수!',
        strikeWarn: '⚠️ 헛손질! STRIKE ({count}/3)', strikeWarnAlert: '⚠️ STRIKE {count}!<br><span style="font-size:16px;color:#ffaaaa;">(3회 누적 시 아웃)</span>',
        strikeOutAlert: '❌ 3 STRIKE OUT!<br><span style="font-size:20px;color:#fff;">침수됩니다!</span>',
        bounceMarkerUnit: '+{count} 튀김!', inviteBtnText: '✉️ 친구 초대', inviteModalTitle: '✉️ 친구 초대하고 보너스 받기',
        inviteModalDesc: '친구를 초대하면 XNOT 채굴 동력 버프를 실시간으로 획득합니다!', inviteTgBtn: '텔레그램 초대', inviteCopyBtn: '링크 복사',
        inviteCopied: '초대 링크 복사 완료!', inviteShareText: '🪨 [XNOT 물수제비] 나랑 같이 돌 튕기고 코인 채굴하자! 🚀',
        roast1: '🦭<br>물수제비가 아니라<br>그냥 돌덩이 투척인 줄!', roast2: '🐟<br>축하합니다!<br>물고기 밥 주기 성공!', roast3: '🥱<br>혹시 졸면서 던지셨나요?<br>(퐁당)'
    },
    en: {
        introTitle: 'XNOT Stone Skipper', introDesc: 'XNOT Stone Skipper is a hyper-casual mining game where you mine XNOT Coin using skipping stone elasticity. Bounce stones to mine SP!',
        introStartBtn: 'Start Game ⛏️', introInfoBtn: 'Game Info ℹ️', introInfoTitle: 'Game Info',
        lobbyTitle: 'Touch the wheel to pick a stone', spinBtn: 'SPIN WHEEL', spinningBtn: 'SPINNING... 🎰', shopBtn: '⚙️ Upgrade Properties',
        stoneReady: 'STONE READY!', launchBtn: 'LAUNCH STONE (Cost 1 ❤️)', wheelTouch: 'Touch to Spin!',
        stone0: 'Flat Slate', stone0Desc: 'Highly stable angle, best average skips (Jackpot: 0.1%)',
        stone1: 'Rough Pebble', stone1Desc: 'Standard performance starter stone (Jackpot: 2%)',
        stone2: 'Dense Basalt', stone2Desc: 'Heavy avg, 2.5% chance of inertia explosion jackpot',
        stone3: 'XNOT Gold Meteor', stone3Desc: '50% mimic chance, 1/2M galaxy glide lottery',
        ready: 'READY', prepareMsg: 'Grab the stone and swipe up fast!', swipeGuide: '▲ SWIPE UP FAST! ▲',
        heartsLack: 'No hearts! Recharge energy.', watchAd: '❤️ Watch YouTube to Refill',
        adTitle: 'Watching Ad...', adDesc: 'Watching the channel video to recharge hearts.', adComplete: '5 hearts will be refilled.',
        perfectTiming: 'Perfect timing and angle!', goodTiming: 'Good timing!', badTiming: 'Slightly off timing...',
        missMsg: 'Missed timing, the stone sank.', sinkMsg: 'Inertia lost, stone sank.',
        resTitle: 'Skip Results', resStone: '🪨 Selected Stone', resBounces: '🎯 Bounces', resPerfects: '⭐ Perfects', resEarned: '💎 Earned SP', resConfirm: 'Confirm',
        perfect: 'PERFECT', bouncesUnit: 'times',
        lightningLaunch: 'Lightning Launch!', fastLaunch: 'Fast Launch!', normalLaunch: 'Normal Launch', speedText: 'Speed', upgradeSuccess: 'Upgrade Success!',
        shopPerfectZone: '🎯 Perfect Zone Exp.', currentVal: 'Current', levelText: 'Lv.',
        greenLaunch: '👍 Stable Green Launch', missLaunch: '❌ MISS! Launch Failed', hyperLaunch: '⚡ HYPER DRIVE LAUNCH! ⚡',
        woodSafe: '🪵 Log Evaded SAFE!', woodCrashTitle: '🪵 Log Collision!', woodCrashAlert: '🪵 CRASH!<br>Sank by Log!',
        strikeWarn: '⚠️ Missed! STRIKE ({count}/3)', strikeWarnAlert: '⚠️ STRIKE {count}!<br><span style="font-size:16px;color:#ffaaaa;">(3 Strikes = OUT)</span>',
        strikeOutAlert: '❌ 3 STRIKE OUT!<br><span style="font-size:20px;color:#fff;">Sinking!</span>',
        bounceMarkerUnit: '+{count} Skips!', inviteBtnText: '✉️ Invite Friends', inviteModalTitle: '✉️ Invite & Get Boost',
        inviteModalDesc: 'Invite friends to gain instant XNOT mining power buffs!', inviteTgBtn: 'Invite on TG', inviteCopyBtn: 'Copy Link',
        inviteCopied: 'Invite link copied!', inviteShareText: '🪨 [XNOT Stone Skipper] Join me to skip stones and mine coins! 🚀',
        roast1: '🦭<br>Are you skipping stones<br>or just dropping rocks?', roast2: '🐟<br>Congrats!<br>Successfully fed the fish!', roast3: '🥱<br>Did you throw it while sleeping?<br>(Splash)'
    },
    ru: {
        introTitle: 'XNOT Блинчики на воде', introDesc: 'XNOT Stone Skipper — гиперказуальная игра, где вы добываете монеты XNOT, пуская блинчики по воде. Запускайте камни и добывайте SP!',
        introStartBtn: 'Играть ⛏️', introInfoBtn: 'Об игре ℹ️', introInfoTitle: 'Об игре',
        lobbyTitle: 'Коснитесь рулетки для выбора камня', spinBtn: 'КРУТИТЬ РУЛЕТКУ', spinningBtn: 'ВЫБОР КАМНЯ... 🎰', shopBtn: '⚙️ Улучшение камней',
        stoneReady: 'КАМЕНЬ ГОТОВ!', launchBtn: 'ЗАПУСТИТЬ КАМЕНЬ (1 ❤️)', wheelTouch: 'Коснитесь рулетки!',
        stone0: 'Плоский сланец', stone0Desc: 'Стабильный угол, рекордное число отскоков (Джекпот: 0.1%)',
        stone1: 'Речная галька', stone1Desc: 'Сбалансированный базовый камень (Джекпот: 2%)',
        stone2: 'Тяжелый базальт', stone2Desc: 'Тяжелый, но 2.5% шанс на взрывную инерцию',
        stone3: 'Золотой метеорит', stone3Desc: '50% копирует чужие свойства, 1 к 2 млн — полет в космос',
        ready: 'ГОТОВ', prepareMsg: 'Зажмите камень и смахните вверх!', swipeGuide: '▲ СМАХНИТЕ БЫСТРО ВВЕРХ! ▲',
        heartsLack: 'Нет жизней! Пополните энергию.', watchAd: '❤️ Смотреть YouTube (+5 ❤️)',
        adTitle: 'Просмотр видео...', adDesc: 'Просмотр видео для пополнения энергии.', adComplete: 'Будет начислено 5 сердец.',
        perfectTiming: 'Идеальный тайминг и угол!', goodTiming: 'Отличный тайминг!', badTiming: 'Немного мимо...',
        missMsg: 'Камень потерял равновесие и утонул.', sinkMsg: 'Инерция иссякла, камень утонул.',
        resTitle: 'Результаты броска', resStone: '🪨 Выбранный камень', resBounces: '🎯 Отскоки', resPerfects: '⭐ Идеально', resEarned: '💎 Получено SP', resConfirm: 'Отлично',
        perfect: 'ИДЕАЛЬНО', bouncesUnit: 'раз',
        lightningLaunch: 'Молниеносный бросок!', fastLaunch: 'Быстрый бросок!', normalLaunch: 'Обычный бросок', speedText: 'Скорость', upgradeSuccess: 'Улучшено!',
        shopPerfectZone: '🎯 Зона Perfect', currentVal: 'Текущий', levelText: 'Ур.',
        greenLaunch: '👍 Стабильный бросок', missLaunch: '❌ МИМО! Ошибка броска', hyperLaunch: '⚡ ГИПЕРДРАЙВ ЗАПУСК! ⚡',
        woodSafe: '🪵 Бревно обойдено: SAFE!', woodCrashTitle: '🪵 Удар о бревно!', woodCrashAlert: '🪵 БУМ!<br>Камень утонул!',
        strikeWarn: '⚠️ Промах! СТРАЙК ({count}/3)', strikeWarnAlert: '⚠️ СТРАЙК {count}!<br><span style="font-size:16px;color:#ffaaaa;">(3 страйка = АУТ)</span>',
        strikeOutAlert: '❌ 3 СТРАЙКА! АУТ!<br><span style="font-size:20px;color:#fff;">Камень тонет!</span>',
        bounceMarkerUnit: '+{count} прыжков!', inviteBtnText: '✉️ Пригласить', inviteModalTitle: '✉️ Зови друзей и получай бафф',
        inviteModalDesc: 'Приглашайте друзей и получайте бонус к добыче XNOT!', inviteTgBtn: 'Позвать в TG', inviteCopyBtn: 'Скопировать ссылку',
        inviteCopied: 'Ссылка скопирована!', inviteShareText: '🪨 [XNOT Stone Skipper] Запускай камни по воде и майни крипту вместе со мной! 🚀',
        roast1: '🦭<br>Ты блинчики пускаешь<br>или просто камни топишь?', roast2: '🐟<br>Поздравляем!<br>Рыбки сыты!', roast3: '🥱<br>Ты бросал с закрытыми глазами?<br>(Бульк)'
    },
    id: {
        introTitle: 'XNOT Lempar Batu', introDesc: 'XNOT Stone Skipper adalah game santai menambang koin XNOT dengan pantulan batu di sungai. Pantulkan batu dan tambang SP!',
        introStartBtn: 'Mulai Game ⛏️', introInfoBtn: 'Info Game ℹ️', introInfoTitle: 'Info Game',
        lobbyTitle: 'Sentuh roda untuk memilih batu', spinBtn: 'PUTAR RODA', spinningBtn: 'MEMILIH... 🎰', shopBtn: '⚙️ Toko Upgrade',
        stoneReady: 'BATU SIAP!', launchBtn: 'LEMPAR BATU (Biaya 1 ❤️)', wheelTouch: 'Sentuh untuk Putar!',
        stone0: 'Batu Pipih', stone0Desc: 'Sudut stabil, rata-rata pantulan tertinggi (Jackpot: 0.1%)',
        stone1: 'Kerikil Sungai', stone1Desc: 'Batu standar seimbang untuk pemula (Jackpot: 2%)',
        stone2: 'Batu Basalt', stone2Desc: 'Berat, tetapi ada peluang 2.5% inersia meledak',
        stone3: 'Meteor Emas', stone3Desc: '50% tiru skill lain, 1/2jt peluang terbang galaksi',
        ready: 'SIAP', prepareMsg: 'Pegang batu lalu geser ke atas cepat!', swipeGuide: '▲ GESER KE ATAS CEPAT! ▲',
        heartsLack: 'Energi habis! Isi ulang sekarang.', watchAd: '❤️ Nonton YouTube (Isi Penuh)',
        adTitle: 'Menonton Video...', adDesc: 'Menonton video untuk mengisi energi hati.', adComplete: '5 hati akan diisi penuh.',
        perfectTiming: 'Sudut dan waktu sempurna!', goodTiming: 'Waktu yang bagus!', badTiming: 'Kurang pas...',
        missMsg: 'Salah waktu, batu tenggelam.', sinkMsg: 'Kehabisan daya, batu tenggelam.',
        resTitle: 'Hasil Lemparan', resStone: '🪨 Batu Pilihan', resBounces: '🎯 Pantulan', resPerfects: '⭐ Perfect', resEarned: '💎 SP Diperoleh', resConfirm: 'OK',
        perfect: 'PERFECT', bouncesUnit: 'kali',
        lightningLaunch: 'Lemparan Kilat!', fastLaunch: 'Lemparan Cepat!', normalLaunch: 'Lemparan Biasa', speedText: 'Kecepatan', upgradeSuccess: 'Upgrade Berhasil!',
        shopPerfectZone: '🎯 Zona Perfect', currentVal: 'Saat Ini', levelText: 'Lv.',
        greenLaunch: '👍 Lemparan Hijau Stabil', missLaunch: '❌ MELESET! Gagal Lempar', hyperLaunch: '⚡ HYPER DRIVE LAUNCH! ⚡',
        woodSafe: '🪵 Lolos dari Kayu: SAFE!', woodCrashTitle: '🪵 Tabrakan Kayu!', woodCrashAlert: '🪵 BRUK!<br>Tenggelam Menabrak Kayu!',
        strikeWarn: '⚠️ Meleset! STRIKE ({count}/3)', strikeWarnAlert: '⚠️ STRIKE {count}!<br><span style="font-size:16px;color:#ffaaaa;">(3 Strike = KELUAR)</span>',
        strikeOutAlert: '❌ 3 STRIKE OUT!<br><span style="font-size:20px;color:#fff;">Tenggelam!</span>',
        bounceMarkerUnit: '+{count} Pantulan!', inviteBtnText: '✉️ Undang Teman', inviteModalTitle: '✉️ Undang Teman & Dapatkan Bonus',
        inviteModalDesc: 'Undang teman untuk meningkatkan daya tambang XNOT!', inviteTgBtn: 'Undang di TG', inviteCopyBtn: 'Salin Tautan',
        inviteCopied: 'Tautan berhasil disalin!', inviteShareText: '🪨 [XNOT Stone Skipper] Ayo lempar batu di sungai dan tambang koin bersama! 🚀',
        roast1: '🦭<br>Ini lempar batu pantul<br>atau cuma buang batu?', roast2: '🐟<br>Selamat!<br>Sukses kasih makan ikan!', roast3: '🥱<br>Lempar sambil tidur ya?<br>(Cebur)'
    },
    vi: {
        introTitle: 'XNOT Lướt Đá Trên Nước', introDesc: 'XNOT Stone Skipper là game đào coin XNOT bằng cách ném đá lướt trên mặt nước. Ném đá đạt độ nảy tốt nhất để đào SP!',
        introStartBtn: 'Bắt đầu ⛏️', introInfoBtn: 'Thông tin ℹ️', introInfoTitle: 'Giới thiệu',
        lobbyTitle: 'Chạm vòng quay để chọn đá', spinBtn: 'QUAY VÒNG', spinningBtn: 'ĐANG CHỌN... 🎰', shopBtn: '⚙️ Nâng cấp đá',
        stoneReady: 'ĐÁ ĐÃ SẴN SÀNG!', launchBtn: 'NÉM ĐÁ (Tốn 1 ❤️)', wheelTouch: 'Chạm để quay!',
        stone0: 'Đá Phiến Dẹt', stone0Desc: 'Góc ném ổn định, số lần nảy cao nhất (Nổ hũ: 0.1%)',
        stone1: 'Sỏi Bờ Suối', stone1Desc: 'Đá cơ bản cân bằng cho người mới (Nổ hũ: 2%)',
        stone2: 'Đá Basalt Nặng', stone2Desc: 'Nặng nhưng có 2.5% kích hoạt quán tính cực đại',
        stone3: 'Thiên Thạch Vàng', stone3Desc: '50% sao chép thuộc tính, 1/2tr bay vào vũ trụ',
        ready: 'SẴN SÀNG', prepareMsg: 'Giữ đá và vuốt thẳng lên thật nhanh!', swipeGuide: '▲ VUỐT LÊN THẬT NHANH! ▲',
        heartsLack: 'Hết tim! Nạp thêm năng lượng.', watchAd: '❤️ Xem YouTube để nạp đầy tim',
        adTitle: 'Đang xem video...', adDesc: 'Xem video để hồi phục năng lượng.', adComplete: 'Hồi phục 5 tim sau khi xem xong.',
        perfectTiming: 'Góc và thời điểm hoàn hảo!', goodTiming: 'Thời điểm rất tốt!', badTiming: 'Hơi lệch một chút...',
        missMsg: 'Lệch nhịp, đá đã chìm nghỉm.', sinkMsg: 'Mất đà, đá đã chìm xuống nước.',
        resTitle: 'Kết Quả Lướt Đá', resStone: '🪨 Đá Đã Chọn', resBounces: '🎯 Số lần nảy', resPerfects: '⭐ Lần Perfect', resEarned: '💎 SP Nhận Được', resConfirm: 'Xác Nhận',
        perfect: 'XUẤT SẮC', bouncesUnit: 'lần',
        lightningLaunch: 'Ném Tia Chớp!', fastLaunch: 'Ném Cực Nhanh!', normalLaunch: 'Ném Bình Thường', speedText: 'Tốc độ', upgradeSuccess: 'Nâng Cấp Thành Công!',
        shopPerfectZone: '🎯 Mở rộng Perfect', currentVal: 'Hiện tại', levelText: 'Cấp',
        greenLaunch: '👍 Ném Xanh Ổn Định', missLaunch: '❌ TRƯỢT! Ném Thất Bại', hyperLaunch: '⚡ PHÓNG SIÊU TỐC! ⚡',
        woodSafe: '🪵 Tránh Khúc Gỗ: SAFE!', woodCrashTitle: '🪵 Đâm Khúc Gỗ!', woodCrashAlert: '🪵 RẦM!<br>Đâm Vào Gỗ Chìm Nghỉm!',
        strikeWarn: '⚠️ Trượt! STRIKE ({count}/3)', strikeWarnAlert: '⚠️ STRIKE {count}!<br><span style="font-size:16px;color:#ffaaaa;">(3 Strike = THUA)</span>',
        strikeOutAlert: '❌ 3 STRIKE OUT!<br><span style="font-size:20px;color:#fff;">Đá đang chìm!</span>',
        bounceMarkerUnit: '+{count} Lần Nảy!', inviteBtnText: '✉️ Mời Bạn Bè', inviteModalTitle: '✉️ Mời Bạn Nhận Thưởng',
        inviteModalDesc: 'Mời bạn bè để nhận buff tốc độ đào XNOT tức thì!', inviteTgBtn: 'Mời qua TG', inviteCopyBtn: 'Sao Chép Link',
        inviteCopied: 'Đã sao chép link mời!', inviteShareText: '🪨 [XNOT Stone Skipper] Cùng lướt đá trên nước và đào coin với tôi nào! 🚀',
        roast1: '🦭<br>Bạn đang lướt đá<br>hay đang ném đá dằn biển vậy?', roast2: '🐟<br>Chúc mừng!<br>Cho cá ăn thành công!', roast3: '🥱<br>Bạn vừa ngủ gật vừa ném à?<br>(Tõm)'
    },
    es: {
        introTitle: 'XNOT Salto de Piedras', introDesc: 'XNOT Stone Skipper es un juego casual donde minas monedas XNOT rebotando piedras sobre el río. ¡Haz rebotar la piedra y gana SP!',
        introStartBtn: 'Jugar ⛏️', introInfoBtn: 'Información ℹ️', introInfoTitle: 'Información',
        lobbyTitle: 'Toca la ruleta para elegir una piedra', spinBtn: 'GIRAR RULETA', spinningBtn: 'ELIGIENDO... 🎰', shopBtn: '⚙️ Mejorar Piedras',
        stoneReady: '¡PIEDRA LISTA!', launchBtn: 'LANZAR PIEDRA (Cuesta 1 ❤️)', wheelTouch: '¡Toca para girar!',
        stone0: 'Pizarra Plana', stone0Desc: 'Ángulo estable, mayor promedio de rebotes (Bote: 0.1%)',
        stone1: 'Guijarro de Río', stone1Desc: 'Rendimiento estándar y equilibrado (Bote: 2%)',
        stone2: 'Basalto Denso', stone2Desc: 'Pesado, pero con 2.5% de probabilidad de explosión',
        stone3: 'Meteorito Dorado', stone3Desc: '50% copia atributos, 1 en 2M vuelo intergaláctico',
        ready: 'LISTO', prepareMsg: '¡Sujeta la piedra y desliza rápido hacia arriba!', swipeGuide: '▲ ¡DESLIZA RÁPIDO HACIA ARRIBA! ▲',
        heartsLack: '¡Sin energía! Recarga corazones.', watchAd: '❤️ Ver YouTube para Recargar',
        adTitle: 'Viendo video...', adDesc: 'Viendo video para recargar energía.', adComplete: 'Se recargarán 5 corazones al finalizar.',
        perfectTiming: '¡Ángulo y sincronización perfectos!', goodTiming: '¡Buen tiro!', badTiming: 'Un poco desviado...',
        missMsg: 'A destiempo, la piedra se hundió.', sinkMsg: 'Sin inercia, la piedra se hundió.',
        resTitle: 'Resultados del Tiro', resStone: '🪨 Piedra Elegida', resBounces: '🎯 Rebotes', resPerfects: '⭐ Perfectos', resEarned: '💎 SP Ganado', resConfirm: 'Aceptar',
        perfect: 'PERFECTO', bouncesUnit: 'veces',
        lightningLaunch: '¡Tiro Relámpago!', fastLaunch: '¡Tiro Rápido!', normalLaunch: 'Tiro Normal', speedText: 'Velocidad', upgradeSuccess: '¡Mejora Exitosa!',
        shopPerfectZone: '🎯 Zona Perfect', currentVal: 'Actual', levelText: 'Nv.',
        greenLaunch: '👍 Lanzamiento Verde Estable', missLaunch: '❌ ¡FALLO! Tiro Erróneo', hyperLaunch: '⚡ ¡LANZAMIENTO HIPERESPACIAL! ⚡',
        woodSafe: '🪵 Tronco Esquivado: ¡SAFE!', woodCrashTitle: '🪵 ¡Choque con Tronco!', woodCrashAlert: '🪵 ¡CRASH!<br>¡Hundido por Tronco!',
        strikeWarn: '⚠️ ¡Fallaste! STRIKE ({count}/3)', strikeWarnAlert: '⚠️ ¡STRIKE {count}!<br><span style="font-size:16px;color:#ffaaaa;">(3 Strikes = FUERA)</span>',
        strikeOutAlert: '❌ ¡3 STRIKES! ¡OUT!<br><span style="font-size:20px;color:#fff;">¡Hundiéndose!</span>',
        bounceMarkerUnit: '+{count} Rebotes!', inviteBtnText: '✉️ Invitar Amigos', inviteModalTitle: '✉️ Invita y Gana Bonos',
        inviteModalDesc: '¡Invita amigos para ganar potenciadores de minería XNOT!', inviteTgBtn: 'Invitar en TG', inviteCopyBtn: 'Copiar Enlace',
        inviteCopied: '¡Enlace copiado!', inviteShareText: '🪨 [XNOT Stone Skipper] ¡Salta piedras sobre el agua y mina cripto conmigo! 🚀',
        roast1: '🦭<br>¿Estás haciendo saltar piedras<br>o solo tirando escombros?', roast2: '🐟<br>¡Felicidades!<br>¡Alimentaste a los peces!', roast3: '🥱<br>¿Tiraste dormido?<br>(Chof)'
    }
};

// 🌟 유저 텔레그램 언어 자동 감지 및 6개 국어 매핑
let currentLang = 'en';
function initLang() {
    let lang = 'en';
    try {
        const tgLang = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code;
        const navLang = navigator.language || navigator.userLanguage || 'en';
        lang = (tgLang || navLang).toLowerCase().split('-')[0];
    } catch (e) { }

    const supported = ['ko', 'en', 'ru', 'id', 'vi', 'es'];
    currentLang = supported.includes(lang) ? lang : 'en';
}
function t(k) { return (i18n[currentLang]?.[k]) || (i18n['en']?.[k]) || k; }
function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const k = el.getAttribute('data-i18n');
        if (t(k) !== k) el.innerText = t(k);
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
        if (['light', 'medium', 'heavy'].includes(type)) h.impactOccurred(type);
        else if (['error', 'success'].includes(type)) h.notificationOccurred(type);
    } catch (e) { }
}

// ===========================================================
//  🪨 돌 고유 데이터 구조 명세
// ===========================================================
const STONES = [
    {
        id: 0, nameKey: 'stone0', name: '납작한 슬레이트', rarity: 'Ordinary', color: '#94a3b8',
        img: 'images/stone_slate.png', w: 150, h: 69, mult: 1.5,
        budgetRange: [10, 13],
        physics: { 
            vzDecay: 0.87, vyDecay: 0.965, baseVz: 1.0, friction: 0.988, critChance: 0.001, critMult: 1.1,
            bounceHeightBase: 1.8 
        }
    },
    {
        id: 1, nameKey: 'stone1', name: '거친 강가 조약돌', rarity: 'Rare', color: '#38bdf8',
        img: 'images/stone_pebble.png', w: 85, h: 85, mult: 1.0,
        budgetRange: [8, 11],
        physics: { 
            vzDecay: 0.82, vyDecay: 0.94, baseVz: 1.5, friction: 0.986, critChance: 0.02, critMult: 1.25,
            bounceHeightBase: 2.3 
        }
    },
    {
        id: 2, nameKey: 'stone2', name: '고밀도 현무암', rarity: 'Legendary', color: '#c084fc',
        img: 'images/stone_basalt.png', w: 95, h: 95, mult: 0.6,
        budgetRange: [5, 7],
        critBudgetRange: [20, 25],
        physics: {
            vzDecay: 0.70, vyDecay: 0.90, baseVz: 0.8, friction: 0.970, critChance: 0.025,
            bounceHeightBase: 1.5, 
            critPhysics: { vzDecay: 0.90, vyDecay: 0.98, baseVz: 1.6, friction: 0.998, bounceHeightBase: 2.6 }
        }
    },
    {
        id: 3, nameKey: 'stone3', name: 'XNOT 황금 운석', rarity: 'Mythic', color: '#ffd700',
        img: 'images/stone_gold.png', w: 90, h: 85, mult: 2.5,
        budgetRange: [10, 14],
        lottoBudgetRange: [40, 50],
        physics: {
            lottoChance: 1 / 2036265,
            bounceHeightBase: 2.5, 
            lottoPhysics: { vzDecay: 0.99, vyDecay: 0.999, baseVz: 2.5, friction: 0.9999, bounceHeightBase: 2.8 }
        }
    }
];

// ===========================================================
//  📊 게임 구동 전역 상태 변수
// ===========================================================
let playerHearts = 5;
let playerSP = 0;
let highScore = 0;
let upgrades = { weight: 0, elasticity: 0, spin: 0, perfectZone: 0 };
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
let stone = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, activePhys: null, isCrit: false, isLotto: false };
const GRAVITY = 0.16;
let swipeSpeed = 0;
let markerProgress = 0;
let tapWindowStart = 0;
let isWindowActive = false;

// 화면 포지션 기준점
let W = window.innerWidth, H = window.innerHeight;
let CX = W / 2, HORIZON_Y = H * 0.42;
let STONE_FIXED_X = CX;
let STONE_FIXED_Y = H * 0.68;

// 입력 제어 변수
let isDragging = false, dragTouchId = null;
let startX = 0, startY = 0, startTime = 0;

// 백그라운드 이미지
const BG_FILES = [
    'images/foreground.png', 'images/midground.png', 'images/background.png',
    'images/foreground_lake.webp', 'images/midground_lake.webp', 'images/background_lake.webp',
    'images/foreground_river.png', 'images/midground_river.png', 'images/background_river.png',
    'images/foreground_moon.webp', 'images/midground_moon.webp', 'images/background_moon.webp'
];
const bgImgCache = {};
BG_FILES.forEach(p => {
    const i = new Image();
    i.src = p;
    bgImgCache[p] = i;
});
let currentBgPath = BG_FILES[0];
let currentTheme = 'lake';

function changeRandomBg() {
    const themes = ['lake', 'river', 'moon'];
    currentTheme = themes[Math.floor(Math.random() * themes.length)];

    // 🌟 lake와 moon은 신규 투명 webp 에셋 사용
    const ext = (currentTheme === 'moon' || currentTheme === 'lake') ? 'webp' : 'png';
    currentBgPath = `images/foreground_${currentTheme}.${ext}`;

    const container = document.getElementById('game-container');
    if (container) container.style.background = `url('${currentBgPath}') no-repeat center/cover`;
}

const RARITY_BG = { Ordinary: new Image(), Rare: new Image(), Legendary: new Image(), Mythic: new Image() };
RARITY_BG.Ordinary.src = 'images/background_ordinary.png';
RARITY_BG.Rare.src = 'images/background_rare.png';
RARITY_BG.Legendary.src = 'images/background_legendary.png';
RARITY_BG.Mythic.src = 'images/background_mythic.png';

let particles = [];
let wakes = [];
let rippleLayers = [];
for (let i = 0; i < 14; i++) rippleLayers.push({ z: i / 14 });

const LAYERS = [
    { id: 'sky', parallax: 0.0 }, { id: 'far-isle', parallax: 0.04 },
    { id: 'horizon', parallax: 0.10 }, { id: 'water-far', parallax: 0.20 },
    { id: 'water-mid', parallax: 0.42 }, { id: 'water-near', parallax: 0.78 },
    { id: 'shore', parallax: 1.4 }
];
let layerProgress = 0;

// ===========================================================
//  🦆🐸🪵 리듬 오브젝트 필수 WebP 에셋 풀
// ===========================================================
const ASSET_VER = Date.now();

const ASSETS_STREAM = {
    DUCK_L: new Image(),
    DUCK_R: new Image(),
    WOOD: new Image(),
    FROG_L: [new Image(), new Image(), new Image()],
    FROG_R: [new Image(), new Image(), new Image()]
};

ASSETS_STREAM.DUCK_L.src = `images/lloverduck.webp?v=${ASSET_VER}`;
ASSETS_STREAM.DUCK_R.src = `images/rloverduck.webp?v=${ASSET_VER}`;
ASSETS_STREAM.WOOD.src   = `images/wood.webp?v=${ASSET_VER}`;

ASSETS_STREAM.FROG_L[0].src = `images/lfrog_01.webp?v=${ASSET_VER}`;
ASSETS_STREAM.FROG_L[1].src = `images/lfrog_02.webp?v=${ASSET_VER}`;
ASSETS_STREAM.FROG_L[2].src = `images/lfrog_03.webp?v=${ASSET_VER}`;

ASSETS_STREAM.FROG_R[0].src = `images/rfrog_01.webp?v=${ASSET_VER}`;
ASSETS_STREAM.FROG_R[1].src = `images/rfrog_02.webp?v=${ASSET_VER}`;
ASSETS_STREAM.FROG_R[2].src = `images/rfrog_03.webp?v=${ASSET_VER}`;

let rhythmTargets = [];
let nextSpawnTime = 0;
let comboCount = 0;
let maxCombo = 0;
let launchCoolDownUntil = 0; // 고스트 클릭 방어용 타임스탬프

// ===========================================================
//  🖼️ 캔버스 렌더러 초기화
// ===========================================================
const bgCanvas = document.getElementById('bg-canvas');
const bgCtx = bgCanvas.getContext('2d');
const fxCanvas = document.getElementById('fx-canvas');
const fxCtx = fxCanvas.getContext('2d');

function resizeCanvases() {
    W = window.innerWidth; H = window.innerHeight;
    bgCanvas.width = fxCanvas.width = W;
    bgCanvas.height = fxCanvas.height = H;
    CX = W / 2; HORIZON_Y = H * 0.42;
    STONE_FIXED_X = CX; STONE_FIXED_Y = H * 0.68;
}
window.addEventListener('resize', resizeCanvases);
if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.onEvent('viewportChanged', () => {
        resizeCanvases();
        if (typeof drawStaticBackground === 'function') drawStaticBackground();
    });
}
resizeCanvases();

// ===========================================================
//  ☁️ Supabase 연동 파이프라인
// ===========================================================
const SUPABASE_URL = "https://tdzheutebifrknrbnysj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_tPmSK_w6sPZKr64YObj38A_RYbLOZ4q";
let supabaseClient = null;

if (typeof supabase === 'undefined') {
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    script.async = false;
    script.onload = () => { if (typeof initSupabase === 'function') initSupabase(); };
    document.head.appendChild(script);
}

function initSupabase() {
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
}
initSupabase();

async function checkAndRegisterReferral(currentUserId) {
    if (!supabaseClient || !currentUserId) return;
    if (localStorage.getItem('xnot_ref_registered')) return;

    let referrerId = null;
    try {
        const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
        if (startParam && startParam.startsWith('ref_')) referrerId = startParam.replace('ref_', '');
    } catch (e) { }

    if (!referrerId) {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const tgStart = urlParams.get('tgWebAppStartParam') || urlParams.get('startapp');
            if (tgStart && tgStart.startsWith('ref_')) referrerId = tgStart.replace('ref_', '');
        } catch (e) { }
    }

    if (!referrerId || referrerId === currentUserId) return;

    try {
        const { error } = await supabaseClient
            .from('xnot_referrals')
            .upsert([{
                new_user_id: String(currentUserId),
                referrer_id: String(referrerId),
                created_at: new Date().toISOString()
            }], { onConflict: 'new_user_id', ignoreDuplicates: true });

        if (!error) localStorage.setItem('xnot_ref_registered', 'true');
    } catch (err) { }
}

let isInitialDataLoaded = false;
async function loadData() {
    if (isInitialDataLoaded) return;
    isInitialDataLoaded = true;

    const savedData = localStorage.getItem('xnot_v4_save');
    let userId = localStorage.getItem('xnot_user_id');

    if (!userId) {
        try { userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id ? `tg_${window.Telegram.WebApp.initDataUnsafe.user.id}` : null; } catch(e) { }
        if (!userId) userId = 'user_' + Math.random().toString(36).substring(2, 9);
        localStorage.setItem('xnot_user_id', userId);
    }

    checkAndRegisterReferral(userId);

    if (savedData) {
        try {
            const parsed = JSON.parse(savedData);
            if (typeof parsed.sp === 'number' && !isNaN(parsed.sp)) playerSP = parsed.sp;
            else if (typeof parsed.sp === 'string') playerSP = parseInt(parsed.sp) || 0;
            if (isNaN(playerSP)) playerSP = 0;

            if (parsed.upgrades !== undefined) upgrades = Object.assign({ weight: 0, elasticity: 0, spin: 0, perfectZone: 0 }, parsed.upgrades); 
            if (parsed.walletAddress !== undefined) userWalletAddress = parsed.walletAddress;
            
            // 🌟 [수정] 0인 경우에도 5로 초기화하지 않고 실제 저장된 0을 온전히 인정!
            if (typeof parsed.hearts === 'number' && !isNaN(parsed.hearts)) {
                playerHearts = Math.max(0, parsed.hearts);
            } else {
                playerHearts = 5; // 데이터가 아예 없는 신규 유저만 5개 지급
            }
        } catch (e) { }
    }

    if (typeof updateAssetUI === 'function') updateAssetUI();

    if (supabaseClient !== null) {
        try {
            let { data: cloudUser, error } = await supabaseClient
                .from('xnot_users')
                .select('*')
                .eq('user_id', userId)
                .single();

            const currentHearts = typeof playerHearts !== 'undefined' ? playerHearts : 5;
            let tgUsername = 'Guest';
            try {
                const u = window.Telegram?.WebApp?.initDataUnsafe?.user;
                if (u) tgUsername = u.username || u.first_name || 'Guest';
            } catch (e) { }

            if (error && error.code === 'PGRST116') {
                await supabaseClient.from('xnot_users').insert([{
                    user_id: String(userId), username: String(tgUsername),
                    high_score: parseInt(playerSP) || 0, hearts: parseInt(currentHearts),
                    last_saved_time: Date.now()
                }]);
            } else if (cloudUser) {
                const cloudScore = parseInt(cloudUser.high_score);
                if (!isNaN(cloudScore) && cloudScore > playerSP) playerSP = cloudScore;
                
                // 🌟 [수정] 클라우드에 저장된 하트가 0개여도 0개 그대로 동기화
                if (typeof cloudUser.hearts === 'number' && currentStatus === 'PRE_SPIN') {
                    playerHearts = Math.max(0, cloudUser.hearts);
                }
                if (currentStatus === 'PRE_SPIN' && typeof updateAssetUI === 'function') updateAssetUI();
            }
        } catch (err) { }
    }
}

async function saveData() {
    const userId = localStorage.getItem('xnot_user_id') || 'user_' + Date.now();
    const currentHearts = typeof playerHearts !== 'undefined' ? playerHearts : 5;
    const rightNow = Date.now();

    const localSavePayload = { sp: playerSP, upgrades: upgrades, hearts: currentHearts, walletAddress: userWalletAddress, lastSavedTime: rightNow };
    localStorage.setItem('xnot_v4_save', JSON.stringify(localSavePayload));
    try { window.Telegram?.WebApp?.CloudStorage?.setItem('stone_v4', JSON.stringify(localSavePayload)); } catch (e) { }

    if (!supabaseClient) return false;

    let tgUsername = 'Guest';
    try {
        const u = window.Telegram?.WebApp?.initDataUnsafe?.user;
        if (u) tgUsername = u.username || u.first_name || 'Guest';
    } catch (e) { }

    try {
        const { error } = await supabaseClient
            .from('xnot_users')
            .upsert({
                user_id: String(userId), username: String(tgUsername),
                high_score: parseInt(playerSP || 0), hearts: parseInt(currentHearts),
                last_saved_time: parseInt(rightNow), updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
        return !error;
    } catch (e) { return false; }
}

// ===========================================================
//  📱 텔레그램 SDK 초기화
// ===========================================================
function initTMA() {
    if (!window.Telegram?.WebApp) return;
    const tg = window.Telegram.WebApp;
    tg.ready(); 
    tg.expand();
    
    try {
        tg.disableVerticalSwipes && tg.disableVerticalSwipes();
        tg.isClosingConfirmationEnabled = false;
        tg.setHeaderColor('#050510'); tg.setBackgroundColor('#050510');
    } catch(e) { }

    const u = tg.initDataUnsafe?.user;
    if (u) {
        document.getElementById('user-name').innerText = u.first_name || u.username || 'Guest';
        document.getElementById('user-card').style.display = 'flex';
    }
}

let tonConnectUI = null;
let userWalletAddress = null;
function initTonConnect() {
    try {
        const TCUI = window.TONConnectUI;
        if (TCUI) {
            const manifestUrl = new URL('tonconnect-manifest.json', window.location.href).href;
            tonConnectUI = new TCUI.TonConnectUI({ manifestUrl, buttonRootId: 'ton-connect-button' });
            tonConnectUI.onStatusChange(wallet => {
                const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
                const baseName = tgUser ? (tgUser.first_name || tgUser.username) : 'Guest';
                if (wallet) {
                    userWalletAddress = wallet.account.address;
                    const uName = document.getElementById('user-name');
                    if (uName) uName.innerText = `${baseName} (${shortenAddress(userWalletAddress)})`;
                    saveData();
                } else {
                    userWalletAddress = null;
                    const uName = document.getElementById('user-name');
                    if (uName) uName.innerText = baseName;
                    saveData();
                }
            });
        }
    } catch (e) { }
}

function shortenAddress(addr) { return addr ? addr.slice(0, 4) + '...' + addr.slice(-4) : ''; }

function setAssetBarVisible(v) {
    const ab = document.getElementById('asset-bar');
    const uc = document.getElementById('user-card');
    if (ab) ab.style.display = v ? 'flex' : 'none';
    if (uc) uc.style.display = v ? 'flex' : 'none';
}

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

function triggerShake(strength = 'medium') {
    const el = document.getElementById('game-container');
    el.classList.remove('shaking');
    void el.offsetWidth;
    el.classList.add('shaking');
    haptic(strength === 'heavy' ? 'heavy' : 'medium');
    setTimeout(() => el.classList.remove('shaking'), 480);
}

function spawnDramaticText(text, cls = 'neon-lime') {
    const d = document.createElement('div');
    d.className = `dramatic-text ${cls}`;
    d.innerText = text;
    document.getElementById('game-container').appendChild(d);
    setTimeout(() => d.remove(), 1900);
}

// ===========================================================
//  🎰 룰렛 물리 정지 가챠 머신 로직
// ===========================================================
function getCurrentRotation(el) {
    const tr = window.getComputedStyle(el).transform;
    if (tr === 'none') return 0;
    const v = tr.split('(')[1].split(')')[0].split(',');
    let a = Math.round(Math.atan2(parseFloat(v[1]), parseFloat(v[0])) * (180 / Math.PI));
    return a < 0 ? a + 360 : a;
}

function triggerWheel(e) {
    SoundManager.resume();
    if (playerHearts <= 0) { openYoutubeCharge(); return; }
    if (isSpinning || currentStatus !== 'PRE_SPIN') return;
    isSpinning = true;

    const mb = document.getElementById('main-btn');
    if (mb) {
        mb.innerText = t('spinningBtn');
        mb.disabled = true;
        mb.classList.remove('pulse');
        mb.style.background = 'linear-gradient(135deg, #64748b, #475569)';
        mb.style.color = '#fff';
    }

    const idx = Math.floor(Math.random() * STONES.length);
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
        const cur = Math.floor(getCurrentRotation(wEl) / 45);
        if (cur !== lastSector) { haptic('light'); SoundManager.playTick(); lastSector = cur; }
        requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    let isTransitionFinished = false;
    const onSpinEnd = () => {
        if (isTransitionFinished) return;
        isTransitionFinished = true;

        wEl.style.transition = 'none';
        wEl.style.transform = `rotate(${offset}deg)`;

        selectedStone = stone_def;
        const descEl = document.getElementById('stone-desc-text');
        if (descEl) descEl.innerText = t(selectedStone.nameKey + 'Desc');

        const rt = document.getElementById('roulette-title');
        if (rt) rt.innerText = t('stoneReady');

        const sectors = wEl.querySelectorAll('.wheel-sector');
        sectors.forEach((sec, sIdx) => {
            if (sIdx === idx) sec.classList.add('highlight');
            else sec.classList.remove('highlight');
        });

        const mb = document.getElementById('main-btn');
        if (mb) {
            mb.disabled = false;
            mb.innerText = t('launchBtn');
            mb.style.background = 'linear-gradient(135deg,var(--neon-lime),#a8ff00)';
            mb.style.color = 'var(--ink)';
            mb.classList.add('pulse');
        }

        currentStatus = 'SPIN_DONE';
        isSpinning = false;
        haptic('success');
    };

    wEl.addEventListener('transitionend', onSpinEnd, { once: true });
    setTimeout(onSpinEnd, 4000);
}

function handleMainBtn(e) {
    if (e) { e.preventDefault && e.preventDefault(); e.stopPropagation && e.stopPropagation(); }
    SoundManager.resume();

    if (playerHearts <= 0) { openYoutubeCharge(); return; }
    if (currentStatus === 'PRE_SPIN') { triggerWheel(); return; }

    if (currentStatus === 'SPIN_DONE' || (selectedStone && !isSpinning)) {
        currentStatus = 'TRANSITIONING';
        const mb = document.getElementById('main-btn');
        if (mb) { mb.classList.remove('pulse'); mb.disabled = true; }
        playerHearts = Math.max(0, playerHearts - 1);
        updateAssetUI();
        saveData();
        playSeamlessTransition();
    }
}

function playSeamlessTransition() {
    if (!selectedStone) selectedStone = STONES[0];
    const roulette = document.getElementById('roulette-screen');
    const overlay = document.getElementById('transition-overlay');
    if (overlay) overlay.style.display = 'none';
    if (roulette) roulette.style.display = 'none';
    resizeCanvases();
    startGameplay();
}

function setStoneStyle() {
    const el = document.getElementById('ingame-stone');
    if (!el) return;
    if (!selectedStone) selectedStone = STONES[0];
    const s = selectedStone;
    if (s.w) el.style.width = `${s.w}px`; 
    if (s.h) el.style.height = `${s.h}px`;
    if (s.img) el.style.backgroundImage = `url('${s.img}')`;
    el.style.backgroundSize = 'contain'; 
    el.style.backgroundRepeat = 'no-repeat'; 
    el.style.backgroundPosition = 'center';
    el.style.backgroundColor = 'transparent'; 
    el.style.border = 'none'; 
    el.style.boxShadow = 'none';

    el.style.filter = s.rarity === 'Mythic'
        ? 'drop-shadow(0 0 22px rgba(255,215,0,0.85)) drop-shadow(0 8px 14px rgba(0,0,0,0.5))'
        : 'drop-shadow(0 6px 12px rgba(0,0,0,0.55))';
}

function getAngleZone(angleVal) {
    if (angleVal >= 0.495 && angleVal <= 0.505) return 'SUPER';
    const perfSize = 0.08;
    const pMin = 0.5 - (perfSize / 2);
    const pMax = 0.5 + (perfSize / 2);

    if ((angleVal >= 0.00 && angleVal <= 0.01) || (angleVal >= 0.99 && angleVal <= 1.00)) return 'EASTEREG';
    if ((angleVal > 0.01 && angleVal <= 0.06) || (angleVal >= 0.94 && angleVal < 0.99)) return 'RED';
    if (angleVal >= pMin && angleVal <= pMax) return 'PERFECT';
    if ((angleVal >= pMin - 0.15 && angleVal < pMin) || (angleVal > pMax && angleVal <= pMax + 0.15)) return 'GREEN';
    return 'YELLOW';
}

function updateGaugePerfectZone() {
    const set = (id, bot, h) => {
        const el = document.getElementById(id);
        if (el) { el.style.bottom = bot + '%'; el.style.height = h + '%'; }
    };
    set('gz-red-bot', 1, 5);
    set('gz-safe-bot', 31, 15);
    set('gz-perfect', 46, 8);
    set('gz-safe-top', 54, 15);
    set('gz-red-top', 94, 5);

    let superEl = document.getElementById('gz-super-zone');
    if (!superEl) {
        const pZone = document.getElementById('angle-gauge-bg') || document.getElementById('angle-gauge-bar') || document.getElementById('angle-gauge-wrap');
        if (pZone) {
            superEl = document.createElement('div');
            superEl.id = 'gz-super-zone';
            superEl.style.cssText = `position:absolute;left:0;width:100%;height:1.2%;bottom:49.4%;background:#ffffff;box-shadow:0 0 6px #ffd700,0 0 10px #ffffff;z-index:4;pointer-events:none;`;
            pZone.appendChild(superEl);
        }
    }
}

function startGameplay() {
    gaugeSpeedMult = 2.0;
    resizeCanvases();
    setAssetBarVisible(false);
    setStoneStyle();

    // 🌟 화면 중앙으로 뜨지 않도록 bottom: 75px로 하단 고정
    const stoneEl = document.getElementById('ingame-stone');
    if (stoneEl) {
        stoneEl.style.display = 'block';
        stoneEl.style.left = `${CX}px`;
        stoneEl.style.bottom = '75px';
        stoneEl.style.top = 'auto';
        stoneEl.style.transform = 'translateX(-50%) scale(1)';
        stoneEl.style.opacity = '1';
        stoneEl.style.zIndex = '35';
    }

    const scoreDisp = document.getElementById('score-display');
    if (scoreDisp) scoreDisp.innerText = t('ready');
    const msg = document.getElementById('message');
    if (msg) {
        msg.innerText = t('prepareMsg');
        msg.style.color = '';
    }

    const guide = document.getElementById('swipe-guide');
    if (guide) guide.style.display = 'block';

    const gaugeWrap = document.getElementById('angle-gauge-wrap');
    if (gaugeWrap) gaugeWrap.style.display = 'block';

    currentStatus = 'READY_TO_LAUNCH';
    bindLaunchEvents();
    changeRandomBg();
    drawStaticBackground();

    updateGaugePerfectZone();
    startAngleGauge();
}

function startAngleGauge() {
    angleVal = 0.5; angleDir = 1;
    const tick = () => {
        if (currentStatus !== 'READY_TO_LAUNCH') return;
        angleVal += angleDir * 0.007 * gaugeSpeedMult;
        if (angleVal >= 1) { angleVal = 1; angleDir = -1; }
        else if (angleVal <= 0) {
            angleVal = 0; angleDir = 1;
            gaugeSpeedMult = Math.min(3.0, parseFloat((gaugeSpeedMult + 0.2).toFixed(1)));
        }
        document.getElementById('gauge-bar').style.height = `${angleVal * 100}%`;
        document.getElementById('gauge-marker').style.bottom = `${angleVal * 100}%`;
        launchAngle = 5 + angleVal * 30;
        angleTimerId = requestAnimationFrame(tick);
    };
    angleTimerId = requestAnimationFrame(tick);
}

// ===========================================================
//  🤚 고속 스와이프 투척 메커니즘 (touchcancel 방어 적용)
// ===========================================================
function bindLaunchEvents() {
    const el = document.getElementById('ingame-stone');
    el.addEventListener('mousedown', dragStart);
    el.addEventListener('touchstart', dragStart, { passive: false });
    window.addEventListener('mousemove', dragMove);
    window.addEventListener('touchmove', dragMove, { passive: false });
    window.addEventListener('mouseup', dragEnd);
    window.addEventListener('touchend', dragEnd);
    window.addEventListener('touchcancel', dragEnd);
}

function unbindLaunchEvents() {
    const el = document.getElementById('ingame-stone');
    el.removeEventListener('mousedown', dragStart); el.removeEventListener('touchstart', dragStart);
    window.removeEventListener('mousemove', dragMove); window.removeEventListener('touchmove', dragMove);
    window.removeEventListener('mouseup', dragEnd); window.removeEventListener('touchend', dragEnd);
    window.removeEventListener('touchcancel', dragEnd);
}

function dragStart(e) {
    if (currentStatus !== 'READY_TO_LAUNCH') return;
    SoundManager.resume(); isDragging = true;
    if (e.touches?.length > 0) { dragTouchId = e.touches[0].identifier; startX = e.touches[0].clientX; startY = e.touches[0].clientY; }
    else { dragTouchId = null; startX = e.clientX; startY = e.clientY; }
    startTime = Date.now();
    e.cancelable && e.preventDefault();
}

function dragMove(e) {
    if (!isDragging || currentStatus !== 'READY_TO_LAUNCH') return;
    let cx, cy;
    if (e.touches) {
        let t = null; for (let i = 0; i < e.touches.length; i++) { if (e.touches[i].identifier === dragTouchId) { t = e.touches[i]; break; } }
        if (!t) return; cx = t.clientX; cy = t.clientY;
    } else { cx = e.clientX; cy = e.clientY; }
    const dy = startY - cy, dx = cx - startX;
    const el = document.getElementById('ingame-stone');
    el.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% - ${Math.max(0, dy)}px)) scale(${dy > 0 ? 1.05 : 1})`;
    if (dy >= 150) triggerLaunch(150, dx);
    e.cancelable && e.preventDefault();
}

function dragEnd(e) {
    if (!isDragging) return;
    if (e.changedTouches) {
        let ok = false; for (let i = 0; i < e.changedTouches.length; i++) { if (e.changedTouches[i].identifier === dragTouchId) { ok = true; break; } } if (!ok) return;
    }
    isDragging = false;
    let cx, cy; if (e.changedTouches) { cx = e.changedTouches[0].clientX; cy = e.changedTouches[0].clientY; } else { cx = e.clientX; cy = e.clientY; }
    const dy = startY - cy, dx = cx - startX;
    if (dy > 15) triggerLaunch(dy, dx);
    else { const el = document.getElementById('ingame-stone'); el.style.transition = 'transform 0.3s'; el.style.transform = 'translate(-50%, -50%) scale(1)'; setTimeout(() => el.style.transition = '', 350); }
}

// ===================================================================
//  🌊 리듬 물수제비 통합 물리 발사 엔진
// ===================================================================
let lastRippleTime = 0;
let currentRippleDuration = 480;
let currentGravity = 0.17;
let currentPeakZ = 10.0;

function triggerLaunch(dy, dx) {
    isDragging = false; 
    unbindLaunchEvents(); 
    cancelAnimationFrame(angleTimerId);
    document.getElementById('swipe-guide').style.display = 'none';
    document.getElementById('angle-gauge-wrap').style.display = 'none';

    const dur = Math.max(1, Date.now() - startTime); 
    const effDy = Math.min(dy, 150);
    
    // 모바일 짧은 플릭에서도 속도 보장 (최소 22, distFact 중복 제거)
    const calculatedSpeed = (effDy / dur) * 15;
    swipeSpeed = Math.max(22, Math.min(calculatedSpeed, 40)); 

    stone.x = 0; stone.y = 0; stone.z = 15;
    const rad = launchAngle * Math.PI / 180;
    stone.vy = swipeSpeed * Math.cos(rad);
    stone.vz = Math.max(2.5, swipeSpeed * Math.sin(rad) * 0.75);
    stone.vx = Math.min(3.0, Math.max(-3.0, (dx / dur) * 1.5));

    let zone = getAngleZone(angleVal);
    if (gaugeSpeedMult >= 3.0 && zone === 'PERFECT') zone = 'EASTEREG';

    let ap = null, isCrit = false, isLotto = false; 
    const ss = selectedStone;
    let bRange = ss.budgetRange;

    if (ss.rarity === 'Mythic') {
        if (window.forceLotto || Math.random() < ss.physics.lottoChance) { 
            ap = JSON.parse(JSON.stringify(ss.physics.lottoPhysics)); isLotto = true; bRange = ss.lottoBudgetRange; 
        } else {
            const ref = Math.random() < 0.5 ? STONES[0] : STONES[2];
            if (ref === STONES[2]) {
                if (window.forceCrit || Math.random() < ref.physics.critChance) {
                    ap = JSON.parse(JSON.stringify(ref.physics.critPhysics)); isCrit = true; bRange = STONES[2].critBudgetRange; 
                } else {
                    ap = JSON.parse(JSON.stringify(ref.physics)); bRange = STONES[2].budgetRange;     
                }
            } else {
                ap = JSON.parse(JSON.stringify(ref.physics)); 
                if (window.forceCrit || Math.random() < (ap.critChance || 0)) isCrit = true; 
                bRange = STONES[0].budgetRange;         
            }
        }
    } else if (ss.rarity === 'Legendary') {
        if (window.forceCrit || Math.random() < ss.physics.critChance) { 
            ap = JSON.parse(JSON.stringify(ss.physics.critPhysics)); isCrit = true; bRange = ss.critBudgetRange;
        } else { ap = JSON.parse(JSON.stringify(ss.physics)); }
    } else {
        ap = JSON.parse(JSON.stringify(ss.physics)); 
        if (window.forceCrit || Math.random() < (ap.critChance || 0)) isCrit = true; 
    }

    const sf = swipeSpeed / 20; 
    if (ap) ap.friction = Math.min(0.9994, (ap.friction || 0.978) + sf * 0.0006);

    stone.activePhys = ap; stone.isCrit = isCrit; stone.isLotto = isLotto;
    bounceCount = 0; perfectCount = 0; isDead = false; hasTappedBounce = false; tapsInCurrentCycle = 0;
    comboCount = 0;
    rhythmTargets = [];

    // 🌟 첫 타겟도 실제 수평선(depth = 0.0)에서 작게 태어나 다가오도록 수정
    const firstDuck = new RhythmTarget('DUCK');
    firstDuck.depth = 0.0;
    rhythmTargets.push(firstDuck);
    nextSpawnTime = Date.now() + 650;

    currentGravity = 0.17;
    currentPeakZ = Math.max(10.0, stone.z);
    isWindowActive = false;

    for (let i = 0; i < 14; i++) rippleLayers[i].z = i / 14; 
    layerProgress = 0;

    let launchPercent = 1.0;
    let isSuperLaunch = false;

    if (zone === 'SUPER') {
        launchPercent = 4.8; isSuperLaunch = true;
        document.getElementById('message').innerText = "⚡ SUPER SKIPPER! ⚡";
        spawnDramaticText("SUPER SKIPPER!", 'neon-gold');
        triggerShake('heavy'); haptic('heavy');
    } else if (zone === 'EASTEREG') {
        launchPercent = 2.2;
        document.getElementById('message').innerText = gaugeSpeedMult >= 3.0 ? "⚡ MAX SPEED HYPER DRIVE! ⚡" : "⚡ 하이퍼 드라이브 발사! ⚡";
        spawnDramaticText("HYPER DRIVE!", 'neon-gold');
        triggerShake('heavy');
    } else if (zone === 'PERFECT') {
        launchPercent = 1.6;
        document.getElementById('message').innerText = "✨ PERFECT LAUNCH! ✨";
        spawnDramaticText("PERFECT LAUNCH!", 'neon-lime');
        triggerShake('medium');
    } else if (zone === 'GREEN') {
        launchPercent = 1.25;
        document.getElementById('message').innerText = "👍 안정적인 그린 발사";
        haptic('medium');
    } else if (zone === 'RED') {
        launchPercent = 0.4; stone.vy = 8; stone.vz = 0.5;
        stone.totalBudget = 0; stone.remainingBudget = 0;
        document.getElementById('message').innerText = "❌ MISS! 투척 실패";
        haptic('error');

        currentStatus = 'FLYING'; isPlaying = true;
        document.getElementById('score-display').innerText = 'BOUNCE: 0';
        try { SoundManager.playLaunch(swipeSpeed); } catch (e) { }
        runGameLoop();
        setTimeout(() => { triggerWaterMiss(); }, 350);
        return;
    } else {
        launchPercent = 1.0;
        document.getElementById('message').innerText = t('normalLaunch');
        haptic('medium');
    }

    let swipeBonus = swipeSpeed >= 30 ? 8 : (swipeSpeed >= 24 ? 4 : 2);
    const rawBase = Math.floor(Math.random() * (bRange[1] - bRange[0] + 1)) + bRange[0];
    stone.totalBudget = Math.max(14, Math.round((rawBase + swipeBonus) * launchPercent));
    stone.remainingBudget = stone.totalBudget;

    stone.vy *= Math.max(0.95, isSuperLaunch ? 2.2 : launchPercent);
    stone.vz *= Math.max(0.95, isSuperLaunch ? 1.4 : launchPercent);
    gaugeSpeedMult = 2.0;

    spawnRipple(STONE_FIXED_X, STONE_FIXED_Y);

    currentStatus = 'FLYING'; 
    isPlaying = true;
    document.getElementById('score-display').innerText = 'BOUNCE: 0';
    try { SoundManager.playLaunch(swipeSpeed); } catch (e) { }

    // 스트라이크 HUD 초기화 및 표시
    resetStrikes();
    showStrikeBoard();

    // 고스트 클릭 차단 (350ms로 안전 마진 확대)
    launchCoolDownUntil = Date.now() + 350;

    const gc = document.getElementById('game-container');
    if (gc) {
        gc.removeEventListener('pointerdown', registerBounceTap);
        gc.removeEventListener('touchstart', registerBounceTap);
        gc.removeEventListener('mousedown', registerBounceTap);
        
        // 🌟 pointerdown 하나로 통일하거나 touchstart에 passive: false 적용
        gc.addEventListener('touchstart', registerBounceTap, { passive: false });
        gc.addEventListener('mousedown', registerBounceTap);
    }

    if (isSuperLaunch) {
        const stoneEl = document.getElementById('ingame-stone');
        if (stoneEl) {
            stoneEl.style.filter = 'drop-shadow(0 0 25px #ffd700) drop-shadow(0 0 45px #ffffff) brightness(1.4)';
            stoneEl.style.transform = 'translate(-50%, -50%) scale(1.35)';
        }
        setTimeout(() => {
            if (stoneEl) {
                stoneEl.style.transition = 'filter 0.5s ease, transform 0.3s ease';
                stoneEl.style.filter = selectedStone.rarity === 'Mythic'
                    ? 'drop-shadow(0 0 22px rgba(255,215,0,0.85))'
                    : 'drop-shadow(0 6px 12px rgba(0,0,0,0.55))';
                stoneEl.style.transform = 'translate(-50%, -50%) scale(1.0)';
                setTimeout(() => { if (stoneEl) stoneEl.style.transition = ''; }, 500);
            }
            runGameLoop();
        }, 380);
    } else {
        runGameLoop();
    }
}

function runGameLoop() {
    if (!isPlaying) return;
    updatePhysics(); draw7LayerBG(); drawFxCanvas();
    animFrameId = requestAnimationFrame(runGameLoop);
}

function applyStonePos() {
    const el = document.getElementById('ingame-stone');
    if (!el) return;

    let bounceOff = 0;
    if (isDead) {
        bounceOff = Math.max(-45, stone.z * 1.8);
    } else {
        if (stone.z <= 8) {
            bounceOff = stone.z * 3.6;
        } else {
            bounceOff = 28.8 + Math.min(125, Math.pow(stone.z - 8, 0.78) * 6.0);
        }
    }

    const x = STONE_FIXED_X;
    const y = STONE_FIXED_Y - bounceOff;

    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.bottom = 'auto';

    const rot = stone.y * 3.0;

    if (isDead) {
        const op = Math.max(0, 1 + stone.z / 18);
        el.style.transform = `translate(-50%,-50%) scale(${0.72 * op}) rotate(${rot}deg)`;
        el.style.opacity = op;
    } else {
        const scaleBase = Math.max(0.72, 1.0 - (bounceOff * 0.0016));
        let scaleX = scaleBase, scaleY = scaleBase;

        if (stone.z <= 1.2 && stone.vz < 0) {
            scaleX *= 1.18; scaleY *= 0.82;
        } else if (stone.vz > 1.2) {
            scaleX *= 0.92; scaleY *= 1.10;
        }

        el.style.transform = `translate(-50%,-50%) scale(${scaleX}, ${scaleY}) rotate(${rot}deg)`;
        el.style.opacity = '1';
    }
}

// 1. 수면 자동 바운스 (물리 엔진) -> 콤보/타겟 히트 절대 없음
function updatePhysics() {
    if (!isDead) {
        stone.z += stone.vz;
        stone.vz -= currentGravity;
        stone.x += stone.vx;
        stone.y += stone.vy;
        if (stone.z > currentPeakZ) currentPeakZ = stone.z;
    } else {
        stone.vz -= 0.10;
        stone.z += stone.vz;
        stone.vy *= 0.92;
        applyStonePos();
        return;
    }

    rippleLayers.forEach(l => { l.z += stone.vy * 0.0008; if (l.z >= 1.0) l.z -= 1.0; });
    for (let i = wakes.length - 1; i >= 0; i--) {
        const w = wakes[i]; w.xL += w.vxL; w.xR += w.vxR; w.y += w.vy; w.vy *= 0.94; w.alpha -= 0.022;
        if (w.alpha <= 0) wakes.splice(i, 1);
    }
    layerProgress += stone.vy * 0.00009;

    const wm = 1 + (upgrades.weight * 0.0008);
    stone.vy = Math.max(16, stone.vy * Math.min(0.996, 0.988 * wm));
    stone.vx *= 0.98;

    // 수면 충돌 바운스
    if (stone.vz < 0 && stone.z <= 0.4 && !isDead) {
        if (hasTappedBounce) {
            hasTappedBounce = false;
        } else {
            // 탭하지 않은 자연 바운스는 단순 체공 유지용 GOOD 바운스만 실행 (타겟 피격 X)
            if (stone.remainingBudget > 0 && stone.vy > 0.25) {
                processBounce('GOOD', true);
            } else {
                triggerWaterSink();
                return;
            }
        }
    }

    if (stone.vy < 0.20 && !isDead && stone.remainingBudget <= 0) { triggerWaterSink(); return; }
    if (stone.vz < 0 && stone.z < -8 && !isDead && !hasTappedBounce) { triggerWaterMiss(); return; }

    if (currentStatus === 'FLYING' && !isDead) createTrailParticle(STONE_FIXED_X, STONE_FIXED_Y);
    applyStonePos();
}

function processBounce(rating, isAuto = false) {
    bounceCount++;
    const ex = STONE_FIXED_X, ey = STONE_FIXED_Y;

    if (!isAuto) spawnRatingText(ex, ey, rating);
    spawnRipple(ex, ey);

    const em = Math.pow(1.06, upgrades.elasticity);
    const sp = stone.activePhys || selectedStone.physics;
    const stoneBaseHeight = sp.bounceHeightBase || 2.4;

    if (rating === 'PERFECT') {
        perfectCount++;
        stone.remainingBudget += 3;
        stone.vy = Math.min(stone.vy * 1.25 + 2.0, 48);
        stone.z = 0.9;
        stone.vz = Math.max(2.2, stoneBaseHeight * 1.5 * em);
        currentGravity = Math.min(0.34, 0.17 + (perfectCount * 0.035));

        const earned = Math.round(100 * selectedStone.mult * 2.5);
        document.getElementById('message').innerText = `${t('perfectTiming')} (+${earned} SP)`;
        playerSP += earned;

        createParticles(ex, ey, true, false, 35);
        haptic('heavy');
        SoundManager.playBounce(true);
        spawnDramaticText('SUPER BOUNCE!', 'neon-lime');
        triggerShake('medium');
    } else if (rating === 'GOOD') {
        stone.remainingBudget--;
        stone.vy = Math.max(16, stone.vy * 0.985);
        stone.z = 0.8;
        const decayFact = Math.max(0.5, stone.remainingBudget / Math.max(1, stone.totalBudget));
        stone.vz = Math.max(1.6, stoneBaseHeight * 1.1 * em * decayFact);

        const earned = Math.round(100 * selectedStone.mult * 1.0);
        playerSP += earned;
        createParticles(ex, ey, false, false, 18);
        haptic('medium');
        SoundManager.playBounce(false);
    } else {
        triggerWaterSink();
        return;
    }

    currentPeakZ = Math.max(currentPeakZ, stone.vz * 3.0);
    hasTappedBounce = false;

    document.getElementById('score-display').innerText = `BOUNCE: ${bounceCount}`;
    updateAssetUI();
    saveData();
    spawnBounceMarker(ex, ey, bounceCount);
}

// ===================================================================
//  🎯 1타 1판정 보장 & 스트라이크 누수 방지
// ===================================================================

let tapLockUntil = 0; // 타임스탬프 기반 절대 락

function registerBounceTap(e) {
    if (e) {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
    }
    if (currentStatus !== 'FLYING' || isDead) return;
    
    const now = Date.now();
    if (now < launchCoolDownUntil) return; // 발사 직후 쿨다운

    // 🌟 모바일 중복 이벤트(터치+마우스 연달아 들어옴) 완전 차단 (140ms 타임스탬프 락)
    if (now < tapLockUntil) return;
    tapLockUntil = now + 140;

    let closest = null;
    let minDiff = 999;

    for (let t of rhythmTargets) {
        if (!t.isHit && !t.isMissed) {
            const diff = Math.abs(t.progress - 1.0);
            if (diff < minDiff) {
                minDiff = diff;
                closest = t;
            }
        }
    }

    // 🌟 1. 정상 타격 성공 (판정 범위 0.22)
    if (closest && minDiff <= 0.22) {
        closest.isHit = true; // 타겟 즉시 소비

        if (closest.type === 'WOOD') {
            // 1. 강렬한 비프음 재생 및 화면 셰이크 + 햅틱
            SoundManager.playWoodCrash();
            haptic('error');
            triggerShake('heavy');

            // 2. 상단 텍스트 및 화면 정중앙 거대 레드 팝업
            const msg = document.getElementById('message');
            if (msg) msg.innerText = "🪵 통나무 충돌!";

            const crashEl = document.createElement('div');
            crashEl.className = 'dramatic-text wood-crash-text';
            crashEl.innerHTML = "🪵 콰앙!<br>통나무 충돌 침수!";
            document.getElementById('game-container').appendChild(crashEl);

            // 1.2초 후 팝업 제거
            setTimeout(() => { crashEl.remove(); }, 1200);

            // 3. 메시지와 비프음을 충분히 감상한 후 침수 및 결과창 진입
            setTimeout(() => {
                triggerWaterSink(true);
            }, 200);
            return;
        }

        const rating = minDiff <= 0.09 ? 'PERFECT' : 'GOOD';
        hasTappedBounce = true;
        onRhythmHit(closest, rating);
    } 
    // 🌟 2. 타겟이 없는 진짜 허공 탭일 때 (안전 가드 적용)
    else {
        // 이미 죽었거나 3스트라이크 이상이면 추가 입력 원천 차단
        if (isDead || strikeCount >= 3) return;

        strikeCount++;
        comboCount = 0;
        updateStrikeUI();
        haptic('medium');
        if (typeof SoundManager.playStrikeWarning === 'function') {
            SoundManager.playStrikeWarning();
        }

        // [안전가드 1] 상단 안내창 즉시 갱신
        const msg = document.getElementById('message');
        if (msg) {
            msg.style.color = '#ff3333';
            msg.innerText = strikeCount >= 3 
                ? "❌ 3 STRIKE OUT! 침수!" 
                : `⚠️ 헛손질! STRIKE (${strikeCount}/3)`;
        }

        // [안전가드 2] 기존 잔여 팝업 중복 제거 (글씨 겹침 방지)
        document.querySelectorAll('.strike-warning-alert').forEach(el => el.remove());

        // [안전가드 3] 팝업 생성
        const alertEl = document.createElement('div');
        alertEl.className = 'strike-warning-alert';
        alertEl.style.cssText = `
            position: absolute !important;
            top: 42% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) scale(1.1) !important;
            color: #ff3333 !important;
            font-size: 26px !important;
            font-weight: 900 !important;
            text-align: center !important;
            white-space: nowrap !important;
            text-shadow: 0 0 12px #ff0000, 0 0 24px rgba(255, 0, 0, 0.8), 0 2px 4px #000 !important;
            font-family: 'GmarketSans', sans-serif !important;
            z-index: 99999 !important;
            pointer-events: none !important;
        `;

        if (strikeCount >= 3) {
            isStrikeOutPending = true;
            alertEl.innerHTML = "❌ 3 STRIKE OUT!<br><span style='font-size:18px;color:#fff;'>침수됩니다!</span>";
            document.getElementById('game-container').appendChild(alertEl);
            setTimeout(() => alertEl.remove(), 1200);

            // [핵심 안전가드 4] 물리 엔진 자연 바운스/반등 완전 차단
            stone.remainingBudget = 0;
            stone.vz = -2.0; 
            triggerShake('heavy');
            
            setTimeout(() => { 
                triggerWaterSink(false, true); 
            }, 250);
        } else {
            alertEl.innerHTML = `⚠️ STRIKE ${strikeCount}!<br><span style='font-size:16px;color:#ffaaaa;'>(3회 누적 시 아웃)</span>`;
            document.getElementById('game-container').appendChild(alertEl);
            setTimeout(() => alertEl.remove(), 850);
        }
    }
}

// ===================================================================
//  콤보 팝업 & 메시지 가독성 완전 정상화 패치
// ===================================================================

let safeMsgTimer = null;

// 1. 통나무 회피 SAFE 메시지: 1.2초 후 자동 제거
function onRhythmMiss(target) {
    if (target.type === 'WOOD') {
        const msg = document.getElementById('message');
        if (msg) {
            msg.innerText = "🪵 통나무 회피 SAFE!";
            if (safeMsgTimer) clearTimeout(safeMsgTimer);
            safeMsgTimer = setTimeout(() => {
                if (currentStatus === 'FLYING' && !isDead) {
                    msg.innerText = ""; // 1.2초 뒤 깔끔하게 제거
                }
            }, 1200);
        }
        return;
    }

    // 통나무가 아닌 오리/개구리를 놓쳤을 때만 콤보 브레이크
    if (comboCount > 0) {
        comboCount = 0;
        spawnDramaticText('COMBO BREAK...', 'neon-red');
    }
}

// 2. 콤보 히트 처리: 신규 WebP 아이콘 적용 및 콤보 누적 정상화
function onRhythmHit(target, rating) {
    comboCount++; // 콤보 정상 누적 (1 -> 2 -> 3...)
    if (typeof maxCombo === 'undefined' || comboCount > maxCombo) maxCombo = comboCount;

    const ex = STONE_FIXED_X;

    // A. PERFECT / GOOD 판정 텍스트 (상단 하늘 분리)
    spawnRatingText(ex, HORIZON_Y - 45, rating);

    // B. 신규 WebP 미니 아이콘이 포함된 깔끔한 콤보 연출
    const assetImgUrl = target.type === 'DUCK' 
        ? 'images/lloverduck.webp' 
        : 'images/lfrog_01.webp';
    
    const actionText = target.type === 'DUCK' ? 'CATCH!' : 'LEAP!';
    const comboColor = comboCount >= 5 ? 'neon-gold' : 'neon-lime';

    // 더미 이미지를 없애고 신규 WebP 태그를 직접 삽입
    spawnComboTextWithIcon(assetImgUrl, `${actionText} ${comboCount} COMBO`, comboColor);

    // C. 버짓 및 비거리 보너스
    const comboBonus = Math.min(8, Math.floor(comboCount / 2));
    stone.remainingBudget += (rating === 'PERFECT' ? 3 : 2) + comboBonus;
    stone.vy = Math.min(48, Math.max(stone.vy, 22) * 1.12 + 1.2);
    
    stone.z = 1.0;
    stone.vz = (target.type === 'FROG' ? 3.6 : 3.0) * Math.pow(1.06, upgrades.elasticity);
    hasTappedBounce = true;

    haptic(rating === 'PERFECT' ? 'heavy' : 'medium');
    SoundManager.playBounce(rating === 'PERFECT');
    triggerShake(comboCount >= 5 ? 'medium' : 'light');

    createParticles(ex, STONE_FIXED_Y, true, false, 25);
    
    bounceCount++;
    document.getElementById('score-display').innerText = `BOUNCE: ${bounceCount}`;
    spawnBounceMarker(ex, STONE_FIXED_Y, bounceCount);
}

// 3. 신규 WebP 미니 아이콘을 띄워주는 전용 콤보 연출 함수
function spawnComboTextWithIcon(iconSrc, text, cls = 'neon-lime') {
    const d = document.createElement('div');
    d.className = `dramatic-text ${cls}`;
    d.style.cssText = `
        position: absolute;
        top: 28%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.85);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        z-index: 120;
        pointer-events: none;
        white-space: nowrap;
    `;
    
    d.innerHTML = `
        <img src="${iconSrc}" style="width: 32px; height: 32px; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6));">
        <span>${text}</span>
    `;

    document.getElementById('game-container').appendChild(d);

    // 부드러운 팝업 후 소멸
    requestAnimationFrame(() => {
        d.style.transition = 'transform 0.2s cubic-bezier(0.17, 0.89, 0.32, 1.25), opacity 0.3s ease';
        d.style.transform = 'translate(-50%, -50%) scale(1.05)';
        d.style.opacity = '1';
    });

    setTimeout(() => {
        d.style.transform = 'translate(-50%, -70%) scale(0.9)';
        d.style.opacity = '0';
        setTimeout(() => d.remove(), 300);
    }, 750);
}

// ===================================================
//  ⚾ 야구 스타일 스트라이크 인디케이터 제어 함수
// ===================================================
let strikeCount = 0;

function updateStrikeUI() {
    const sb = document.getElementById('strike-board');
    if (sb) sb.style.display = 'flex';
    for (let i = 1; i <= 3; i++) {
        const dot = document.getElementById(`s-dot-${i}`);
        if (dot) {
            if (i <= strikeCount) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        }
    }
}

function showStrikeBoard() {
    const sb = document.getElementById('strike-board');
    if (sb) sb.style.display = 'flex';
}

function hideStrikeBoard() {
    const sb = document.getElementById('strike-board');
    if (sb) sb.style.display = 'none';
}

function setStrikeCount(count) {
    strikeCount = Math.max(0, Math.min(3, count));
    updateStrikeUI();
}

function addStrike() {
    setStrikeCount(strikeCount + 1);
    return strikeCount;
}

let isStrikeOutPending = false;
function resetStrikes() {
    strikeCount = 0;
    isStrikeOutPending = false;
    updateStrikeUI();
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
    trollBox.innerHTML = `<p style="color:#fff;font-size:16px;font-weight:900;line-height:1.5;margin:0;font-family:'GmarketSans',sans-serif;text-shadow:0 2px 4px #000;">${roastMsgs[Math.floor(Math.random() * roastMsgs.length)]}</p>`;
    document.getElementById('game-container').appendChild(trollBox);

    setTimeout(() => {
        trollBox.remove();
        endGame();
    }, 1000);
}

function triggerWaterSink(isWoodHit = false, isStrikeOut = false) {
    if (isDead) return;
    isDead = true;
    stone.vz = -1.2;
    stone.vy = Math.min(stone.vy, 4);
    const ex = STONE_FIXED_X, ey = STONE_FIXED_Y;
    spawnRipple(ex, ey); 
    createParticles(ex, ey, false, true, 16);
    
    // 통나무 충돌이나 스트라이크 아웃이 아닐 때만 일반 침수 안내 출력
    if (!isWoodHit && !isStrikeOut && !isStrikeOutPending) {
        document.getElementById('message').innerText = t('sinkMsg');
    }
    SoundManager.playSink();
    
    haptic('error');

    setTimeout(() => {
        endGame();
    }, 1200);
}

function triggerWake(x, y, scale) { wakes.push({ x, y, vxL: -W * 0.015 * scale, vxR: W * 0.015 * scale, vy: H * 0.022 * scale, width: 9 * scale, alpha: 1, xL: x, xR: x }); }

// ===========================================================
//  🖼️ 3단 레이어 패럴랙스 엔진
// ===========================================================
function drawScaledCenteredCoverImage(ctx, img, W, H, scale = 1.0) {
    if (!img || !img.complete) return;
    const imgW = img.naturalWidth || img.width;
    const imgH = img.naturalHeight || img.height;
    const imgRatio = imgW / imgH;
    const canvasRatio = W / H;

    let drawW, drawH;
    if (canvasRatio > imgRatio) { drawW = W; drawH = W / imgRatio; }
    else { drawW = H * imgRatio; drawH = H; }

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();
    ctx.translate(W / 2, H / 2);
    ctx.scale(scale, scale);
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
}

function getThemeImg(layer) {
    // 🌟 lake와 moon은 webp 로드
    const ext = (currentTheme === 'moon' || currentTheme === 'lake') ? 'webp' : 'png';
    return bgImgCache[`images/${layer}_${currentTheme}.${ext}`];
}

function drawStaticBackground() {
    bgCtx.clearRect(0, 0, W, H);
    const imgBase = getThemeImg('background');
    const imgMid = getThemeImg('midground');
    const imgFore = getThemeImg('foreground');
    if (imgBase && imgBase.complete) drawScaledCenteredCoverImage(bgCtx, imgBase, W, H, 1.0);
    if (imgMid && imgMid.complete) drawScaledCenteredCoverImage(bgCtx, imgMid, W, H, 1.0);
    if (imgFore && imgFore.complete) drawScaledCenteredCoverImage(bgCtx, imgFore, W, H, 1.0);
}

function draw7LayerBG() {
    bgCtx.clearRect(0, 0, W, H);
    bgCtx.globalCompositeOperation = 'source-over';
    const vp = { x: W / 2, y: HORIZON_Y };
    const rarity = selectedStone?.rarity || 'Ordinary';

    const imgBase = getThemeImg('background');
    const imgMid = getThemeImg('midground');
    const imgFore = getThemeImg('foreground');

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
//  ✨ 카툰 속도선 & 리듬 타겟 렌더링 엔진
// ===========================================================
function drawFxCanvas() {
    fxCtx.clearRect(0, 0, W, H);

    updateRhythmSpawner();
    for (let i = rhythmTargets.length - 1; i >= 0; i--) {
        const t = rhythmTargets[i];
        t.update();
        t.draw(fxCtx);

        if (t.depth > 1.3 || t.isHit) {
            rhythmTargets.splice(i, 1);
        }
    }

    if (rhythmTargets.length > 5) {
        rhythmTargets.shift();
    }

    if (currentStatus === 'FLYING' && !isDead) {
        const speed = stone.vy;
        if (speed > 3) {
            const lineCount = Math.min(72, Math.floor((speed - 3) * 3.5));
            const alpha = Math.max(0, Math.min(0.8, (speed - 3) / 20));
            fxCtx.save(); fxCtx.globalAlpha = alpha;
            for (let i = 0; i < lineCount; i++) {
                const angle = (i / lineCount) * Math.PI * 2 + (stone.y * 0.05);
                const startR = W * 0.42 + Math.random() * W * 0.10; 
                const endR = W * 0.55 + Math.random() * W * 0.25;
                const ex1 = CX + Math.cos(angle) * startR; 
                const ey1 = HORIZON_Y + Math.sin(angle) * startR * 0.45;
                const ex2 = CX + Math.cos(angle) * endR; 
                const ey2 = HORIZON_Y + Math.sin(angle) * endR * 0.45;

                const rarity = selectedStone?.rarity || 'Ordinary'; 
                let lc = 'rgba(255,255,255,0.8)';
                if (rarity === 'Mythic') lc = 'rgba(255,215,0,0.9)'; 
                else if (rarity === 'Legendary') lc = 'rgba(192,132,252,0.85)'; 
                else if (rarity === 'Rare') lc = 'rgba(0,240,255,0.85)';

                fxCtx.beginPath(); fxCtx.moveTo(ex1, ey1); fxCtx.lineTo(ex2, ey2); fxCtx.strokeStyle = lc;
                fxCtx.lineWidth = (Math.random() * 2 + 0.5) * Math.max(0.5, Math.min(3.0, (speed - 3) / 10));
                fxCtx.shadowBlur = 3; fxCtx.shadowColor = '#000'; fxCtx.stroke();
            }
            fxCtx.restore();
        }
    }

    for (let i = particles.length - 1; i >= 0; i--) { 
        const p = particles[i]; p.update(); p.draw(fxCtx); 
        if (p.alpha <= 0) particles.splice(i, 1); 
    }
}

// ===========================================================
//  🌊 강물 표류 & 기습 인터셉트 엔티티 엔진
// ===========================================================
class RhythmTarget {
    constructor(type = 'DUCK') {
        this.type = type;
        this.isHit = false;
        this.isMissed = false;
        this.depth = 0.0;

        this.isFromLeft = Math.random() < 0.5;
        this.dirKey = this.isFromLeft ? 'L' : 'R';

        // 🌟 신규 로우폴리 호수 수평선 접점에 정확히 일치
        this.waterStartY = (currentTheme === 'lake') ? Math.round(H * 0.515) : Math.round(H * 0.485);
        this.waterTargetY = STONE_FIXED_Y + 10;

        if (this.type === 'FROG') {
            this.startX = this.isFromLeft ? (W * 0.08) : (W * 0.92);
            this.targetX = STONE_FIXED_X + (this.isFromLeft ? -20 : 20);
            this.state = 'WAITING';
            this.waitDuration = 50 + Math.floor(Math.random() * 20);
            this.waitTimer = 0;
            this.jumpProgress = 0.0;
            this.motionFrame = 0;
        } else if (this.type === 'WOOD') {
            this.laneX = CX + (Math.random() - 0.5) * (W * 0.30);
            this.baseSpeed = 0.013;
            this.bobCycle = Math.random() * Math.PI * 2;
        } else {
            // 🦆 러브덕
            this.laneX = CX + (this.isFromLeft ? -45 : 45);
            this.baseSpeed = 0.012;
            this.bobCycle = Math.random() * Math.PI * 2;
        }
    }

    get progress() { return this.depth; }

    update() {
        if (this.type === 'FROG') {
            if (this.state === 'WAITING') {
                this.waitTimer++;
                this.floatY = Math.sin(this.waitTimer * 0.15) * 2;
                this.motionFrame = 0;
                this.currentX = this.startX;
                this.currentY = this.waterStartY + (this.waterTargetY - this.waterStartY) * 0.35;
                this.scale = 0.45; // 웅크릴 때의 아담한 크기

                if (this.waitTimer >= this.waitDuration) {
                    this.state = 'JUMPING';
                    this.depth = 0.35;
                }
                return;
            } else {
                this.jumpProgress += 0.038;
                this.depth = 0.35 + (this.jumpProgress * 0.75);

                this.currentX = this.startX + (this.targetX - this.startX) * Math.min(1.0, this.jumpProgress * 1.2);
                const jumpCurve = Math.sin(Math.min(1.0, this.jumpProgress) * Math.PI);

                this.currentY = (this.waterStartY + (this.waterTargetY - this.waterStartY) * 0.35) 
                                + (this.waterTargetY - (this.waterStartY + (this.waterTargetY - this.waterStartY) * 0.35)) * this.jumpProgress;
                
                this.floatY = -jumpCurve * 50;
                // 도약하며 시원하게 커짐 (0.45 -> 1.05)
                this.scale = 0.45 + (this.jumpProgress * 0.6);

                if (jumpCurve > 0.4 && this.jumpProgress < 0.75) {
                    this.motionFrame = 1;
                } else if (this.jumpProgress >= 0.75) {
                    this.motionFrame = 2;
                } else {
                    this.motionFrame = 0;
                }
            }
        } else {
            // 🦆 러브덕 & 🪵 통나무
            const speedCurve = this.depth < 0.55 ? 0.9 : (1.0 + (this.depth - 0.55) * 2.8);
            const streamFactor = Math.max(1.15, (stone.vy || 14) / 13);
            this.depth += this.baseSpeed * speedCurve * streamFactor;

            // 🌟 수면 투영 곡선 (수면을 미끄러지듯 자연스럽게 하강)
            const waterCurve = Math.pow(this.depth, 1.6);
            this.currentY = this.waterStartY + (this.waterTargetY - this.waterStartY) * waterCurve;
            this.currentX = CX + (this.laneX - CX) * (0.25 + waterCurve * 0.75);

            // 🌟 [핵심] 첫 스폰 50%(0.5) -> 돌 도착 시 100%(1.0)로 점진적 확대
            this.scale = 0.50 + (Math.min(1.0, this.depth) * 0.50);

            // 강물 위 둥실거리는 찰랑임 물리
            this.bobCycle += 0.08;
            this.floatY = Math.sin(this.bobCycle) * (this.type === 'WOOD' ? 2.0 : 3.5) * this.scale;
            this.floatRot = Math.sin(this.bobCycle * 0.6) * 0.04;
        }

        if (this.depth > 1.22 && !this.isHit && !this.isMissed) {
            this.isMissed = true;
            onRhythmMiss(this);
        }
    }

    draw(ctx) {
        if (this.isHit || this.depth > 1.35) return;

        // 🌟 스케일 적용: 원경에서는 작고, 근경에서 커짐
        const baseW = this.type === 'WOOD' ? 88 : 74;
        const baseH = this.type === 'WOOD' ? 54 : 74;
        const w = baseW * this.scale;
        const h = baseH * this.scale;

        ctx.save();

        // 1. 강물 수면 그림자 (짙은 다크 네이비로 수면 접지력 확보)
        ctx.beginPath();
        ctx.ellipse(this.currentX, this.currentY + (h * 0.28), w * 0.45, h * 0.16, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 15, 35, 0.65)';
        ctx.fill();

        // 2. 강물 찰랑임 물결 (타겟이 물에 잠겨 떠내려오는 효과)
        ctx.beginPath();
        ctx.ellipse(this.currentX, this.currentY + (h * 0.28), w * 0.55, h * 0.19, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.lineWidth = 1.8 * this.scale;
        ctx.stroke();

        // 3. 에셋 렌더링
        ctx.translate(this.currentX, this.currentY + (this.floatY || 0));
        if (this.floatRot) ctx.rotate(this.floatRot);

        try {
            if (this.type === 'FROG') {
                const frogImg = ASSETS_STREAM[`FROG_${this.dirKey}`][this.motionFrame];
                if (frogImg && frogImg.complete && frogImg.naturalWidth > 0) {
                    ctx.drawImage(frogImg, -w / 2, -h / 2, w, h);
                }
            } else if (this.type === 'WOOD') {
                const woodImg = ASSETS_STREAM.WOOD;
                if (woodImg && woodImg.complete && woodImg.naturalWidth > 0) {
                    ctx.drawImage(woodImg, -w / 2, -h / 2, w, h);
                }
            } else {
                const duckImg = ASSETS_STREAM[`DUCK_${this.dirKey}`];
                if (duckImg && duckImg.complete && duckImg.naturalWidth > 0) {
                    ctx.drawImage(duckImg, -w / 2, -h / 2, w, h);
                }
            }
        } catch (e) { }

        // 4. 골든 판정 가이드 링 (골든 타임)
        if (this.depth >= 0.88 && this.depth <= 1.12) {
            ctx.beginPath();
            ctx.ellipse(0, h * 0.25, w * 0.65, h * 0.25, 0, 0, Math.PI * 2);
            ctx.strokeStyle = this.type === 'WOOD' ? '#ff3333' : (this.type === 'FROG' ? '#00ff66' : '#ffea00');
            ctx.lineWidth = 2.5;
            ctx.shadowColor = ctx.strokeStyle;
            ctx.shadowBlur = 12;
            ctx.stroke();
        }

        ctx.restore();
    }
}

function updateRhythmSpawner() {
    if (currentStatus !== 'FLYING' || isDead) return;

    const now = Date.now();
    if (now >= nextSpawnTime) {
        const rand = Math.random();
        if (rand < 0.15) {
            rhythmTargets.push(new RhythmTarget('WOOD'));
        } else if (rand < 0.50) {
            rhythmTargets.push(new RhythmTarget('FROG'));
        } else {
            rhythmTargets.push(new RhythmTarget('DUCK'));
        }

        const minGap = 450;
        const randomGap = Math.random() * 1000;
        nextSpawnTime = now + minGap + randomGap;
    }
}

// ===========================================================
//  ⚙️ 이펙트 파티클 클래스들
// ===========================================================
class WakeParticle {
    constructor(x, y, vx, vy) {
        this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.r = Math.random() * 2 + 1.5; this.alpha = 0.75; this.decay = Math.random() * 0.025 + 0.015;
    }
    update() { this.x += this.vx; this.y += this.vy; this.r += 0.4; this.alpha -= this.decay; }
    draw(ctx) {
        ctx.save(); ctx.globalAlpha = Math.max(0, this.alpha); ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.r, this.r * 0.4, 0, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r);
        grad.addColorStop(0, 'rgba(255,255,255,0.8)'); grad.addColorStop(0.35, 'rgba(0,240,255,0.4)'); grad.addColorStop(1, 'rgba(0,240,255,0)');
        ctx.fillStyle = grad; ctx.shadowBlur = 12; ctx.shadowColor = 'rgba(0,240,255,0.5)'; ctx.fill(); ctx.restore();
    }
}

class TrailParticle {
    constructor(x, y) {
        this.x = x + (Math.random() - 0.5) * 22; this.y = y + 8; this.vx = (Math.random() - 0.5) * 2.2; this.vy = -Math.random() * 2.8 - 1.8; this.r = Math.random() * 4 + 3; this.alpha = 0.82; this.decay = Math.random() * 0.042 + 0.025;
        const rarity = selectedStone?.rarity || 'Ordinary';
        if (rarity === 'Mythic') this.color = Math.random() > 0.4 ? '#ffd700' : '#f97316';
        else if (rarity === 'Legendary') this.color = Math.random() > 0.5 ? '#c084fc' : '#e9d5ff';
        else if (rarity === 'Rare') this.color = Math.random() > 0.5 ? '#00f0ff' : '#ffffff';
        else this.color = 'rgba(255,255,255,0.42)';
        this.rarity = rarity;
    }
    update() { this.x += this.vx; this.y += this.vy; this.r = Math.max(0.2, this.r * 0.93); this.alpha -= this.decay; this.x += (CX - this.x) * 0.018; }
    draw(ctx) {
        ctx.save(); ctx.globalAlpha = Math.max(0, this.alpha); ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.fillStyle = this.color;
        ctx.shadowBlur = this.rarity === 'Mythic' ? 10 : 5; ctx.shadowColor = this.color; ctx.fill();
        if (this.r > 1.5) { ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1; ctx.stroke(); }
        ctx.restore();
    }
}

class ShockwaveRing {
    constructor(x, y, isPerfect) { this.x = x; this.y = y; this.radius = 6; this.maxR = isPerfect ? 90 : 48; this.grow = isPerfect ? 5 : 2.8; this.alpha = 1; this.decay = isPerfect ? 0.022 : 0.042; this.color = isPerfect ? 'rgba(217,255,0,0.9)' : 'rgba(255,255,255,0.7)'; }
    update() { this.radius += this.grow; this.alpha -= this.decay; }
    draw(ctx) {
        ctx.save(); ctx.globalAlpha = Math.max(0, this.alpha); ctx.beginPath(); ctx.ellipse(this.x, this.y, this.radius, this.radius * 0.44, 0, 0, Math.PI * 2);
        ctx.strokeStyle = this.color; ctx.lineWidth = 3.5; ctx.shadowBlur = 14; ctx.shadowColor = this.color; ctx.stroke();
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
    }
}

class SplashParticle {
    constructor(x, y, isPerfect, isSink) {
        this.x = x; this.y = y; const rarity = selectedStone?.rarity || 'Ordinary'; let sm = 1;
        if (rarity === 'Mythic') sm = 1.7; else if (rarity === 'Legendary') sm = 1.35; else if (rarity === 'Rare') sm = 1.15;
        const isLeft = Math.random() < 0.5;
        this.vx = (isLeft ? (-Math.random() * 5 - 3) : (Math.random() * 5 + 3)) * sm;
        this.vy = (Math.random() - 0.5) * 1.5 - (isSink ? 4.5 : 2.5);
        this.r = (Math.random() * (isPerfect ? 6 : 3) + 2.2) * (rarity === 'Mythic' ? 1.4 : 1); this.grav = rarity === 'Mythic' ? 0.26 : 0.34; this.alpha = 1; this.decay = (Math.random() * 0.025 + 0.014) * (rarity === 'Mythic' ? 0.72 : 1);
        if (rarity === 'Mythic') { const rn = Math.random(); this.color = rn > 0.65 ? '#ffd700' : rn > 0.4 ? '#d9ff00' : rn > 0.2 ? '#f97316' : '#ffffff'; }
        else if (rarity === 'Legendary') { this.color = Math.random() > 0.5 ? '#c084fc' : '#ffd700'; }
        else if (rarity === 'Rare') { this.color = Math.random() > 0.5 ? '#00f0ff' : '#ffffff'; }
        else { this.color = isPerfect ? (Math.random() > 0.4 ? '#ffd700' : '#d9ff00') : '#ffffff'; }
        this.rarity = rarity;
    }
    update() { this.x += this.vx; this.y += this.vy; this.vy += this.grav; this.alpha -= this.decay; }
    draw(ctx) {
        ctx.save(); ctx.globalAlpha = Math.max(0, this.alpha); ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.fillStyle = this.color;
        ctx.shadowBlur = this.rarity === 'Mythic' ? 14 : 7; ctx.shadowColor = this.color; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.restore();
    }
}

function createParticles(x, y, isPerfect, isSink, count, isBad = false) { if (!isSink && !isBad) particles.push(new ShockwaveRing(x, y, isPerfect)); const n = count > 0 ? count : (isPerfect ? 38 : (isSink ? 24 : 16)); for (let i = 0; i < n; i++) particles.push(new SplashParticle(x, y, isPerfect, isSink, isBad)); }
function createTrailParticle(x, y) { const cnt = selectedStone?.rarity === 'Mythic' ? 5 : (stone.isCrit ? 3 : 1); for (let i = 0; i < cnt; i++) particles.push(new TrailParticle(x, y)); }

// ===========================================================
//  🎯 DOM 애니메이션 오버레이 이펙트
// ===========================================================
function spawnRipple(x, y) {
    const r = document.createElement('div');
    r.className = 'ripple';
    r.style.left = `${x}px`;
    r.style.top = `${y + 12}px`;
    document.getElementById('game-container').appendChild(r);
    setTimeout(() => { r.remove(); }, 850);
}
function spawnRatingText(x, y, rating) { const d = document.createElement('div'); d.className = `effect-text ${rating.toLowerCase()}`; d.style.left = `${x}px`; d.style.top = `${y - 45}px`; const map = { PERFECT: 'PERFECT!', GOOD: 'GOOD!', BAD: 'BAD', MISS: 'MISS' }; d.innerText = map[rating] || rating; document.getElementById('game-container').appendChild(d); setTimeout(() => d.remove(), 920); }
function spawnBounceMarker(x, y, count) {
    const container = document.getElementById('game-container');
    if (!container) return;
    const d = document.createElement('div');

    // 🌟 [핵심] 상단/좌우 타겟 진입로를 일절 가리지 않는 돌 바로 아래 착수 수면 지점
    const targetX = STONE_FIXED_X;
    const targetY = STONE_FIXED_Y + 45;

    d.style.cssText = `
        position: absolute;
        left: ${targetX}px;
        top: ${targetY}px;
        transform: translate(-50%, -50%) scale(0.75);
        background: rgba(10, 15, 28, 0.85);
        color: #d9ff00;
        border: 1.5px solid #d9ff00;
        border-radius: 20px;
        padding: 3px 10px;
        font-size: 13px;
        font-family: 'GmarketSans', sans-serif;
        font-weight: 700;
        z-index: 60;
        pointer-events: none;
        white-space: nowrap;
        text-shadow: 0 0 4px #000;
        box-shadow: 0 0 10px rgba(217, 255, 0, 0.35);
        opacity: 0;
        transition: transform 0.22s cubic-bezier(0.17, 0.89, 0.32, 1.25), opacity 0.22s ease-out;
    `;
    
    // 다국어 지원 키 적용
    d.innerText = typeof t === 'function' ? t('bounceMarkerUnit').replace('{count}', count) : `+${count} 튀김!`;
    container.appendChild(d);

    // 팝업 애니메이션
    requestAnimationFrame(() => {
        d.style.opacity = '1';
        d.style.transform = 'translate(-50%, -50%) scale(1.05)';
        setTimeout(() => { 
            d.style.transform = 'translate(-50%, -50%) scale(1.0)'; 
        }, 120);
    });

    // 수면 파문과 함께 아래로 자연스럽게 페이드아웃
    setTimeout(() => {
        d.style.transition = 'transform 0.3s ease-in, opacity 0.3s ease-in';
        d.style.opacity = '0';
        d.style.transform = 'translate(-50%, -20%) scale(0.85)';
        setTimeout(() => d.remove(), 300);
    }, 600);
}

// ===========================================================
//  🏁 채굴 결과 정산 및 게임 루프 종료 (논블로킹 비동기 저장)
// ===========================================================
async function endGame() {
    isPlaying = false;
    cancelAnimationFrame(animFrameId);
    fxCtx.clearRect(0, 0, W, H);
    particles = []; wakes = [];

    document.getElementById('game-container').removeEventListener('pointerdown', registerBounceTap);
    document.getElementById('game-container').removeEventListener('mousedown', registerBounceTap);
    document.getElementById('game-container').removeEventListener('touchstart', registerBounceTap);
    document.getElementById('ingame-stone').style.display = 'none';
    hideStrikeBoard();

    const earnedSP = Math.round(((bounceCount * 100) + (perfectCount * 150)) * selectedStone.mult);
    document.getElementById('res-stone-name').innerText = t(selectedStone.nameKey);
    document.getElementById('res-stone-name').style.color = selectedStone.color;
    document.getElementById('res-bounce-count').innerText = `${bounceCount} ${t('bouncesUnit')}`;
    document.getElementById('res-perfect-count').innerText = `${perfectCount} ${t('bouncesUnit')}`;
    document.getElementById('res-earned-sp').innerText = `+${earnedSP.toLocaleString()} SP`;

    const trophyImg = document.querySelector('#result-modal img');
    if (trophyImg) trophyImg.src = 'images/intro_emblem.png';

    playerSP += earnedSP;
    updateAssetUI();
    haptic('success');
    SoundManager.playFanfare();
    setAssetBarVisible(false);
    document.getElementById('result-modal').style.display = 'flex';

    saveData();
}

function closeResultModal() {
    document.querySelectorAll('.troll-box').forEach(el => el.remove());
    document.getElementById('result-modal').style.display = 'none';
    currentStatus = 'PRE_SPIN';

    const rs = document.getElementById('roulette-screen');
    if (rs) { rs.style.display = 'flex'; rs.style.opacity = '1'; }
    const rt = document.getElementById('roulette-title');
    if (rt) rt.innerText = t('lobbyTitle');
    const wc = document.getElementById('wheel-cap-text');
    if (wc) { wc.innerText = t('wheelTouch'); wc.style.color = '#fff'; }
    const sd = document.getElementById('stone-desc-text');
    if (sd) sd.innerText = '';
    const wEl = document.getElementById('roulette-wheel');
    if (wEl) wEl.querySelectorAll('.wheel-sector').forEach(s => s.classList.remove('highlight'));

    const mb = document.getElementById('main-btn');
    if (mb) {
        mb.disabled = false; mb.classList.remove('pulse'); mb.innerText = t('spinBtn');
        mb.style.background = 'linear-gradient(135deg, var(--neon-lime) 0%, #a8ff00 100%)'; mb.style.color = 'var(--ink)';
    }

    setAssetBarVisible(true);
    gaugeSpeedMult = 2.0;
    updateAssetUI();
    changeRandomBg();
    drawStaticBackground();
}

function openYoutubeCharge() {
    const modal = document.getElementById('youtube-modal');
    const timerEl = document.getElementById('video-timer');
    modal.style.display = 'flex';
    let sec = 5; timerEl.innerText = sec;

    const iv = setInterval(async () => {
        sec--; timerEl.innerText = sec;
        if (sec <= 0) {
            clearInterval(iv);
            playerHearts = 5;
            updateAssetUI();
            haptic('success');
            saveData();
            modal.style.display = 'none';
            currentStatus = 'PRE_SPIN';
        }
    }, 1000);
}

function getUpgradeCost(t) { 
    const currentLv = (upgrades && typeof upgrades[t] === 'number') ? upgrades[t] : 0;
    return Math.floor(UPGRADE_BASE_COST * Math.pow(1.65, currentLv)); 
}
function openShop() { if (isSpinning || currentStatus !== 'PRE_SPIN') return; SoundManager.resume(); setAssetBarVisible(false); document.getElementById('shop-modal').style.display = 'flex'; updateShopUI(); haptic('light'); }
function closeShop() { SoundManager.resume(); document.getElementById('shop-modal').style.display = 'none'; setAssetBarVisible(true); haptic('light'); }

function updateShopUI() {
    document.getElementById('shop-sp-count').innerText = playerSP.toLocaleString();
    ['weight', 'elasticity', 'spin', 'perfectZone'].forEach(type => {
        const lv = upgrades[type] || 0; 
        const btn = document.getElementById(`btn-${type}`); 
        const lvEl = document.getElementById(`lv-${type}`);
        if (lvEl) lvEl.innerText = lv;
        const nextLvEl = document.getElementById(`next-lv-${type}`);
        const costEl = document.getElementById(`cost-${type}`);

        if (btn && costEl) {
            if (lv >= MAX_LV) { 
                if (nextLvEl) nextLvEl.innerText = 'Max'; 
                costEl.innerText = 'MAX'; btn.disabled = true; 
            } else { 
                if (nextLvEl) nextLvEl.innerText = lv + 1; 
                const cost = getUpgradeCost(type); 
                costEl.innerText = cost.toLocaleString(); btn.disabled = playerSP < cost; 
            }
        }

        if (type === 'weight') {
            const valEl = document.getElementById('val-weight');
            if (valEl) valEl.innerText = (lv * 0.08).toFixed(1);
        } else if (type === 'elasticity') {
            const valEl = document.getElementById('val-elasticity');
            if (valEl) valEl.innerText = Math.round((Math.pow(1.08, lv) - 1) * 100);
        } else if (type === 'spin') {
            const valEl = document.getElementById('val-spin');
            if (valEl) valEl.innerText = Math.round(lv * 12.8);
        } else if (type === 'perfectZone') {
            const valEl = document.getElementById('val-perfectZone');
            if (valEl) valEl.innerText = (10.0 + (lv * 1.0)).toFixed(1);
        }
    });
}

function buyUpgrade(type) {
    if (!upgrades) upgrades = { weight: 0, elasticity: 0, spin: 0, perfectZone: 0 };
    if (upgrades[type] === undefined) upgrades[type] = 0;
    if (upgrades[type] >= MAX_LV) return; 
    const cost = getUpgradeCost(type); 
    if (isNaN(cost) || isNaN(playerSP) || playerSP < cost) return;

    playerSP -= cost; upgrades[type]++; 
    saveData(); updateAssetUI(); updateShopUI(); 
    if (typeof updateGaugePerfectZone === 'function') updateGaugePerfectZone();
    haptic('success'); SoundManager.playUpgrade();
    document.getElementById('message').innerText = `${t('upgradeSuccess')} (Lv.${upgrades[type]})`;
}

function openInfoModal(e) { e?.preventDefault(); SoundManager.resume(); haptic('light'); document.getElementById('intro-info-modal').style.display = 'flex'; }
function closeInfoModal(e) { e?.preventDefault(); haptic('light'); document.getElementById('intro-info-modal').style.display = 'none'; }
function closeIntroScreen(e) {
    e?.preventDefault(); SoundManager.resume(); haptic('success');
    const el = document.getElementById('intro-screen');
    el.style.opacity = '0';
    setTimeout(() => {
        el.style.display = 'none';
        setAssetBarVisible(true);
        updateAssetUI();
    }, 500);
}

function initDebugParams() { try { const p = new URLSearchParams(window.location.search); window.debug = p.get('debug') === 'true'; window.forceCrit = p.get('forceCrit') === 'true'; window.forceLotto = p.get('forceLotto') === 'true'; } catch (e) { } }

async function initGame() {
    initDebugParams();
    initTMA();
    initTonConnect();
    initLang();
    await loadData();
    applyI18n();
    changeRandomBg();
    drawStaticBackground();
    updateAssetUI();
}
initGame();

document.addEventListener('visibilitychange', () => {
    if (document.hidden) SoundManager.pauseAll(); else SoundManager.resumeAll();
});

// ====== Telegram Invitation System Logic ======
function injectInviteUI() {
    if (document.getElementById('invite-trigger-btn')) return;
    const triggerBtn = document.createElement('button');
    triggerBtn.id = "invite-trigger-btn";
    triggerBtn.innerText = "✉️ 친구 초대";
    triggerBtn.style.cssText = "position: fixed; bottom: 20px; right: 20px; z-index: 1000; background: #0088cc; color: white; border: 2px solid #fff; padding: 12px 18px; border-radius: 30px; font-weight: bold; font-size: 14px; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.3); transition: transform 0.2s;";

    triggerBtn.addEventListener('mouseenter', () => triggerBtn.style.transform = 'scale(1.05)');
    triggerBtn.addEventListener('mouseleave', () => triggerBtn.style.transform = 'scale(1)');

    const modalOverlay = document.createElement('div');
    modalOverlay.id = "invite-modal-overlay";
    modalOverlay.style.cssText = "display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 2000; justify-content: center; align-items: center; font-family: 'GmarketSans', sans-serif;";

    modalOverlay.innerHTML = `
        <div style="background: #222; border: 2px solid #0088cc; border-radius: 15px; padding: 25px; width: 85%; max-width: 360px; text-align: center; box-shadow: 0 5px 15px rgba(0,0,0,0.5); position: relative; color: white;">
            <span id="close-invite-modal" style="position: absolute; top: 10px; right: 15px; font-size: 20px; color: #aaa; cursor: pointer;">&times;</span>
            <h3 style="margin-top: 5px; color: #0088cc; font-size: 18px;">✉️ 친구 초대하고 보너스 받기</h3>
            <p style="font-size: 13px; color: #ccc; margin-bottom: 20px; line-height: 1.4;">친구를 초대하면 XNOT 채굴 동력 버프를 실시간으로 획득합니다!</p>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button id="btn-tg-invite" style="background: #0088cc; color: white; border: none; padding: 12px 16px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 13px; flex: 1;">텔레그램 초대</button>
                <button id="btn-copy-link" style="background: #444; color: white; border: none; padding: 12px 16px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 13px; flex: 1;">링크 복사</button>
            </div>
        </div>
    `;

    document.body.appendChild(triggerBtn);
    document.body.appendChild(modalOverlay);
    setupInviteEventListeners(triggerBtn, modalOverlay);
}

function setupInviteEventListeners(triggerBtn, modalOverlay) {
    const closeBtn = document.getElementById('close-invite-modal');
    const tgInviteBtn = document.getElementById('btn-tg-invite');
    const copyLinkBtn = document.getElementById('btn-copy-link');
    const botUsername = "xnot_skipper_bot";

    if (!closeBtn || !tgInviteBtn || !copyLinkBtn) return;

    triggerBtn.addEventListener('click', () => { modalOverlay.style.display = 'flex'; });
    closeBtn.addEventListener('click', () => { modalOverlay.style.display = 'none'; });
    modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) modalOverlay.style.display = 'none'; });

    function getReferralLink() {
        let userId = '';
        try { userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id; } catch (e) { }
        if (!userId) userId = localStorage.getItem('xnot_user_id') || 'user_' + Date.now();
        if (!localStorage.getItem('xnot_user_id')) localStorage.setItem('xnot_user_id', userId);
        return `https://t.me/${botUsername}?startapp=ref_${userId}`;
    }

    tgInviteBtn.addEventListener('click', () => {
        const refLink = getReferralLink();
        const shareText = encodeURIComponent("🪨 [XNOT 물수제비 채굴] 나랑 같이 돌 튕기고 코인 채굴하자! 지금 들어오면 한정판 조약돌 지급! 🚀");
        window.open(`https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${shareText}`, '_blank');
    });

    copyLinkBtn.addEventListener('click', () => {
        const refLink = getReferralLink();
        navigator.clipboard.writeText(refLink).then(() => {
            spawnDramaticText("초대 링크 복사 완료!", "neon-lime");
        }).catch(() => {
            const textArea = document.createElement("textarea");
            textArea.value = refLink; document.body.appendChild(textArea); textArea.select();
            document.execCommand('copy'); document.body.removeChild(textArea);
            spawnDramaticText("초대 링크 복사 완료!", "neon-lime");
        });
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectInviteUI);
} else {
    injectInviteUI();
}