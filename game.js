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
        this.hp = gun.type === "knife" ? 25 : 100;
        this.gun = gun;
        this.onGround = false;
        this.isInvulnerable = false;
        this.invulnerabilityTime = 0;
        this.maxJumps = this.gun.type === "knife" ? 4 : 3;
        this.jumpCount = 0;
        this.jumpLocked = false;
        this.isSpecialInvulnerable = false;
        this.specialInvulnerabilityTime = 0;
        this.specialAbilityCooldown = 20000;
        this.lastSpecialAbilityTime = 0;
    }
    applyGravity(gravity) {
        this.vy += gravity;
        if (this.vy > 15) this.vy = 15;
    }
    useSpecialAbility() {
        const now = Date.now();
        // 🛑 [수정] 쿨타임 체크를 맨 위로 이동
        if (now - this.lastSpecialAbilityTime < this.specialAbilityCooldown) {
            const remaining = Math.max(
                0,
                this.specialAbilityCooldown - (Date.now() - this.lastSpecialAbilityTime)
            );
            console.log(
                `Special Ability on cooldown. Remaining: ${(remaining / 1000).toFixed(
                    2
                )}s`
            );
            return false;
        }
        if (this.gun.type === "knife") {
            this.isSpecialInvulnerable = true;
            const invulDuration = 10000;
            this.specialInvulnerabilityTime = now + invulDuration;
            this.lastSpecialAbilityTime = now;
            this.speed += 5;
            this.hp += this.hp < 20 ? 30 : 0;
            this.gun.damage += 10;
            console.log(
                `Special Ability Used: ${invulDuration / 1000
                } sec Invulnerability, Speed+5, Damage+10!`
            );
            return true;
        } else if (this.gun.type === "traper") {
            const healAmount = 50;
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
            // 🛑 [추가] 샷건 스킬 로직
        } else if (this.gun.type === "shotgun") {
            const healAmount = 30;
            this.hp += healAmount;
            this.hp = this.hp > 100 ? 100 : this.hp;
            this.gun.SpecialAbility = true; // Gun 클래스의 플래그 활성화
            this.lastSpecialAbilityTime = now;
            setTimeout(() => {
                this.gun.SpecialAbility = false; // 10초 뒤 비활성화
            }, 10000);
            console.log(`Special Ability Used: Shotgun spread doubled for 10 sec!`);
            return true;
        } else if (this.gun.type === "rocket") {
            const healAmount = 30;
            this.hp += healAmount;
            this.hp = this.hp > 100 ? 100 : this.hp;
            const FireRateMultiplier = 0.1;
            this.gun.fireRate *= FireRateMultiplier;
            this.lastSpecialAbilityTime = now;
            TickFreeze = true;
            this.speed = 10; // 🛑 [수정] 시간 멈춤 시 속도 증가
            setTimeout(() => {
                this.gun.fireRate /= FireRateMultiplier;
                TickFreeze = false;
                this.speed = this.defspeed; // 🛑 [수정] 시간 멈춤 해제 시 속도 원복
            }, 5000);
            console.log(`Special Ability Used: Healed +${healAmount} HP.`);
            return true; // 🛑 [수정] return true 추가
        } else if (this.gun.type === "sniper") {
            const healAmount = 70;
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
        } else if (this.gun.type === "revolver") {
            const healAmount = 50;
            this.hp += healAmount;
            this.hp = this.hp > 100 ? 100 : this.hp;
            this.lastSpecialAbilityTime = now;
            const angle = Math.atan2(
                mouseY - (this.y + this.h / 2),
                mouseX - (this.x + this.w / 2)
            );
            // 🛑 [수정] "player" owner 추가
            bullets.push(
                new Bullet(this.x, this.y, angle, 15, 30, 10000, 0, "bomb", "player")
            );
            console.log(`Special Ability Used: Healed +${healAmount} HP.`);
            return true;
        } else if (this.gun.type === "boomerang") {
            const healAmount = 40;
            this.hp += healAmount;
            this.hp = this.hp > 100 ? 100 : this.hp;
            this.gun.SpecialAbility = true; // Gun 클래스의 플래그 활성화
            this.lastSpecialAbilityTime = now;
            setTimeout(() => {
                this.gun.SpecialAbility = false; // 10초 뒤 비활성화
            }, 10000);
            console.log(`Special Ability Used: boomerang count doubled for 10 sec!`);
            return true;
        } else if (this.gun.type === "railgun") {
            const healAmount = 50;
            this.hp += healAmount;
            this.hp = this.hp > 100 ? 100 : this.hp;
            this.lastSpecialAbilityTime = now;
            const angle = Math.atan2(
                mouseY - (this.y + this.h / 2),
                mouseX - (this.x + this.w / 2)
            );
            // 🛑 [수정] player -> this
            for (let i = -2; i <= 100; i++) {
                setTimeout(() => {
                    // 🛑 [수정] "player" owner 추가
                    bullets.push(
                        new Bullet(this.x, this.y, angle, 50, 50, 100, 50, "deathray", "player")
                    );
                }, i * 5);
            }
            console.log(`Special Ability Used: Healed +${healAmount} HP.`);
            return true;
        } else {
            const healAmount = 50;
            this.hp += healAmount;
            this.hp = this.hp > 100 ? 100 : this.hp;
            this.lastSpecialAbilityTime = now;
            console.log(`Special Ability Used: Healed +${healAmount} HP.`);
            return true;
        }
    }
    takeDamage(damage) {
        if (this.hp <= 0 || this.isInvulnerable || this.isSpecialInvulnerable)
            return;
        this.hp -= damage;
        if (this.hp < 0) this.hp = 0;
        this.isInvulnerable = true;
        this.invulnerabilityTime =
            Date.now() + (this.gun.type == "knife" ? 1000 : 300);
        if (this.hp === 0) {
            console.log("Player Died!");
        }
    }
    update(input, walls) {
        if (this.hp <= 0) return;
        if (this.isSpecialInvulnerable && Date.now() > this.specialInvulnerabilityTime) {
            this.isSpecialInvulnerable = false;
            // 🛑 [수정] 칼 스킬 종료 시 스탯 원복 (defspeed 사용)
            if (this.gun.type === "knife") {
                this.speed = this.defspeed;
                this.gun.damage -= 10;
            }
            console.log("Special Ability Ended.");
        }
        if (this.isInvulnerable && Date.now() > this.invulnerabilityTime) {
            this.isInvulnerable = false;
        }
        this.vx = 0;
        if (input["a"] || input["ArrowLeft"]) this.vx = -this.speed;
        if (input["d"] || input["ArrowRight"]) this.vx = this.speed;
        if (input["w"] || input["ArrowUp"]) {
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
                    // 땅에 닿았는지 체크
                    this.onGround = true;
                    this.jumpCount = 0;
                }
            }
        }
    }
    draw(mouseX, mouseY) {
        const angle = Math.atan2(
            mouseY - (this.y + this.h / 2),
            mouseX - (this.x + this.w / 2)
        );
        const isInvul = this.isInvulnerable || this.isSpecialInvulnerable;
        // 무적 시 깜빡임
        if (isInvul && Date.now() % 100 < 50) {
            return;
        }
        ctx.fillStyle = "#44aaff";
        ctx.fillRect(this.x, this.y, this.w, this.h);
        // 총구 그리기
        ctx.save();
        ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
        ctx.rotate(angle);
        ctx.fillStyle = "black";
        ctx.fillRect(this.w / 2 - 5, -5, this.gun.length, 10);
        ctx.restore();
        // 체력바
        ctx.fillStyle = "red";
        ctx.fillRect(this.x, this.y - 10, this.w, 5);
        ctx.fillStyle = "lime";
        ctx.fillRect(this.x, this.y - 10, (this.w * this.hp) / 100, 5); // 🛑 [수정] 최대 체력 100 기준
        // 스킬 쿨타임 또는 활성화 시각 효과
        const now = Date.now();
        const elapsed = now - this.lastSpecialAbilityTime;
        const remainingCooldown = Math.max(
            0,
            this.specialAbilityCooldown - elapsed
        );
        if (remainingCooldown > 0) {
            const ratio = remainingCooldown / this.specialAbilityCooldown;
            ctx.fillStyle = `rgba(255, 0, 0, ${0.5 * ratio})`; // 쿨타임 남은 비율만큼 붉게 표시
            ctx.fillRect(this.x, this.y, this.w, this.h);
        } else if (this.isSpecialInvulnerable) {
            // 칼 무적
            ctx.fillStyle = "rgba(0, 255, 255, 0.5)";
            ctx.fillRect(this.x, this.y, this.w, this.h);
        } else if (this.gun.specialAbility) {
            // 샷건 스킬 활성화
            ctx.fillStyle = "rgba(255, 165, 0, 0.5)"; // 주황색으로 표시
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

        const knockbackMultiplier = isExplosion ? 50 : player.gun.type === "knife" ? 0 : 1;
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
            this.dead = true;
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
// ==========================
// 🛑 슈팅 적(ShootingEnemy) 클래스 (신규 추가)
// ==========================
class ShootingEnemy extends Enemy {
    constructor(x, y, w, h, speed, hp, gun) {
        super(x, y, w, h, speed, hp);
        this.gun = gun;
    }

    // Enemy의 update 메서드를 오버라이드(재정의)합니다.
    update(player, walls, bullets) { // 🛑 bullets 배열을 인자로 받습니다.
        if (this.dead) return;

        // 1. Enemy의 움직임 및 중력 로직 (일부 수정)
        this.vx = 0;
        const center_x = this.x + this.w / 2;
        const player_center_x = player.x + player.w / 2;
        const dist_x = Math.abs(center_x - player_center_x);

        // 🛑 수정: 플레이어와 일정 거리(예: 300px)를 유지
        const maintainDistance = 300;
        if (dist_x > maintainDistance + 50) { // 너무 멀면 접근
            if (center_x < player_center_x) this.vx = this.speed;
            else if (center_x > player_center_x) this.vx = -this.speed;
        } else if (dist_x < maintainDistance - 50) { // 너무 가까우면 후퇴
            if (center_x < player_center_x) this.vx = -this.speed * 0.5;
            else if (center_x > player_center_x) this.vx = this.speed * 0.5;
        }

        // Y축 점프 로직 (기존과 동일)
        const center_y = this.y + this.h / 2;
        const player_center_y = player.y + player.h / 2;
        if (this.onGround && center_y > player_center_y - 100) { // 플레이어가 약간 위에 있으면 점프
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

        // 2. 슈팅 로직 추가
        if (this.gun.canShoot() && !TickFreeze) {
            // 플레이어를 향하는 각도 계산
            const angle = Math.atan2(
                (player.y + player.h / 2) - (this.y + this.h / 2),
                (player.x + player.w / 2) - (this.x + this.w / 2)
            );

            // "enemy" 소유자로 총알 발사
            this.gun.shoot(this.x + this.w / 2, this.y + this.h / 2, angle, bullets, "enemy");
        }
    }

    // 🛑 슈팅 적은 총도 그려줍니다.
    draw() {
        super.draw(); // 부모(Enemy)의 draw (몸통, 체력바) 호출
        if (this.dead) return;
        if (!player) return; // 플레이어가 없으면 그리지 않음

        const angle = Math.atan2(
            (player.y + player.h / 2) - (this.y + this.h / 2),
            (player.x + player.w / 2) - (this.x + this.w / 2)
        );

        // 총구 그리기 (플레이어 draw 코드 참고)
        ctx.save();
        ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
        ctx.rotate(angle);
        ctx.fillStyle = "black";
        ctx.fillRect(this.w / 2 - 5, -5, this.gun.length, 10);
        ctx.restore();
    }
}
// ==========================
// 🛑 적 기지 (EnemyBase) 클래스 (신규 추가)
// ==========================
class EnemyBase extends BoxCollider {
    // 🛑 [수정] 생성자에서 HP, 스폰 속도, 스폰 수, 색상을 받도록 변경
    constructor(x, y, w, h, hp, spawnInterval, enemiesToSpawn) {
        super(x, y, w, h);
        this.hp = hp;
        this.baseHp = hp;
        this.spawnInterval = spawnInterval; // 적 스폰 간격 (밀리초)// 기지 색상

        this.dead = false;
        this.lastSpawnTime = 0;
    }

    takeDamage(damage) {
        if (this.dead) return;
        this.hp -= damage;
        if (this.hp <= 0) {
            this.hp = 0;
            this.dead = true;
            console.log("Enemy Base Destroyed!");
            // (참고: 여기에 기지 파괴 시 폭발 효과를 추가할 수 있습니다)
        }
    }

    // 🛑 기지의 메인 로직: 적 스폰
    update(enemies) { // 'enemies' 배열을 외부에서 받아옵니다.
        if (this.dead) return;
        if(!TickFreeze) this.lastSpawnTime ++;
        // 🛑 스폰할 적이 남아있고(0이면 무한), 쿨타임이 지났고, 시간이 멈추지 않았다면
        if (this.lastSpawnTime >= this.spawnInterval && !TickFreeze) {
            this.lastSpawnTime = 0;

            // --- (기존 gameLoop의 적 스폰 로직을 가져옴) ---
            const enemyHp = ENEMY_BASE_HP + (currentFloor - 1) * 1.5;
            const enemySpeed = ENEMY_BASE_SPEED + (currentFloor - 1) * 0.01;

            // 스폰 위치: 기지의 중앙에서 살짝 위
            const spawnX = this.x + this.w / 2;
            const spawnY = this.y + this.h / 2; // 기지보다 살짝 위에서 스폰

            // 🛑 30층 이상이면 슈팅 적 스폰 (밸런스 조절된 버전 사용)
            if (currentFloor >= 30 && Math.random() < 0.5) {
                const enemyGunSpec = GUN_SPECS['ENEMYGUN'];
                const enemyGun = new Gun(enemyGunSpec.bulletSpeed, enemyGunSpec.length, 1500, 5, enemyGunSpec.type);
                enemies.push(new ShootingEnemy(spawnX, 100, 50, 50, enemySpeed * 0.6, enemyHp * 0.3, enemyGun));
            } else {
                enemies.push(new Enemy(spawnX, 100, 50, 50, enemySpeed, enemyHp));
            }
            // --- (스폰 로직 끝) ---
        }
    }

    // 🛑 기지 그리기
    draw() {
        if (this.dead) return;

        const x = this.x;
        const y = this.y;
        const ex = x + this.w;
        const ey = y + this.h;
        const elapsed = this.lastSpawnTime;
        let alpha = elapsed / this.spawnInterval;

        // alpha를 0~1 사이로 고정
        alpha = Math.min(Math.max(alpha, 0), 1);

        const p = 5
        ctx.fillStyle = "#000"
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (this.w / 2), y + p);
        ctx.lineTo(ex, y);
        ctx.lineTo(ex - p, y + (this.h / 2));
        ctx.lineTo(ex, ey);
        ctx.lineTo(x + (this.w / 2), ey - p);
        ctx.lineTo(x, ey);
        ctx.lineTo(x + p, y + (this.h / 2));
        ctx.lineTo(x, y);
        ctx.closePath();
        ctx.stroke();
        ctx.fill();
        ctx.fillStyle = "rgba(255,0,0," + alpha + ")";
        ctx.fillRect(x + p, y + p, this.w - (p * 2), this.h - (p * 2))

        // 기지 체력바
        ctx.fillStyle = "red";
        ctx.fillRect(this.x, this.y - 20, this.w, 10);
        ctx.fillStyle = "lime";
        ctx.fillRect(this.x, this.y - 20, (this.w * this.hp) / this.baseHp, 10);
    }
}
// ========================== // 총 클래스 (수정) // ==========================
class Gun {
    constructor(bulletSpeed, length, fireRate, damage, type = "revolver") {
        this.bulletSpeed = bulletSpeed;
        this.length = length;
        this.fireRate = fireRate;
        this.lastShot = 0;
        this.damage = damage;
        this.type = type;
        this.SpecialAbility = false;
    }
    canShoot() {
        return Date.now() - this.lastShot >= this.fireRate;
    }

    // 🛑 [수정] shoot 메서드에 owner 매개변수 추가 (기본값 "player")
    shoot(x, y, angle, bullets, owner = "player") {
        if (!this.canShoot()) return;
        let life;
        let fw;
        this.type === "knife" ? (life = 10) : (life = 5000);
        this.type === "knife" ? (fw = 10) : (fw = this.length / 2);
        const bx = x + Math.cos(angle) * 30;
        const by = y + Math.sin(angle) * 30;
        if (
            this.type === "shotgun" ||
            (this.type === "boomerang" && this.SpecialAbility)
        ) {
            const a = this.type === "shotgun" ? 0.2 : 0.1;
            let ba = angle - a;
            const endAngle = angle + a;
            const spreadStep =
                this.SpecialAbility && this.type === "shotgun" ? 0.05 : 0.1;
            while (ba < endAngle) {
                // 🛑 [수정] 샷건 총알에 owner 전달
                bullets.push(
                    new Bullet(
                        bx,
                        by,
                        ba,
                        this.bulletSpeed,
                        this.damage,
                        life,
                        fw,
                        this.type,
                        owner // 🛑 owner 전달
                    )
                );
                ba += spreadStep;
            }
        } else {
            // 🛑 [수정] 일반 총알에 owner 전달
            bullets.push(
                new Bullet(
                    bx,
                    by,
                    angle,
                    this.bulletSpeed,
                    this.damage,
                    life,
                    fw,
                    this.type,
                    owner // 🛑 owner 전달
                )
            );
        }
        this.lastShot = Date.now();
    }
}
// ========================== // Bullet 클래스 (수정됨) // ==========================
class Bullet extends BoxCollider {
    // 🛑 [수정] 생성자 맨 뒤에 'owner' 인자 추가
    constructor(
        x,
        y,
        angle,
        speed,
        damage,
        life = 5000,
        forward = 50,
        type = "normal",
        owner = "player" // 🛑 owner 추가
    ) {
        const size =
            type === "rocket" ||
                type === "traper" ||
                type === "boomerang" ||
                type === "bomb"
                ? 20
                : type === "deathray"
                    ? 100
                    : 8;
        super(x, y, size, size);
        this.x -= this.w / 2;
        this.y -= this.h / 2;
        this.angle = angle;
        this.speed = speed + (TickFreeze && type === "rocket" ? 10 : 0);
        this.damage = damage;
        this.baseDamage = damage;
        this.life = life;
        this.birth = 0;
        this.dead = false;
        this.exploded = false;
        this.explosionTimer = 0;
        this.accelTimer = TickFreeze ? 30 : 0;
        this.type = type;
        this.owner = owner; // 🛑 [추가] 총알 소유자 (player 또는 enemy)
        this.returnDamageApplied = false;
        this.x += Math.cos(this.angle) * forward;
        this.y += Math.sin(this.angle) * forward;
        this.centerX = this.x + this.w / 2;
        this.centerY = this.y + this.h / 2;
        this.vy = 0;
    }

    triggerExplosion() {
        if (this.exploded) return;
        this.exploded = true;
        this.explosionTimer = 0;
        this.centerX = this.x + this.w / 2;
        this.centerY = this.y + this.h / 2;
        this.w = 40;
        this.h = 40;
    }

    // 🛑 [수정] update 메서드 시그니처에 bossBases 배열 추가
    update(walls, enemies = [], bossBases = []) {
        this.birth++;
        if (this.dead) return;

        if (this.exploded) {
            this.explosionTimer++;
            if (this.explosionTimer >= 30) {
                this.dead = true;
                return;
            }
            this.w +=
                Math.abs(this.speed) / 3 + 30 / this.explosionTimer + this.damage / 2;
            this.h +=
                Math.abs(this.speed) / 3 + 30 / this.explosionTimer + this.damage / 2;
            this.x = this.centerX - this.w / 2;
            this.y = this.centerY - this.h / 2;
            const yellowPhaseDuration = 15;

            if (this.explosionTimer < yellowPhaseDuration) {
                const ROCKET_DOT_DAMAGE = this.damage;

                // 🛑 [수정] 플레이어 폭발일 때만 데미지
                if (this.owner === "player") {

                    // (기존) 적 데미지
                    for (let e of enemies) {
                        if (this.checkCollision(e)) {
                            e.takeDamage(ROCKET_DOT_DAMAGE, true, this.centerX);
                        }
                    }

                    // 🛑 [추가] 보스 기지 데미지
                    for (let base of bossBases) {
                        if (!base.dead && this.checkCollision(base)) {
                            // 기지는 넉백이 필요 없으므로 takeDamage(damage)만 호출
                            base.takeDamage(ROCKET_DOT_DAMAGE);
                        }
                    }
                }
            }
        } // if (this.exploded) 끝

        let nextX = this.x + Math.cos(this.angle) * this.speed;
        let nextY = this.y + Math.sin(this.angle) * this.speed;
        const testBox = { x: nextX, y: nextY, w: this.w, h: this.h };
        for (let w of walls) {
            if (
                this.checkCollision(w) ||
                (testBox.x < w.x + w.w &&
                    testBox.x + testBox.w > w.x &&
                    testBox.y < w.y + w.h &&
                    testBox.y + testBox.h > w.y)
            ) {
                if (this.type === "rocket" || this.type === "traper" || this.type === "bomb") {
                    this.triggerExplosion();
                } else if (this.type !== "railgun" && this.type !== "deathray") {
                    this.dead = true;
                }
            }
        }

        // ... (화면 밖 경계 충돌 로직) ...
        if (
            nextY + this.h >= SH ||
            nextY <= 0 ||
            nextX <= 0 ||
            nextX + this.w >= SW
        ) {
            if (this.type === "rocket" || this.type === "traper" || this.type === "bomb") {
                this.triggerExplosion();
            } else if (this.type !== "railgun" && this.type !== "deathray") {
                this.dead = true;
            }
        }

        // 이동
        this.x = nextX;
        this.y = nextY;
        if (this.type === "bomb") {
            this.y += this.vy;
            this.vy += 0.1;
        }
        if (this.type === "rocket") {
            this.accelTimer++;
            if (this.accelTimer >= 30) {
                this.speed += 0.5;
            }
        }
        if (this.type === "boomerang") {
            this.speed -= 0.3;
            this.vy += 1;
            if (this.speed <= 0 && !this.returnDamageApplied) {
                this.damage = this.baseDamage * 3;
                this.returnDamageApplied = true;
            }
        }
    }

    draw() {
        if (this.dead) return;
        if (
            this.x + this.w < 0 ||
            this.x > SW ||
            this.y + this.h < 0 ||
            this.y > SH
        ) {
            return;
        }
        if (this.exploded) {
            const fade = 1 - this.explosionTimer / 30;
            ctx.fillStyle = `rgba(255, ${Math.floor(200 * fade)}, 0, ${fade})`;
            ctx.fillRect(this.x, this.y, this.w, this.h);
        } else {
            let color =
                this.type === "rocket" ||
                    this.type === "traper" ||
                    this.type === "deathray"
                    ? "red"
                    : this.type === "bomb"
                        ? "#005500"
                        : "orange";

            if (this.type === "boomerang" && this.returnDamageApplied) {
                color = "cyan";
            }
            if (this.owner === "enemy") {
                color = "magenta";
            }

            ctx.fillStyle = color;
            ctx.fillRect(this.x, this.y, this.w, this.h);
        }
    }

    isDead() {
        return this.dead || this.birth >= this.life;
    }
}
// ========================== // 게임 오브젝트 및 층 변수 // ==========================
let gameState = 'start';
let player = null;
// 🛑 [최적화] const -> let으로 변경 (Filter 적용 위함)
let bullets = [];
let enemies = [];
let walls = [];
let bossBases = [];

// 🛑 무기 스펙 정의 (가독성 수정)
const GUN_SPECS = {
    'PISTOL': {
        name_kr: '권총',
        desc_kr: '가장 기본적인 무기',
        damage: 15,
        fireRate: 500, // 0.5초
        bulletSpeed: 18,
        length: 60,
        type: 'revolver'
    },
    'SNIPER': {
        name_kr: '저격소총',
        desc_kr: '저격에 특화',
        damage: 100,
        fireRate: 2000, // 2초
        bulletSpeed: 30,
        length: 150,
        type: 'sniper'
    },
    'SHOTGUN': {
        name_kr: '산탄총',
        desc_kr: '근접전에 특화',
        damage: 20, // (산탄 1발당 데미지)
        fireRate: 1000, // 1초
        bulletSpeed: 20,
        length: 100,
        type: 'shotgun'
    },
    'RAILGUN': {
        name_kr: '레일건',
        desc_kr: '관통하는 레이저',
        damage: 0.05, // (프레임당 데미지)
        fireRate: 1, // 0.001초 (지속 발사)
        bulletSpeed: 20,
        length: 20,
        type: 'railgun'
    },
    'TRAPER': {
        name_kr: '지뢰포',
        desc_kr: '고정된 지뢰 설치',
        damage: 2, // (프레임당 데미지)
        fireRate: 2000,
        bulletSpeed: 0, // (설치형)
        length: 50,
        type: 'traper'
    },
    'KNIFE': {
        name_kr: '칼',
        desc_kr: '극단적인 공격력, 극단적인 사거리',
        damage: 1, // (프레임당 데미지)
        fireRate: 1, // 0.001초 (지속 발사)
        bulletSpeed: 0, // (근접)
        length: 50,
        type: 'knife'
    },
    'ROCKET': {
        name_kr: '로켓포',
        desc_kr: '시간 정지와 로켓을 이용한 극한의 공격력',
        damage: 5, // (프레임당 지속 데미지)
        fireRate: 3000, // 1.7초
        bulletSpeed: 0,
        length: 50,
        type: 'rocket'
    },
    'BOOMERANG': {
        name_kr: '부메랑',
        desc_kr: '후방부 타격을 사용한 빠른 무기',
        damage: 15,
        fireRate: 800,
        bulletSpeed: 20,
        length: 70,
        type: 'boomerang'
    },
    'ENEMYGUN': {
        name_kr: '적의 총',
        desc_kr: '너가 이걸 보고있다면 난 망했어',
        damage: 3,
        fireRate: 2500,
        bulletSpeed: 15,
        length: 70,
        type: 'ENEMYGUN'
    }
};

const MAX_FLOOR = 100;
let currentFloor = 1;
const ENEMY_BASE_HP = 40;
const ENEMY_BASE_SPEED = 1.7;
let totalEnemiesToSpawn = 0;
let lastSpawnTime = 0;
const SPAWN_INTERVAL = 500;
let TickFreeze = false;
let UsedDebugger = false;

// ========================== // 적 생성 및 층 관리 함수 정의 // ==========================
function selectGun(gunType) {
    const spec = GUN_SPECS[gunType];
    if (!spec) return;
    const newGun = new Gun(spec.bulletSpeed, spec.length, spec.fireRate, spec.damage, spec.type);
    let speed = 5;
    if (spec.type === 'knife') speed = 7;
    if (spec.type === 'traper') speed = 6;
    if (spec.type === 'rocket') speed = 4;
    if (spec.type === 'sniper') speed = 4;
    if (spec.type === 'boomerang') speed = 7;
    if (spec.type === 'railgun') speed = 4;
    player = new Player(50, 100, 40, 40, speed, newGun);
    gameState = 'playing';
    spawnEnemies();
}

// ========================== // 적 생성 함수 (수정됨) // ==========================
function spawnEnemies() {
    enemies.length = 0; // 기존 적 제거
    bossBases.length = 0; // 기존 보스 기지 제거
    totalEnemiesToSpawn = 0; // 일반 스폰 카운트 초기화

    // 플레이어 위치 초기화
    if (player) {
        player.x = 50;
        player.y = 100;
        player.vx = 0;
        player.vy = 0;
    }

    // 보스 스테이지 (50, 100) 로직
    if (currentFloor === 25 || currentFloor === 50 || currentFloor === 75 || currentFloor === 100) {
        let bossHp = currentFloor * 100
        let bossSize = 200; // 커다란 사각형
        let spawnRate = 500; // 5초마다 스폰

        // 🛑 [수정] 중앙 하단 스폰 위치 계산
        // 바닥 y좌표(SH - 40)를 기준으로 기지(bossSize)만큼 위로 올림
        let bossX = (SW / 2) - (bossSize / 2); // 화면 가로 중앙
        let bossY = SH - 40 - bossSize;      // 화면 바닥 플랫폼 바로 위

        bossBases.push(new EnemyBase(
            bossX, // x
            bossY, // y
            bossSize, // w
            bossSize, // h
            bossHp, // hp
            spawnRate
        ));
    }
    // 일반 스테이지 로직
    else {
        totalEnemiesToSpawn = Math.floor(currentFloor / 5) + 1;
        lastSpawnTime = Date.now();
    }
}
function setupWalls() {
    walls = [
        new BoxCollider(0, SH - 40, SW, 40),
        new BoxCollider(0, 0, SW, 40),
        new BoxCollider(0, 0, 40, SH),
        new BoxCollider(SW - 40, 0, 40, SH),
        new BoxCollider(100, SH - 500, 100, 50),
        new BoxCollider(200, SH - 400, 100, 50),
        new BoxCollider(300, SH - 300, 100, 50),
        new BoxCollider(400, SH - 200, 100, 50),
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
        ctx.fillText("탄환 종류:" + bulletType, x + 20, textY);
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

// ========================== // 게임 루프 (수정됨) // ==========================
function gameLoop() {
    ctx.clearRect(0, 0, SW, SH);
    if (TickFreeze) {
        ctx.fillStyle = "rgba(0, 0, 255, 0.2)";
        ctx.fillRect(0, 0, SW, SH);
    }

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

    // 보스 층이 아닐 때만 일반 적을 스폰
    if (currentFloor % 25 !== 0) {
        if (totalEnemiesToSpawn > 0 && Date.now() - lastSpawnTime >= SPAWN_INTERVAL && !TickFreeze) {
            const enemyHp = ENEMY_BASE_HP + (currentFloor - 1) * 1.5;
            const enemySpeed = ENEMY_BASE_SPEED + (currentFloor - 1) * 0.01;

            // 🛑 [수정] 스폰 위치를 오른쪽(SW - 90)으로 고정
            const spawnX = SW - 90;

            // (밸런스 조절된 슈팅 적 스폰 로직)
            if (currentFloor >= 30 && Math.random() < 0.5) {
                const enemyGunSpec = GUN_SPECS['ENEMYGUN'];
                const enemyGun = new Gun(enemyGunSpec.bulletSpeed, enemyGunSpec.length, enemyGunSpec.fireRate, 3, enemyGunSpec.type);
                enemies.push(new ShootingEnemy(spawnX, 100, 50, 50, enemySpeed * 0.4, enemyHp * 0.8, enemyGun));
            } else {
                enemies.push(new Enemy(spawnX, 100, 50, 50, enemySpeed, enemyHp));
            }

            totalEnemiesToSpawn--;
            lastSpawnTime = Date.now();
        }
    }

    if (!TickFreeze) {
        for (let b of bullets) {
            // 🛑 [수정] bullet.update에 bossBases 배열 전달
            b.update(walls, enemies, bossBases);
        }
    }

    const ENEMY_TOUCH_DAMAGE = 1;

    if (!TickFreeze) {
        // 보스 기지 업데이트 (기지에서 적 스폰)
        for (let base of bossBases) {
            base.update(enemies);
        }

        // 1. 적 업데이트 및 플레이어-적 몸통 충돌
        for (let e of enemies) {
            if (e instanceof ShootingEnemy) {
                e.update(player, walls, bullets); // 총 쏘는 적
            } else {
                e.update(player, walls); // 일반 적
            }
            if (player.checkCollision(e)) {
                player.takeDamage(ENEMY_TOUCH_DAMAGE);
            }
        }

        // 2. 총알 충돌 로직 (소유자 기반으로 분리)
        for (let j = bullets.length - 1; j >= 0; j--) {
            const bullet = bullets[j];
            if (bullet.dead || bullet.exploded) continue;

            // 2-1. 플레이어 총알 -> 적 / 기지 충돌
            if (bullet.owner === "player") {
                // 총알 vs 적
                for (let e of enemies) {
                    if (bullet.checkCollision(e)) {
                        if (bullet.type === "rocket" || bullet.type === "traper" || bullet.type === "bomb") {
                            bullet.triggerExplosion();
                        } else {
                            e.takeDamage(bullet.damage);
                            if (bullet.type !== "railgun" && bullet.type !== "deathray") {
                                bullet.dead = true;
                            }
                        }
                        if (bullet.dead || bullet.exploded) break;
                    }
                }

                if (bullet.dead || bullet.exploded) continue;

                // 총알 vs 보스 기지
                for (let base of bossBases) {
                    if (!base.dead && bullet.checkCollision(base)) {
                        if (bullet.type === "rocket" || bullet.type === "traper" || bullet.type === "bomb") {
                            bullet.triggerExplosion();
                        } else {
                            base.takeDamage(bullet.damage);
                            if (bullet.type !== "railgun" && bullet.type !== "deathray") {
                                bullet.dead = true;
                            }
                        }
                        if (bullet.dead || bullet.exploded) break;
                    }
                }
            }
            // 2-2. 적 총알 -> 플레이어 충돌
            else if (bullet.owner === "enemy") {
                if (bullet.checkCollision(player)) {
                    if (bullet.type === "rocket" || bullet.type === "traper" || bullet.type === "bomb") {
                        bullet.triggerExplosion();
                    } else {
                        player.takeDamage(bullet.damage);
                        if (bullet.type !== "railgun" && bullet.type !== "deathray") {
                            bullet.dead = true;
                        }
                    }
                }
            }
        }
    } // End if(!TickFreeze)

    // 죽은 객체 필터링
    bullets = bullets.filter(b => !b.isDead());
    enemies = enemies.filter(e => !e.dead);
    // (죽은 보스 기지 필터링은 층 이동 로직에서 .dead 플래그로 검사하므로 생략 가능)

    // 다음 층 이동 로직 (보스 층 클리어 조건)
    let allBasesDestroyed = bossBases.length > 0 && bossBases.every(base => base.dead);

    if (currentFloor % 25 === 0) {
        // 보스 층: 모든 기지가 파괴되고 + 화면의 모든 적이 없어야 함
        if (allBasesDestroyed && enemies.length === 0) {
            if (currentFloor < MAX_FLOOR) {
                currentFloor++;
                spawnEnemies();
            } else if (currentFloor === MAX_FLOOR) {
                currentFloor++; // 게임 클리어
            }
        }
    } else {
        // 일반 층: 스폰할 적이 없고 + 화면의 모든 적이 없어야 함
        if (totalEnemiesToSpawn === 0 && enemies.length === 0) {
            if (currentFloor < MAX_FLOOR) {
                currentFloor++;
                spawnEnemies();
            } else if (currentFloor === MAX_FLOOR) {
                currentFloor++; // 게임 클리어
            }
        }
    }

    // 그리기 (Draw)
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

    // 보스 기지 그리기
    for (let base of bossBases) {
        base.draw();
    }

    player.draw(mouseX, mouseY);
    enemies.forEach((e) => e.draw());
    bullets.forEach((b) => b.draw());

    requestAnimationFrame(gameLoop);
}
setInterval(() => {
    const startTime = performance.now();

    // 🛑 이 구문이 핵심입니다.
    debugger;

    const endTime = performance.now();

    // (endTime - startTime)이 100ms보다 크면 콘솔이 열린 것으로 간주
    if (endTime - startTime > 100) {
        UsedDebugger = true;
        console.warn("디버거가 감지되었습니다. (UsedDebugger = true)");
    }
}, 1500); // 2000ms = 2초
gameLoop();
