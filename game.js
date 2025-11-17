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
// 🛑 [추가] 풀스크린 요청 함수
function requestGameFullscreen() {
    // 캔버스 자체가 아니라 <html> 페이지 전체를 풀스크린으로 만듭니다.
    const elem = document.documentElement; 
    
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) { // Safari
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { // IE11
        elem.msRequestFullscreen();
    }
}
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
        this.isSpecialInvulnerable = false;
        this.specialInvulnerabilityTime = 0;
        this.specialAbilityCooldown = 30000;
        this.lastSpecialAbilityTime = 0;
    }
    applyGravity(gravity) {
        this.vy += gravity;
        if (this.vy > 15) this.vy = 15;
    }
    useSpecialAbility() {
        const now = Date.now();
        if (now - this.lastSpecialAbilityTime >= this.specialAbilityCooldown && this.gun.type === 'knife') {
            this.isSpecialInvulnerable = true;
            const invulDuration = 10000; 
            this.specialInvulnerabilityTime = now + invulDuration; 
            this.lastSpecialAbilityTime = now;
            this.speed += 5;
            this.hp += this.hp < 20 ? 30 : 0;
            this.gun.damage += 10;
            console.log(`Special Ability Used: ${invulDuration / 1000} sec Invulnerability, Speed+5, Damage+10!`);
            return true;
        } else if (now - this.lastSpecialAbilityTime >= this.specialAbilityCooldown && this.gun.type === 'traper') {
            const healAmount = 30;
            this.hp += healAmount;
            this.hp = this.hp > 100 ? 100 : this.hp;
            const FireRateMultiplier = 0.1;
            this.gun.fireRate *= FireRateMultiplier;
            this.lastSpecialAbilityTime = now;
            setTimeout(() => {
                this.gun.fireRate /= FireRateMultiplier;
            }, 10000);
            console.log(`Special Ability Used: Healed +${healAmount} HP.`);
            return true;
        } else if (now - this.lastSpecialAbilityTime >= this.specialAbilityCooldown && this.gun.type === 'rocket') {
            const healAmount = 20;
            this.hp += healAmount;
            this.hp = this.hp > 100 ? 100 : this.hp;
            const FireRateMultiplier = 0.1;
            this.gun.fireRate *= FireRateMultiplier;
            this.lastSpecialAbilityTime = now;
            setTimeout(() => {
                this.gun.fireRate /= FireRateMultiplier;
            }, 10000);
            console.log(`Special Ability Used: Healed +${healAmount} HP.`);
        }else if (now - this.lastSpecialAbilityTime >= this.specialAbilityCooldown && this.gun.type === 'sniper') {
            const healAmount = 30;
            this.hp += healAmount;
            this.hp = this.hp > 100 ? 100 : this.hp;
            const originalReload = this.gun.fireRate;
            this.gun.fireRate /= 4;
            this.lastSpecialAbilityTime = now;
            setTimeout(() => {
                this.gun.fireRate = originalReload;
            }, 10000);
            this.lastSpecialAbilityTime = now;
            console.log(`Special Ability Used: Healed +${healAmount} HP.`);
            return true;
        }else if(now - this.lastSpecialAbilityTime >= this.specialAbilityCooldown) {
            const healAmount = 20;
            this.hp += healAmount;
            this.hp = this.hp > 100 ? 100 : this.hp;
            this.lastSpecialAbilityTime = now;
            console.log(`Special Ability Used: Healed +${healAmount} HP.`);
            return true;
        }

        return false;
    }
    takeDamage(damage) {
        if (this.hp <= 0 || this.isInvulnerable || this.isSpecialInvulnerable) return;
        this.hp -= damage;
        if (this.hp < 0) this.hp = 0;
        this.isInvulnerable = true;
        this.invulnerabilityTime = Date.now() + (this.gun.type == 'knife' ? 1000 : 300);
        if (this.hp === 0) {
            console.log("Player Died!");
        }
    }
    update(input, walls) {
        if (this.hp <= 0) return;
        if (this.isSpecialInvulnerable && Date.now() > this.specialInvulnerabilityTime) {
            this.isSpecialInvulnerable = false;
            this.speed = this.defspeed; 
            this.gun.damage -= 10;
            console.log("Special Ability Ended.");
        }
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
        const now = Date.now();
        const elapsed = now - this.lastSpecialAbilityTime;
        const remainingCooldown = Math.max(0, this.specialAbilityCooldown - elapsed);
        if (remainingCooldown > 0) {
            const ratio = remainingCooldown / this.specialAbilityCooldown;
            ctx.fillStyle = `rgba(255, 0, 0, ${0.5 * ratio})`;
            ctx.fillRect(this.x, this.y, this.w, this.h);
        } else if (this.isSpecialInvulnerable) {
            ctx.fillStyle = "rgba(0, 255, 255, 0.5)";
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
        const center_y = this.y + this.h / 2;
        const player_center_y = player.y + player.h / 2;
        if (this.onGround && center_y > player_center_y) {
            this.vy = -15;
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
    
    takeDamage(damage, isExplosion = false, explosionCenterX = null) { 
        if (!player) return;

        const enemyCenterX = this.x + this.w / 2;
        let referenceX;

        if (isExplosion) {
            referenceX = explosionCenterX; 
        } else {
            referenceX = player.x + player.w / 2; 
        }
        
        const knockbackMultiplier = isExplosion ? 50 : 1; 
        const knockbackForce = damage * 0.1 * knockbackMultiplier; 

        this.hp -= damage;

        if (enemyCenterX < referenceX) {
            this.x -= knockbackForce; 
        } else if (enemyCenterX > referenceX) {
            this.x += knockbackForce; 
        }

        if (this.hp <= 0) {
            this.dead = true;
        }
    }
    
    draw() {
        if (this.dead) return;

        // 🛑 [최적화] Culling: 화면 밖에 있으면 그리지 않음
        if (this.x + this.w < 0 || this.x > SW || this.y + this.h < 0 || this.y > SH) {
            return;
        }

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
            const spreadStep = 0.1; 
            while (ba < endAngle) {
                // 🛑 [수정] 샷건 총알에도 데미지, life, fw, type 전달
                bullets.push(new Bullet(bx, by, ba, this.bulletSpeed, this.damage, life, fw, this.type));
                ba += spreadStep
            }
        } else {
            // 🛑 [수정] 총알 생성자에 this.damage 전달 (새로운 5번째 인자)
            bullets.push(new Bullet(bx, by, angle, this.bulletSpeed, this.damage, life, fw, this.type));
        }
        this.lastShot = Date.now();
    }
}

// ========================== // Bullet 클래스 (지속 데미지 로켓) // ==========================
class Bullet extends BoxCollider {
    // 🛑 [수정] 생성자에 'damage' 인자 추가
    constructor(x, y, angle, speed, damage, life = 5000, forward = 50, type = "normal") {
        const size = (type === "rocket" || type === "traper" || type === "boomerang") ? 20 : 8;
        super(x, y, size, size);
        this.x -= this.w / 2;
        this.y -= this.h / 2;
        this.angle = angle;
        this.speed = speed;
        this.damage = damage;         // 🛑 [추가] 총알의 현재 데미지
        this.baseDamage = damage;   // 🛑 [추가] 총알의 기본 데미지 (부메랑용)
        this.life = life;
        this.birth = Date.now();
        this.dead = false;
        this.exploded = false;
        this.explosionTimer = 0;
        this.accelTimer = 0;
        this.type = type;
        this.returnDamageApplied = false; // 🛑 [추가] 부메랑 데미지 증가 플래그

        this.x += Math.cos(this.angle) * forward;
        this.y += Math.sin(this.angle) * forward;

        this.centerX = this.x + this.w / 2;
        this.centerY = this.y + this.h / 2;
    }
    
    triggerExplosion() { 
        // ... (이 메서드는 수정 없음)
        if (this.exploded) return;
        this.exploded = true;
        this.explosionTimer = 0;
        this.centerX = this.x + this.w / 2;
        this.centerY = this.y + this.h / 2;
        this.w = 40;
        this.h = 40;
    }

    update(walls, enemies = []) { 
        // ... (상단 폭발 로직은 수정 없음)
        if (this.dead) return;

        if (this.exploded) {
            this.explosionTimer++;
            
            if (this.explosionTimer >= 30) {
                this.dead = true;
                return;
            }

            this.w += (Math.abs(this.speed) / 3) + (30 / this.explosionTimer);
            this.h += (Math.abs(this.speed) / 3) + (30 / this.explosionTimer);
            this.x = this.centerX - this.w / 2;
            this.y = this.centerY - this.h / 2;

            const yellowPhaseDuration = 15; 
            if (this.explosionTimer < yellowPhaseDuration) {
                
                // 🛑 [수정] player.gun.damage 대신 this.damage 사용
                const ROCKET_DOT_DAMAGE = this.damage; 
                for (let e of enemies) {
                    if (this.checkCollision(e)) {
                        e.takeDamage(ROCKET_DOT_DAMAGE, true, this.centerX);
                    }
                }
            }
            return;
        }
        
        // ... (벽, 적, 화면 경계 충돌 로직은 수정 없음)
        const nextX = this.x + Math.cos(this.angle) * this.speed;
        const nextY = this.y + Math.sin(this.angle) * this.speed;
        const testBox = { x: nextX, y: nextY, w: this.w, h: this.h };

        for (let w of walls) {
            if (
                this.checkCollision(w) ||
                (testBox.x < w.x + w.w &&
                    testBox.x + testBox.w > w.x &&
                    testBox.y < w.y + w.h &&
                    testBox.y + testBox.h > w.y)
            ) {
                if (this.type === "rocket" || this.type === "traper") {
                    this.triggerExplosion();
                } else {
                    this.dead = true;
                }
                return;
            }
        }

        for (let e of enemies) {
            if (this.checkCollision(e)) {
                if (this.type === "rocket" || this.type === "traper") {
                    this.triggerExplosion();
                    return;
                } else if (this.type !== "railgun") {
                    this.dead = true;
                    return;
                }
            }
        }

        if (nextY + this.h >= SH || nextY <= 0 || nextX <= 0 || nextX + this.w >= SW) {
            if (this.type === "rocket" || this.type === "traper") {
                this.triggerExplosion();
            } else {
                this.dead = true;
            }
            return;
        }

        // 이동
        this.x = nextX;
        this.y = nextY;
        if(this.type === "rocket") {
            this.accelTimer ++;
            if(this.accelTimer >= 30) {
                this.speed += 0.5;
            }
        }

        // 🛑 [수정] 부메랑 데미지 증가 로직
        if(this.type === "boomerang") {
            this.speed -= 0.3;
            this.vy += 1; // (기존 로직 유지)
            
            // speed가 0보다 작아지고(돌아올 때), 아직 데미지 증가가 적용되지 않았다면
            if(this.speed <= 0 && !this.returnDamageApplied) {
                this.damage = this.baseDamage * 3; // 데미지를 3배로 증가 (혹은 this.damage += 15 등으로 수정 가능)
                this.returnDamageApplied = true; // 플래그 설정 (증가가 한 번만 일어나도록)
            }
        }
    }

    draw() {
        // ... (이 메서드는 수정 없음)
        if (this.dead) return;
        
        if (this.x + this.w < 0 || this.x > SW || this.y + this.h < 0 || this.y > SH) {
            return;
        }
        
        if (this.exploded) {
            const fade = 1 - this.explosionTimer / 30;
            ctx.fillStyle = `rgba(255, ${Math.floor(200 * fade)}, 0, ${fade})`; 
            ctx.fillRect(this.x, this.y, this.w, this.h);
        } else {
            // 🛑 [수정] 부메랑이 돌아올 때 색상 변경 (선택 사항)
            let color = (this.type === "rocket" || this.type === "traper") ? "red" : "orange";
            if (this.type === "boomerang" && this.returnDamageApplied) {
                color = "cyan"; // 돌아올 때 색상을 하늘색으로
            }
            ctx.fillStyle = color;
            ctx.fillRect(this.x, this.y, this.w, this.h);
        }
    }

    isDead() {
        return this.dead || (Date.now() - this.birth > this.life);
    }
}


// ========================== // 게임 오브젝트 및 층 변수 // ==========================
let gameState = 'start'; 
let player = null;
// 🛑 [최적화] const -> let으로 변경 (Filter 적용 위함)
let bullets = [];
let enemies = [];
let walls = [];

// 🛑 무기 스펙 정의 (가독성 수정)
const GUN_SPECS = {
    'PISTOL': {
        name_kr: '권총',
        desc_kr: '데미지와 연사 속도가 그럭저럭 균형잡힌 총입니다.',
        damage: 15,
        fireRate: 500, // 0.5초
        bulletSpeed: 18,
        length: 60,
        type: 'revolver'
    },
    'SNIPER': {
        name_kr: '저격소총',
        desc_kr: '높은 데미지를 자랑하지만, 재장전 시간이 매우 깁니다.',
        damage: 100,
        fireRate: 2000, // 2초
        bulletSpeed: 30,
        length: 150,
        type: 'sniper'
    },
    'SHOTGUN': {
        name_kr: '산탄총',
        desc_kr: '근거리에서 강력한 산탄을 발사합니다. (5발 스프레드)',
        damage: 20, // (산탄 1발당 데미지)
        fireRate: 1000, // 1초
        bulletSpeed: 20,
        length: 100,
        type: 'shotgun'
    },
    'RAILGUN': {
        name_kr: '레일건',
        desc_kr: '적을 관통하는 레이저를 쏩니다.',
        damage: 0.05, // (프레임당 데미지)
        fireRate: 1, // 0.001초 (지속 발사)
        bulletSpeed: 20,
        length: 20,
        type: 'railgun'
    },
    'TRAPER': {
        name_kr: '지뢰포',
        desc_kr: '고정된 지뢰를 설치합니다.',
        damage: 2, // (프레임당 데미지)
        fireRate: 2000,
        bulletSpeed: 0, // (설치형)
        length: 50,
        type: 'traper'
    },
    'KNIFE': {
        name_kr: '칼',
        desc_kr: '고수 전용',
        damage: 10, // (프레임당 데미지)
        fireRate: 1, // 0.001초 (지속 발사)
        bulletSpeed: 0, // (근접)
        length: 50,
        type: 'knife'
    },
    'ROCKET': {
        name_kr: '로켓포',
        desc_kr: '터져요~~',
        damage: 5, // (프레임당 지속 데미지)
        fireRate: 3000, // 1.7초
        bulletSpeed: 0,
        length: 50,
        type: 'rocket'
    },
    'BOOMERANG': {
        name_kr: '부메랑',
        desc_kr: '되돌아오는 부메랑입니다.',
        damage: 15,
        fireRate: 800,
        bulletSpeed: 20,
        length: 70,
        type: 'boomerang'
    }
};

const MAX_FLOOR = 100;
let currentFloor = 1;
const ENEMY_BASE_HP = 40;
const ENEMY_BASE_SPEED = 1.7;
let totalEnemiesToSpawn = 0;
let lastSpawnTime = 0;
const SPAWN_INTERVAL = 500; 

// ========================== // 적 생성 및 층 관리 함수 정의 // ==========================
function selectGun(gunType) {
    const spec = GUN_SPECS[gunType];
    if (!spec) return;
    const newGun = new Gun(spec.bulletSpeed, spec.length, spec.fireRate, spec.damage, spec.type);
    player = new Player(50, 100, 40, 40, (newGun.type === 'knife' || newGun.type === 'boomerang') ? 7 : newGun.type === 'traper' ?  6 : 5, newGun);
    gameState = 'playing';
    spawnEnemies();
}

function spawnEnemies() {
    enemies.length = 0;
    totalEnemiesToSpawn = Math.min(5, Math.floor(currentFloor / 5) + 1);
    lastSpawnTime = Date.now();
    if (player) { 
        player.x = 50;
        player.y = 100;
        player.vx = 0;
        player.vy = 0;
    }
}

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

// (drawStartScreen, drawGunSelection 함수는 동일하게 유지)
function drawStartScreen() {
    ctx.clearRect(0, 0, SW, SH);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, SW, SH);
    ctx.fillStyle = "white";
    ctx.font = "80px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Dungeon 100", SW / 2, SH / 2 - 100);
    ctx.font = "30px Arial";
    ctx.fillStyle = "lime";
    ctx.fillText("Click to Start", SW / 2, SH / 2 + 50);
}
function drawGunSelection() {
    ctx.clearRect(0, 0, SW, SH);
    ctx.fillStyle = "#555";
    ctx.fillRect(0, 0, SW, SH);
    ctx.fillStyle = "white";
    ctx.font = "40px Arial";
    ctx.textAlign = "center";
    ctx.fillText("무기를 선택하세요", SW / 2, SH / 2 - 200);
    const gunTypes = ['PISTOL', 'SNIPER', 'SHOTGUN', 'RAILGUN', 'TRAPER', 'KNIFE', 'ROCKET', 'BOOMERANG'];
    const padding = 20; 
    const numGuns = gunTypes.length; 
    const totalPadding = padding * (numGuns + 1);
    const boxWidth = (SW - totalPadding) / numGuns;
    const boxHeight = 250;
    const startX = padding;
    const startY = SH / 2 - boxHeight / 2;
    gunTypes.forEach((type, index) => {
        const spec = GUN_SPECS[type];
        const x = startX + index * (boxWidth + padding);
        const y = startY;
        ctx.fillStyle = "#0F0F0F";
        ctx.fillRect(x, y, boxWidth, boxHeight);
        switch (spec.type) {
            case "rocket":
                ctx.strokeStyle = "#FF0000";
                break;
            case "traper":
                ctx.strokeStyle = "#FFEE00";
                break;
            case "knife":
                ctx.strokeStyle = "#00EEFF";
                break;
            default:
                ctx.strokeStyle = "#FFFFFF";
                break;
        }
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, boxWidth, boxHeight);
        ctx.fillStyle = "cyan";
        ctx.font = "20px Arial";
        ctx.fillText(spec.name_kr, x + boxWidth / 2, y + 40);
        ctx.fillStyle = "white";
        ctx.font = "14px Arial";
        ctx.textAlign = "left";
        let textY = y + 80;
        let fireRateSec = spec.fireRate / 1000;
        ctx.fillText(`데미지: ${spec.damage}`, x + 20, textY);
        textY += 30;
        ctx.fillText(`연사 속도: ${fireRateSec}초 (${fireRateSec < 1 ? '빠름' : fireRateSec < 2 ? '보통' : '느림'})`, x + 20, textY);
        textY += 30;
        let bulletType;
        switch (spec.type) {
            case "rocket":
                bulletType = "로켓";
                break;
            case "traper":
                bulletType = "지뢰";
                break;
            case "knife":
                bulletType = "근접";
                break;
            case "shotgun":
                bulletType = "산탄";
                break;
            case "railgun":
                bulletType = "관통 레이저";
                break;
            default:
                bulletType = "일반 탄환";
                break;
        }
        ctx.fillText("탄환 종류:"+bulletType, x + 20, textY);
        textY += 30;
        ctx.font = "8px Arial";
        ctx.fillStyle = "#ccc";
        ctx.textAlign = "center";
        ctx.fillText(spec.desc_kr, x + boxWidth / 2, y + boxHeight - 30);
        spec.bounds = { x, y, w: boxWidth, h: boxHeight };
    });
}


const input = {};
let mouseX = 0;
let mouseY = 0;
let mouseDown = false;

// (입력 이벤트 리스너는 동일하게 유지)
window.addEventListener("keydown", (e) => (input[e.key] = true));
window.addEventListener("keyup", (e) => {
    if (e.key === "w" || e.key === "ArrowUp") {
        if (player) player.jumpLocked = false; 
    }
    input[e.key] = false;
});
canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});
canvas.addEventListener("mousedown", (e) => {
    if (e.button === 0) {
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        if (gameState === 'start') {
            gameState = 'selectGun';
            requestGameFullscreen();
            return;
        }
        if (gameState === 'selectGun') {
            const gunTypes = ['PISTOL', 'SNIPER', 'SHOTGUN', 'RAILGUN', 'TRAPER', 'KNIFE', 'ROCKET', 'BOOMERANG'];
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
canvas.addEventListener("contextmenu", (e) => {
    e.preventDefault(); 
    if (player && gameState === 'playing') {
        if (player.useSpecialAbility()) {
        } else {
            const remaining = Math.max(0, player.specialAbilityCooldown - (Date.now() - player.lastSpecialAbilityTime));
            console.log(`Special Ability on cooldown. Remaining: ${(remaining / 1000).toFixed(2)}s`);
        }
    }
});

// ========================== // 게임 루프 (최적화 적용) // ==========================
function gameLoop() {
    // ... (게임 루프 상단은 수정 없음)
    ctx.clearRect(0, 0, SW, SH);

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

    if (currentFloor > MAX_FLOOR) {
        ctx.clearRect(0, 0, SW, SH);
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, SW, SH);
        ctx.fillStyle = "white";
        ctx.font = "80px Arial";
        ctx.textAlign = "center";
        ctx.fillText("클리어!", SW / 2, SH / 2 - 100);
        ctx.font = "30px Arial";
        ctx.fillStyle = "#0000FF";
        ctx.fillText("100층을 통과하셨습니다~", SW / 2, SH / 2 + 50);
        return;
    }
    if (player.hp <= 0) {
        ctx.clearRect(0, 0, SW, SH);
        ctx.fillStyle = "#FFF";
        ctx.fillRect(0, 0, SW, SH);
        ctx.fillStyle = "#000";
        ctx.font = "80px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Game Over", SW / 2, SH / 2 - 100);
        ctx.font = "30px Arial";
        ctx.fillText("" + currentFloor + "'s floor", SW / 2, SH / 2 + 50);
        return;
    }

    player.update(input, walls);

    if (mouseDown) {
        const angle = Math.atan2(mouseY - (player.y + player.h / 2), mouseX - (player.x + player.w / 2));
        player.gun.shoot(player.x + player.w / 2, player.y + player.h / 2, angle, bullets);
    }

    if (totalEnemiesToSpawn > 0 && Date.now() - lastSpawnTime >= SPAWN_INTERVAL) {
        // ... (적 스폰)
        const enemyHp = ENEMY_BASE_HP + (currentFloor - 1) * 1.5;
        const enemySpeed = ENEMY_BASE_SPEED + (currentFloor - 1) * 0.01;
        enemies.push(new Enemy(SW - 90, 100, 50, 50, enemySpeed, enemyHp));
        totalEnemiesToSpawn--;
        lastSpawnTime = Date.now();
    }
    
    for (let b of bullets) {
        b.update(walls, enemies); 
    }

    const ENEMY_TOUCH_DAMAGE = 3;
    for (let e of enemies) {
        e.update(player, walls);
        
        if (player.checkCollision(e)) {
            player.takeDamage(ENEMY_TOUCH_DAMAGE);
        }
        
        for (let j = bullets.length - 1; j >= 0; j--) {
            const bullet = bullets[j];
            if (bullet.dead || bullet.exploded) continue; 
            
            if (bullet.checkCollision(e)) {
                if (bullet.type !== "rocket" && bullet.type !== "traper") {
                    // 🛑 [수정] player.gun.damage 대신 bullet.damage 사용
                    e.takeDamage(bullet.damage);
                    if (bullet.type !== "railgun") {
                        bullet.dead = true;
                    }
                    if(bullet.dead) break;
                }
            }
        }
    }

    // ... (죽은 객체 필터링 및 그리기 로직은 수정 없음)
    bullets = bullets.filter(b => !b.isDead());
    enemies = enemies.filter(e => !e.dead);

    if (enemies.length === 0 && totalEnemiesToSpawn === 0) {
        if (currentFloor < MAX_FLOOR) {
            currentFloor++;
            spawnEnemies();
        } else if (currentFloor === MAX_FLOOR) {
            currentFloor++;
        }
    }

    ctx.fillStyle = "#444";
    walls.forEach((w) => {
        if (w.x + w.w >= 0 && w.x <= SW && w.y + w.h >= 0 && w.y <= SH) {
            ctx.fillRect(w.x, w.y, w.w, w.h);
        }
    });

    ctx.fillStyle = "white";
    ctx.font = "24px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`Floor: ${currentFloor} / ${MAX_FLOOR}`, 50, 30);
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
