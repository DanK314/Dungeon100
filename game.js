// ========================== // 캔버스 초기화 // ==========================
const canvas = document.getElementById("Canvas");
const ctx = canvas.getContext("2d");
let SW = window.innerWidth;
let SH = window.innerHeight;
canvas.width = SW;
canvas.height = SH;
window.onresize = function () {
    SW = window.innerWidth;
    SH = window.innerHeight;
    canvas.width = SW;
    canvas.height = SH;
    setupWalls();
};

// ========================== // 기본 클래스 정의 // ==========================
class BoxCollider {
    constructor(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.vx = 0;
        this.vy = 0;
    }
    checkCollision(Box) {
        const r1 = this;
        const r2 = Box;
        return (
            r1.x < r2.x + r2.w &&
            r1.x + r1.w > r2.x &&
            r1.y < r2.y + r2.h &&
            r1.y + r1.h > r2.y
        );
    }
    resolveCollision(otherBox) {
        if (!this.checkCollision(otherBox)) return;
        const overlapX = Math.min(this.x + this.w, otherBox.x + otherBox.w) - Math.max(this.x, otherBox.x);
        const overlapY = Math.min(this.y + this.h, otherBox.y + otherBox.h) - Math.max(this.y, otherBox.y);
        if (overlapX < overlapY) {
            if (this.x < otherBox.x) this.x -= overlapX;
            else this.x += overlapX;
            this.vx = 0;
        } else {
            if (this.y < otherBox.y) this.y -= overlapY;
            else this.y += overlapY;
            this.vy = 0;
        }
    }
}

// ========================== // 플레이어 클래스 // ==========================
class Player extends BoxCollider {
    constructor(x, y, w, h, speed, gun) {
        super(x, y, w, h);
        this.speed = speed;
        this.defspeed = speed;
        this.hp = gun.type === 'knife' ? 25 : 100;
        this.gun = gun;
        this.onGround = false;
        this.isInvulnerable = false;
        this.invulnerabilityTime = 0;
        this.maxJumps = this.gun.type === 'knife' ? 4 : 3;
        this.jumpCount = 0;
        this.jumpLocked = false;
        // 🛑 우클릭 특수 능력 변수 추가
        this.isSpecialInvulnerable = false; // 특수 무적 상태 여부
        this.specialInvulnerabilityTime = 0; // 특수 무적 해제 시간
        this.specialAbilityCooldown = 30000; // 30초 쿨타임 (30000ms)
        this.lastSpecialAbilityTime = 0; // 마지막 사용 시간
    }
    applyGravity(gravity) {
        this.vy += gravity;
        if (this.vy > 15) this.vy = 15;
    }
    // 🛑 우클릭 특수 능력 사용 메서드
    useSpecialAbility() {
        const now = Date.now();
        if (now - this.lastSpecialAbilityTime >= this.specialAbilityCooldown && this.gun.type === 'knife') {
            this.isSpecialInvulnerable = true;
            this.specialInvulnerabilityTime = now + 10000; // 2초 무적
            this.lastSpecialAbilityTime = now;
            this.speed += 5;
            this.hp += this.hp < 20 ? 30 : 0;
            this.gun.damage += 10;
            console.log("Special Ability Used: 1 sec Invulnerability!");
            return true;
        }else if(now - this.lastSpecialAbilityTime >= this.specialAbilityCooldown){
            this.hp += 15;
            this.hp = this.hp > 100 ? 100 : this.hp;
            this.lastSpecialAbilityTime = now;
            return true;
        }
        return false;
    }
    // 🛑 데미지 로직 수정: 특수 무적 상태일 때는 데미지를 입지 않음
    takeDamage(damage) {
        if (this.hp <= 0 || this.isInvulnerable || this.isSpecialInvulnerable) return; // 특수 무적 중일 때도 무시
        this.hp -= damage;
        if (this.hp < 0) this.hp = 0;
        this.isInvulnerable = true; // 기본 피격 무적 시간 (0.3초)
        this.invulnerabilityTime = Date.now() + 300;
        if (this.hp === 0) {
            console.log("Player Died!");
        }
    }
    update(input, walls) {
        if (this.hp <= 0) return;
        // 🛑 특수 무적 상태 해제 확인
        if (this.isSpecialInvulnerable && Date.now() > this.specialInvulnerabilityTime) {
            this.isSpecialInvulnerable = false;
            this.speed = this.defspeed;
            this.gun.damage -= 10;
        }
        // 기본 피격 무적 상태 해제 확인
        if (this.isInvulnerable && Date.now() > this.invulnerabilityTime) {
            this.isInvulnerable = false;
        }
        this.vx = 0;
        if (input["a"] || input["ArrowLeft"]) this.vx = -this.speed;
        if (input["d"] || input["ArrowRight"]) this.vx = this.speed;
        if ((input["w"] || input["ArrowUp"])) {
            if (this.jumpCount < this.maxJumps && !this.jumpLocked) {
                this.vy = -12;
                this.jumpCount++;
                this.jumpLocked = true;
            }
        }
        this.applyGravity(0.6);
        this.x += this.vx;
        this.y += this.vy;
        this.onGround = false;
        for (let w of walls) {
            if (this.checkCollision(w)) {
                this.resolveCollision(w);
                if (this.y + this.h <= w.y + 10) {
                    this.onGround = true;
                    this.jumpCount = 0;
                }
            }
        }
    }
    draw(mouseX, mouseY) {
        const angle = Math.atan2(mouseY - (this.y + this.h / 2), mouseX - (this.x + this.w / 2));
        // 🛑 특수 무적 상태일 때와 기본 무적 상태일 때 모두 깜빡이도록 처리
        const isInvul = this.isInvulnerable || this.isSpecialInvulnerable;
        if (isInvul && Date.now() % 100 < 50) {
            return;
        }
        ctx.fillStyle = "#44aaff";
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.save();
        ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
        ctx.rotate(angle);
        ctx.fillStyle = "black";
        ctx.fillRect(this.w / 2 - 5, -5, this.gun.length, 10);
        ctx.restore();
        ctx.fillStyle = "red";
        ctx.fillRect(this.x, this.y - 10, this.w, 5);
        ctx.fillStyle = "lime";
        ctx.fillRect(this.x, this.y - 10, (this.w * this.hp) / 100, 5);
        // 🛑 쿨타임 시각화
        const now = Date.now();
        const elapsed = now - this.lastSpecialAbilityTime;
        const remainingCooldown = Math.max(0, this.specialAbilityCooldown - elapsed);
        if (remainingCooldown > 0) {
            const ratio = remainingCooldown / this.specialAbilityCooldown;
            ctx.fillStyle = `rgba(255, 0, 0, ${0.5 * ratio})`; // 쿨타임 중 빨간색 오버레이
            ctx.fillRect(this.x, this.y, this.w, this.h);
        } else if (this.isSpecialInvulnerable) {
            ctx.fillStyle = "rgba(0, 255, 255, 0.5)"; // 무적 중 청록색 오버레이
            ctx.fillRect(this.x, this.y, this.w, this.h);
        }
    }
}

// ========================== // 적(Enemy) 클래스 정의 // ==========================
class Enemy extends BoxCollider {
    constructor(x, y, w, h, speed, hp) {
        super(x, y, w, h);
        this.speed = speed;
        this.hp = hp;
        this.baseHp = hp;
        this.onGround = false;
        this.dead = false;
    }
    applyGravity(gravity) {
        this.vy += gravity;
        if (this.vy > 15) this.vy = 15;
    }
    update(player, walls) {
        if (this.dead) return;
        this.vx = 0;
        const center_x = this.x + this.w / 2;
        const player_center_x = player.x + player.w / 2;
        if (center_x < player_center_x) {
            this.vx = this.speed;
        } else if (center_x > player_center_x) {
            this.vx = -this.speed;
        }
        // 🛑 점프 AI 로직: 플레이어보다 아래에 있을 때 점프 시도
        const center_y = this.y + this.h / 2;
        const player_center_y = player.y + player.h / 2;
        if (this.onGround && center_y > player_center_y) {
            this.vy = -15; // 점프 힘
            this.onGround = false;
        }
        this.applyGravity(0.6);
        this.x += this.vx;
        this.y += this.vy;
        this.onGround = false;
        for (let w of walls) {
            if (this.checkCollision(w)) {
                this.resolveCollision(w);
                if (this.y + this.h <= w.y + 10) {
                    this.onGround = true;
                }
            }
        }
    }
    takeDamage(damage) {
        // 플레이어가 정의되어 있지 않은 경우를 대비하여 조건부 추가
        if (!player) return;
        const center_x = this.x + this.w / 2;
        const player_center_x = player.x + player.w / 2;
        this.hp -= damage;
        if (center_x < player_center_x) {
            this.x += -damage * 0.3;
        } else if (center_x > player_center_x) {
            this.x += damage * 0.3;
        }
        if (this.hp <= 0) {
            this.dead = true;
        }
    }
    draw() {
        if (this.dead) return;
        ctx.fillStyle = "red";
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.fillStyle = "black";
        ctx.fillRect(this.x, this.y - 10, this.w, 5);
        ctx.fillStyle = "yellow";
        ctx.fillRect(this.x, this.y - 10, (this.w * this.hp) / this.baseHp, 5);
    }
}

// ========================== // 총, 탄환 클래스 // ==========================
class Gun {
    constructor(bulletSpeed, length, fireRate, damage, type = "revolver") {
        this.bulletSpeed = bulletSpeed;
        this.length = length;
        this.fireRate = fireRate;
        this.lastShot = 0;
        this.damage = damage;
        this.type = type
    }
    canShoot() {
        return Date.now() - this.lastShot >= this.fireRate;
    }
    shoot(x, y, angle, bullets) {
        if (!this.canShoot()) return;
        let life;
        let fw
        this.type === "knife" ? life = 100 : life = 5000;
        this.type === "knife" ? fw = 10 : fw = this.length / 2;
        const bx = x + Math.cos(angle) * 30;
        const by = y + Math.sin(angle) * 30;
        if (this.type === "shotgun") {
            let ba = angle - 0.2;
            const endAngle = angle + 0.2;
            const spreadStep = 0.1; // 산탄총의 발사 각도를 더 넓게 조정
            while (ba < endAngle) {
                bullets.push(new Bullet(bx, by, ba, this.bulletSpeed));
                ba += spreadStep
            }
        } else {
            bullets.push(new Bullet(bx, by, angle, this.bulletSpeed, life, fw));
        }
        this.lastShot = Date.now();
    }
}

class Bullet extends BoxCollider {
    constructor(x, y, angle, speed, life = 5000, forward = 30) {
        super(x, y, 8, 8);
        this.angle = angle;
        this.speed = speed;
        this.life = life;
        this.birth = Date.now();
        this.dead = false;
        this.x += Math.cos(this.angle) * forward;
        this.y += Math.sin(this.angle) * forward;
    }
    update(walls) {
        if (this.dead) return;
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        for (let w of walls) {
            if (this.checkCollision(w)) {
                this.dead = true;
                break;
            }
        }
    }
    draw() {
        if (this.dead) return;
        ctx.fillStyle = "orange";
        ctx.fillRect(this.x, this.y, this.w, this.h);
    }
    isDead() {
        return this.dead || Date.now() - this.birth > this.life;
    }
}

// ========================== // 게임 오브젝트 및 층 변수 // ==========================
let gameState = 'start'; // 🛑 게임 상태 추가: 'start', 'selectGun', 'playing'
let player = null;
const bullets = [];
const enemies = [];
let walls = [];
// 🛑 무기 스펙 정의 추가
const GUN_SPECS = {
    'PISTOL': {
        bulletSpeed: 18,
        length: 60,
        fireRate: 500, // 0.5초 (빠름)
        damage: 15, // 보통
        type: 'revolver',
        name_kr: '권총',
        desc_kr: '데미지와 연사 속도가 그럭저럭 균형잡힌 총입니다.',
    },
    'SNIPER': {
        bulletSpeed: 30,
        length: 150,
        fireRate: 2000, // 3초 (매우 느림)
        damage: 100, // 매우 높음
        type: 'revolver',
        name_kr: '저격소총',
        desc_kr: '높은 데미지를 자랑하지만, 재장전 시간이 매우 깁니다.',
    },
    'SHOTGUN': {
        bulletSpeed: 20,
        length: 100,
        fireRate: 1000, // 1초 (보통)
        damage: 20, // 낮음 (산탄으로 커버)
        type: 'shotgun',
        name_kr: '산탄총',
        desc_kr: '근거리에서 강력한 산탄을 발사합니다. (5발 스프레드)',
    },
    'RAILGUN': {
        bulletSpeed: 20,
        length: 20,
        fireRate: 1, // 0.001초 (레이저)
        damage: 0.3, // 낮음
        type: 'railgun',
        name_kr: '레일건',
        desc_kr: '적을 관통하는 레이저를 쏩니다.',
    },
    'TRAPER': {
        bulletSpeed: 0,
        length: 50,
        fireRate: 1,
        damage: 0.5, // 높음
        type: 'traper',
        name_kr: '지뢰포',
        desc_kr: '고정된 지뢰를 설치합니다.',
    },
    'KNIFE': {
        bulletSpeed: 0,
        length: 50,
        fireRate: 1, // 0.001초 (레이저)
        damage: 10, // 높음
        type: 'knife',
        name_kr: '칼',
        desc_kr: '고수 전용',
    }
};
// --- 타워 게임 변수 ---
const MAX_FLOOR = 100;
let currentFloor = 1;
const ENEMY_BASE_HP = 50;
const ENEMY_BASE_SPEED = 2.0;
// 🛑 적 스폰 관리 변수
let totalEnemiesToSpawn = 0;
let lastSpawnTime = 0;
const SPAWN_INTERVAL = 1000; // 1초 간격

// ========================== // 적 생성 및 층 관리 함수 정의 // ==========================
// 🛑 총기 선택 로직 함수 추가
function selectGun(gunType) {
    const spec = GUN_SPECS[gunType];
    if (!spec) return;
    // Gun 객체 생성
    const newGun = new Gun(spec.bulletSpeed, spec.length, spec.fireRate, spec.damage, spec.type);
    // Player 객체 생성 (초기 위치: 50, 100)
    player = new Player(50, 100, 40, 40, newGun.type === 'knife' ? 7 : 5, newGun);
    // 게임 상태 변경
    gameState = 'playing';
    // 게임 시작 시 적 스폰 설정
    spawnEnemies();
}

function spawnEnemies() {
    enemies.length = 0;
    // 🛑 적을 바로 생성하지 않고, 총 개수만 설정
    totalEnemiesToSpawn = Math.min(5, Math.floor(currentFloor / 10) + 1);
    lastSpawnTime = Date.now();
    // 플레이어 초기 위치 재설정 (다음 층으로 갈 때마다 왼쪽에서 시작)
    if (player) { // player가 생성된 후에만 위치 초기화
        player.x = 50;
        player.y = 100;
        player.vx = 0;
        player.vy = 0;
    }
}

// ... (setupWalls 함수는 동일)
function setupWalls() {
    walls = [
        new BoxCollider(0, SH - 40, SW, 40),
        new BoxCollider(0, 0, SW, 40),
        new BoxCollider(0, 0, 40, SH),
        new BoxCollider(SW - 40, 0, 40, SH),
        new BoxCollider(100, SH - 500, 100, 50),
        new BoxCollider(300, SH - 400, 100, 50),
        new BoxCollider(500, SH - 300, 100, 50),
        new BoxCollider(700, SH - 200, 100, 50),
    ];
}
setupWalls();

// 🛑 시작 화면 그리기 함수 추가
function drawStartScreen() {
    ctx.clearRect(0, 0, SW, SH);
    ctx.fillStyle = "#222";
    ctx.fillRect(0, 0, SW, SH);
    ctx.fillStyle = "white";
    ctx.font = "80px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Dungeon 100", SW / 2, SH / 2 - 100);
    ctx.font = "30px Arial";
    ctx.fillStyle = "lime";
    ctx.fillText("Click to Start", SW / 2, SH / 2 + 50);
}

// 🛑 총기 선택 화면 그리기 함수 추가
function drawGunSelection() {
    ctx.clearRect(0, 0, SW, SH);
    ctx.fillStyle = "#222";
    ctx.fillRect(0, 0, SW, SH);
    ctx.fillStyle = "white";
    ctx.font = "40px Arial";
    ctx.textAlign = "center";
    ctx.fillText("무기를 선택하세요", SW / 2, SH / 2 - 200);
    const gunTypes = ['PISTOL', 'SNIPER', 'SHOTGUN', 'RAILGUN', 'TRAPER', 'KNIFE'];
    const padding = 20; // 패딩 조정
    const numGuns = gunTypes.length; // 6
    const totalPadding = padding * (numGuns + 1);
    const boxWidth = (SW - totalPadding) / numGuns;
    const boxHeight = 250;
    const startX = padding;
    const startY = SH / 2 - boxHeight / 2;
    gunTypes.forEach((type, index) => {
        const spec = GUN_SPECS[type];
        const x = startX + index * (boxWidth + padding);
        const y = startY;
        // Draw Box
        ctx.fillStyle = "#333";
        ctx.fillRect(x, y, boxWidth, boxHeight);
        ctx.strokeStyle = "white";
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, boxWidth, boxHeight);
        // Draw Title
        ctx.fillStyle = "cyan";
        ctx.font = "20px Arial";
        ctx.fillText(spec.name_kr, x + boxWidth / 2, y + 40);
        // Draw Stats
        ctx.fillStyle = "white";
        ctx.font = "14px Arial";
        ctx.textAlign = "left";
        let textY = y + 80;
        // Stats
        let fireRateSec = spec.fireRate / 1000;
        ctx.fillText(`데미지: ${spec.damage}`, x + 20, textY);
        textY += 30;
        ctx.fillText(`연사 속도: ${fireRateSec}초 (${fireRateSec < 1 ? '빠름' : fireRateSec < 2 ? '보통' : '느림'})`, x + 20, textY);
        textY += 30;
        ctx.fillText(`탄환 종류: ${spec.type === 'shotgun' ? '산탄(5발)' : spec.type === 'knife' ? '근접' : '일반탄'}`, x + 20, textY);
        textY += 30;
        // Description
        ctx.font = "8px Arial";
        ctx.fillStyle = "#ccc";
        ctx.textAlign = "center";
        ctx.fillText(spec.desc_kr, x + boxWidth / 2, y + boxHeight - 30);
        // Save the bounds for click detection
        spec.bounds = { x, y, w: boxWidth, h: boxHeight };
    });
}

const input = {};
let mouseX = 0;
let mouseY = 0;
let mouseDown = false;

// ========================== // 입력 이벤트 // ==========================
window.addEventListener("keydown", (e) => (input[e.key] = true));
window.addEventListener("keyup", (e) => {
    if (e.key === "w" || e.key === "ArrowUp") {
        if (player) player.jumpLocked = false; // player가 있을 때만
    }
    input[e.key] = false;
});

canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

// 🛑 마우스 다운 이벤트 (클릭 로직 재구성)
canvas.addEventListener("mousedown", (e) => {
    // 0: 좌클릭, 2: 우클릭
    if (e.button === 0) {
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        if (gameState === 'start') {
            gameState = 'selectGun';
            return;
        }

        if (gameState === 'selectGun') {
            const gunTypes = ['PISTOL', 'SNIPER', 'SHOTGUN', 'RAILGUN', 'TRAPER', 'KNIFE'];
            gunTypes.forEach(type => {
                const spec = GUN_SPECS[type];
                if (spec.bounds) {
                    const b = spec.bounds;
                    if (clickX >= b.x && clickX <= b.x + b.w && clickY >= b.y && clickY <= b.y + b.h) {
                        selectGun(type);
                        return;
                    }
                }
            });
        }

        if (gameState === 'playing' && player) {
            mouseDown = true;
        }
    }
});

canvas.addEventListener("mouseup", (e) => {
    if (e.button === 0) {
        mouseDown = false;
    }
});

// 🛑 마우스 오른쪽 버튼 이벤트 (우클릭: 특수 능력 발동)
canvas.addEventListener("contextmenu", (e) => {
    e.preventDefault(); // 기본 우클릭 메뉴 방지
    if (player && gameState === 'playing') {
        if (player.useSpecialAbility()) {
            // 특수 능력 발동 성공
        } else {
            const remaining = Math.max(0, player.specialAbilityCooldown - (Date.now() - player.lastSpecialAbilityTime));
            console.log(`Special Ability on cooldown. Remaining: ${(remaining / 1000).toFixed(2)}s`);
        }
    }
});

// ========================== // 게임 루프 // ==========================
function gameLoop() {
    ctx.clearRect(0, 0, SW, SH);

    // 🛑 0. 게임 상태에 따른 화면 처리
    if (gameState === 'start') {
        drawStartScreen();
        requestAnimationFrame(gameLoop);
        return;
    }

    if (gameState === 'selectGun') {
        drawGunSelection();
        requestAnimationFrame(gameLoop);
        return;
    }

    // ********* 1. 게임 클리어 상태 확인 및 처리 *********
    if (currentFloor > MAX_FLOOR) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
        ctx.fillRect(0, 0, SW, SH);
        ctx.fillStyle = "gold";
        ctx.font = "60px Arial";
        ctx.textAlign = "center";
        ctx.fillText("✨ TOWER CLEAR! ✨", SW / 2, SH / 2 - 40);
        ctx.font = "30px Arial";
        ctx.fillText(`100층을 모두 정복했습니다!`, SW / 2, SH / 2 + 30);
        return;
    }

    // ********* 2. 게임 오버 상태 확인 및 처리 *********
    if (player.hp <= 0) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, 0, SW, SH);
        ctx.fillStyle = "white";
        ctx.font = "48px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Game Over", SW / 2, SH / 2);
        return;
    }

    // **********************************
    // 3. 플레이어 업데이트
    player.update(input, walls);

    // 4. 발사 (기존 로직 유지)
    if (mouseDown) {
        const angle = Math.atan2(mouseY - (player.y + player.h / 2), mouseX - (player.x + player.w / 2));
        player.gun.shoot(player.x + player.w / 2, player.y + player.h / 2, angle, bullets);
    }

    // 🛑 5. 순차적인 적 스폰 로직
    if (totalEnemiesToSpawn > 0 && Date.now() - lastSpawnTime >= SPAWN_INTERVAL) {
        const enemyHp = ENEMY_BASE_HP + (currentFloor - 1) * 2;
        const enemySpeed = ENEMY_BASE_SPEED + (currentFloor - 1) * 0.05;
        // 오른쪽 벽 근처 (SW - 90)에서 스폰
        enemies.push(new Enemy(SW - 90, 100, 50, 50, enemySpeed, enemyHp));
        totalEnemiesToSpawn--;
        lastSpawnTime = Date.now();
    }

    // 6. 적 업데이트, 충돌 처리
    const ENEMY_TOUCH_DAMAGE = 3;
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        enemy.update(player, walls);
        if (player.checkCollision(enemy)) {
            player.takeDamage(ENEMY_TOUCH_DAMAGE);
        }
        for (let j = bullets.length - 1; j >= 0; j--) {
            const bullet = bullets[j];
            if ((!bullet.dead && bullet.checkCollision(enemy))) {
                enemy.takeDamage(player.gun.damage);
                if (!(player.gun.type === "railgun")) {
                    bullet.dead = true;
                }
                break;
            }
        }
        if (enemy.dead) {
            enemies.splice(i, 1);
        }
    }

    // --- 층 클리어 확인 로직: 모든 적이 처치되었고, 스폰할 적이 더 없을 때 ---
    if (enemies.length === 0 && totalEnemiesToSpawn === 0) {
        if (currentFloor < MAX_FLOOR) {
            currentFloor++;
            spawnEnemies();
        } else if (currentFloor === MAX_FLOOR) {
            currentFloor++;
        }
    }

    // ----------------------------
    // 7. 총알 업데이트
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].update(walls);
        if (bullets[i].isDead()) {
            bullets.splice(i, 1);
        }
    }

    // 8. 그리기
    ctx.fillStyle = "#444";
    walls.forEach((w) => ctx.fillRect(w.x, w.y, w.w, w.h));
    ctx.fillStyle = "white";
    ctx.font = "24px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`Floor: ${currentFloor} / ${MAX_FLOOR}`, 50, 30);
    // 🛑 쿨타임 정보 표시 로직
    const remainingCooldown = Math.max(0, player.specialAbilityCooldown - (Date.now() - player.lastSpecialAbilityTime));
    const cooldownText = remainingCooldown > 0 ? `쿨타임: ${(remainingCooldown / 1000).toFixed(1)}s` : (player.isSpecialInvulnerable ? `무적 (1.0s)` : `스킬: 준비 완료(우클릭으로 사용)`);
    ctx.fillStyle = remainingCooldown > 0 ? "red" : "lime";
    ctx.fillText(cooldownText, SW - 500, 30);
    player.draw(mouseX, mouseY);
    enemies.forEach((e) => e.draw());
    bullets.forEach((b) => b.draw());
    requestAnimationFrame(gameLoop);
}

gameLoop();
