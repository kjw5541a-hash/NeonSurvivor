import { Projectile } from './Projectile.js';

// 무기 기본 부모 클래스
export class Weapon {
  constructor(name, icon, maxLevel = 5) {
    this.name = name;
    this.icon = icon;
    this.level = 1;
    this.maxLevel = maxLevel;
    
    this.cooldown = 60; 
    this.cooldownTimer = 0;
    this.isEvolved = false; 
  }

  update(player, enemies, projectiles, particles, engine) {
    if (this.cooldownTimer > 0) {
      this.cooldownTimer--;
    }
  }

  getUpgradeDesc() {
    return "무기가 강화됩니다.";
  }

  levelUp() {
    if (this.level < this.maxLevel) {
      this.level++;
      this.onLevelUp();
    }
  }

  onLevelUp() {}
}

/* ==========================================
   1. 기본 무기 및 일반 스킬 9종
   ========================================== */

// 1.1 기본 무기 (스타터 무기, 업그레이드 불가, 가장 가까운 적 단발 사격)
export class StarterWeapon extends Weapon {
  constructor() {
    super('기본 무기', '🔫', 1);
    this.cooldown = 45; // 연사속도 매직 미사일과 일치
    this.damage = 8;
    this.projectileSpeed = 7;
    this.radius = 5.5;
  }

  update(player, enemies, projectiles, particles, engine) {
    super.update(player, enemies, projectiles, particles, engine);
    if (this.cooldownTimer <= 0 && enemies.length > 0) {
      this.fire(player, enemies, projectiles);
      this.cooldownTimer = this.cooldown;
    }
  }

  fire(player, enemies, projectiles) {
    let closestEnemy = this.getClosestEnemy(player, enemies);
    if (!closestEnemy) return;

    // 공격 모션 호출
    player.triggerAttack();

    const angle = Math.atan2(closestEnemy.y - player.y, closestEnemy.x - player.x);
    const totalDamage = this.damage * player.might;

    projectiles.push(
      new Projectile(player.x, player.y, angle, this.projectileSpeed, totalDamage, this.radius, '#ffffff')
    );
  }

  getClosestEnemy(player, enemies) {
    let closest = null;
    let minDist = Infinity;
    for (let enemy of enemies) {
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        minDist = dist;
        closest = enemy;
      }
    }
    return closest;
  }

  getUpgradeDesc() {
    return "시작 시 지급되는 기본 호신용 무기입니다. (강화 불가)";
  }
}

// 1.2 매직 미사일 (유도탄, 레벨업 시 개수 및 위력 상승)
export class MagicMissile extends Weapon {
  constructor() {
    super('매직 미사일', '🔮');
    this.cooldown = 45; // 기본 무기와 연사속도 일치
    this.damage = 10;
    this.projectileSpeed = 7; // 미사일 속도 기본 무기와 일치
    this.radius = 6;
  }

  update(player, enemies, projectiles, particles, engine) {
    super.update(player, enemies, projectiles, particles, engine);
    if (this.cooldownTimer <= 0 && enemies.length > 0) {
      this.fire(player, enemies, projectiles);
      this.cooldownTimer = this.cooldown;
    }
  }

  fire(player, enemies, projectiles) {
    let closestEnemy = this.getClosestEnemy(player, enemies);
    if (!closestEnemy) return;

    player.triggerAttack();

    const angle = Math.atan2(closestEnemy.y - player.y, closestEnemy.x - player.x);
    let shotCount = this.level >= 2 ? (this.level >= 4 ? 3 : 2) : 1;
    const totalDamage = this.damage * player.might;

    for (let i = 0; i < shotCount; i++) {
      const spreadAngle = angle + (i - (shotCount - 1) / 2) * 0.15;
      projectiles.push(
        new Projectile(player.x, player.y, spreadAngle, this.projectileSpeed, totalDamage, this.radius, '#00f2fe')
      );
    }
  }

  getClosestEnemy(player, enemies) {
    let closest = null;
    let minDist = Infinity;
    for (let enemy of enemies) {
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        minDist = dist;
        closest = enemy;
      }
    }
    return closest;
  }

  onLevelUp() {
    if (this.level === 3) this.damage = 16;
    if (this.level === 5) this.damage = 22;
  }

  getUpgradeDesc() {
    switch (this.level) {
      case 1: return "[NEW] 유도 미사일을 쏩니다. (연사 및 속도 기본무기급)";
      case 2: return "발사하는 미사일 개수가 2개로 증가합니다.";
      case 3: return "미사일 데미지가 증가합니다. (10 -> 16)";
      case 4: return "발사하는 미사일 개수가 3개로 증가합니다.";
      case 5: return "미사일 파괴력이 절정에 달합니다. (데미지 22)";
      default: return "최대 레벨입니다.";
    }
  }
}

// 1.3 궤도 칼날
export class OrbitingBlade extends Weapon {
  constructor() {
    super('궤도 칼날', '🌀');
    this.damage = 8;
    this.currentAngle = 0;
    this.rotateSpeed = 0.04;
    this.orbitRadius = 55;
    this.bladeSize = 10;
  }

  update(player, enemies, projectiles, particles, engine) {
    this.currentAngle += this.rotateSpeed;
    if (this.currentAngle > Math.PI * 2) this.currentAngle -= Math.PI * 2;

    const bladeCount = this.level >= 4 ? 3 : (this.level >= 2 ? 2 : 1);
    const totalDamage = this.damage * player.might;

    for (let i = 0; i < bladeCount; i++) {
      const angleOffset = (Math.PI * 2 / bladeCount) * i;
      const bladeX = player.x + Math.cos(this.currentAngle + angleOffset) * this.orbitRadius;
      const bladeY = player.y + Math.sin(this.currentAngle + angleOffset) * this.orbitRadius;

      for (let enemy of enemies) {
        const dx = enemy.x - bladeX;
        const dy = enemy.y - bladeY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < enemy.radius + this.bladeSize) {
          enemy.takeDamage(totalDamage, particles);
          enemy.applyKnockback(player.x, player.y, 2.5);
        }
      }
    }
  }

  getBlades(player) {
    const bladeCount = this.level >= 4 ? 3 : (this.level >= 2 ? 2 : 1);
    const blades = [];
    for (let i = 0; i < bladeCount; i++) {
      const angleOffset = (Math.PI * 2 / bladeCount) * i;
      const bladeX = player.x + Math.cos(this.currentAngle + angleOffset) * this.orbitRadius;
      const bladeY = player.y + Math.sin(this.currentAngle + angleOffset) * this.orbitRadius;
      blades.push({ x: bladeX, y: bladeY, size: this.bladeSize });
    }
    return blades;
  }

  onLevelUp() {
    if (this.level === 3) {
      this.orbitRadius = 75;
      this.rotateSpeed = 0.055;
    }
    if (this.level === 5) {
      this.damage = 16;
      this.bladeSize = 14;
    }
  }

  getUpgradeDesc() {
    switch (this.level) {
      case 1: return "[NEW] 주변을 공전하며 적을 밀어내고 피해를 주는 칼날을 형성합니다.";
      case 2: return "칼날 개수가 2개로 늘어납니다.";
      case 3: return "회전 속도와 공격 반경이 늘어납니다.";
      case 4: return "칼날 개수가 3개로 늘어납니다.";
      case 5: return "칼날 크기가 대폭 늘어나고 피해량이 2배로 증가합니다.";
      default: return "최대 레벨입니다.";
    }
  }
}

// 1.4 천벌의 번개
export class LightningStrike extends Weapon {
  constructor() {
    super('천벌의 번개', '⚡');
    this.cooldown = 120;
    this.damage = 25;
    this.radius = 35;
  }

  update(player, enemies, projectiles, particles, engine) {
    super.update(player, enemies, projectiles, particles, engine);
    if (this.cooldownTimer <= 0 && enemies.length > 0) {
      this.strike(player, enemies, particles);
      
      let strikeCount = this.level >= 2 ? (this.level >= 4 ? 3 : 2) : 1;
      for (let i = 1; i < strikeCount; i++) {
        setTimeout(() => {
          if (enemies.length > 0 && engine.state === 'PLAYING') {
            this.strike(player, enemies, particles);
          }
        }, i * 200);
      }
      this.cooldownTimer = this.cooldown;
    }
  }

  strike(player, enemies, particles) {
    const screenEnemies = enemies.filter(enemy => {
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      return dx * dx + dy * dy < 450 * 450;
    });

    const targetPool = screenEnemies.length > 0 ? screenEnemies : enemies;
    const target = targetPool[Math.floor(Math.random() * targetPool.length)];

    if (!target) return;

    player.triggerAttack();
    const totalDamage = this.damage * player.might;

    particles.push({
      type: 'lightning',
      x: target.x,
      y: target.y,
      radius: this.radius,
      life: 15,
      maxLife: 15
    });

    for (let enemy of enemies) {
      const dx = enemy.x - target.x;
      const dy = enemy.y - target.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.radius + enemy.radius) {
        enemy.takeDamage(totalDamage, particles);
      }
    }
  }

  onLevelUp() {
    if (this.level === 3) {
      this.damage = 38;
      this.radius = 45;
    }
    if (this.level === 5) this.cooldown = 80;
  }

  getUpgradeDesc() {
    switch (this.level) {
      case 1: return "[NEW] 무작위 적에게 번개를 내리쳐 광역 스플래시 피해를 줍니다.";
      case 2: return "번개 발생 횟수가 2회로 늘어납니다.";
      case 3: return "번개의 공격력 및 타격 피해 반경이 증가합니다.";
      case 4: return "번개 발생 횟수가 3회로 늘어납니다.";
      case 5: return "번개 소환 주기가 빨라집니다. (쿨타임 33% 감소)";
      default: return "최대 레벨입니다.";
    }
  }
}

// 1.5 네온 오라 (반투명 영역 가시성 확보)
export class NeonAura extends Weapon {
  constructor() {
    super('네온 오라', '⭕');
    this.damage = 3;
    this.range = 70;
    this.tickCooldown = 30; 
    this.tickTimer = 0;
  }

  update(player, enemies, projectiles, particles, engine) {
    this.tickTimer--;
    if (this.tickTimer <= 0) {
      const totalDamage = this.damage * player.might;
      const isMaxLevel = this.level >= 5;

      for (let enemy of enemies) {
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.range + enemy.radius) {
          enemy.takeDamage(totalDamage, particles);
          
          if (isMaxLevel) {
            enemy.applyFreeze(90);
          }
        }
      }
      this.tickTimer = this.tickCooldown;
    }
  }

  // 렌더링 헬퍼: 캐릭터와 테두리 사이 반투명 필드 공간 가시성 상향(opacity = 0.14)
  drawAura(ctx, player) {
    ctx.save();
    ctx.shadowColor = '#bd00ff';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = 'rgba(189, 0, 255, 0.4)';
    ctx.lineWidth = 3.5;

    ctx.beginPath();
    ctx.arc(player.x, player.y, this.range, 0, Math.PI * 2);
    ctx.stroke();

    // 확실한 반투명 색상 공간 채우기
    ctx.fillStyle = 'rgba(189, 0, 255, 0.14)';
    ctx.fill();
    ctx.restore();
  }

  onLevelUp() {
    if (this.level === 2) this.range = 95;
    if (this.level === 3) this.damage = 6;
    if (this.level === 4) this.range = 120;
    if (this.level === 5) this.damage = 10;
  }

  getUpgradeDesc() {
    switch (this.level) {
      case 1: return "[NEW] 주위의 적에게 0.5초마다 피해를 주는 반투명 전기 오라를 생성합니다.";
      case 2: return "오라의 영역 범위가 넓어집니다.";
      case 3: return "오라 틱당 피해량이 증가합니다. (3 -> 6)";
      case 4: return "오라의 영역 범위가 대폭 넓어집니다.";
      case 5: return "[극의] 틱 피해량 상승 및 오라 범위 내의 대상을 1.5초간 빙결시킵니다.";
      default: return "최대 레벨입니다.";
    }
  }
}

// 1.6 레이저 빔
export class LaserBeam extends Weapon {
  constructor() {
    super('레이저 빔', '🚨');
    this.cooldown = 90; 
    this.damage = 30;
    this.laserThickness = 12;
  }

  update(player, enemies, projectiles, particles, engine) {
    super.update(player, enemies, projectiles, particles, engine);
    if (this.cooldownTimer <= 0 && enemies.length > 0) {
      this.fire(player, enemies, projectiles);
      this.cooldownTimer = this.cooldown;
    }
  }

  fire(player, enemies, projectiles) {
    const target = enemies[Math.floor(Math.random() * enemies.length)];
    if (!target) return;

    player.triggerAttack();

    const angle = Math.atan2(target.y - player.y, target.x - player.x);
    const totalDamage = this.damage * player.might;

    const laser = new Projectile(player.x, player.y, angle, 35, totalDamage, this.laserThickness, '#ff0055', 'bullet');
    laser.life = 6; 
    laser.piercing = true;
    laser.hitEnemies = new Set(); 

    projectiles.push(laser);

    if (this.level >= 4) {
      const vAngle1 = angle + 0.3;
      const laserLeft = new Projectile(player.x, player.y, vAngle1, 35, totalDamage, this.laserThickness, '#ff0055', 'bullet');
      laserLeft.life = 6;
      laserLeft.piercing = true;
      laserLeft.hitEnemies = new Set();
      projectiles.push(laserLeft);
    }
  }

  onLevelUp() {
    if (this.level === 2) this.damage = 45;
    if (this.level === 3) this.laserThickness = 18;
    if (this.level === 5) this.cooldown = 60;
  }

  getUpgradeDesc() {
    switch (this.level) {
      case 1: return "[NEW] 직선상의 모든 적을 관통하는 일시적인 고에너지 레이저를 쏩니다.";
      case 2: return "레이저의 데미지가 크게 상승합니다. (30 -> 45)";
      case 3: return "레이저 두께가 두꺼워져 더 쉽게 다수를 적중시킵니다.";
      case 4: return "레이저가 동시에 2갈래 분사 형태로 나갑니다.";
      case 5: return "충전 속도가 빨라집니다. (쿨타임 33% 감소)";
      default: return "최대 레벨입니다.";
    }
  }
}

// 1.7 부메랑 검기 (두껍고 선명하게 렌더링하도록 Projectile에 반영 완료)
export class WaveSlasher extends Weapon {
  constructor() {
    super('부메랑 검기', '🪃');
    this.cooldown = 70;
    this.damage = 14;
    this.speed = 5.5;
    this.radius = 24; // 부메랑 검기 반경 상향 조정
  }

  update(player, enemies, projectiles, particles, engine) {
    super.update(player, enemies, projectiles, particles, engine);
    if (this.cooldownTimer <= 0) {
      this.fire(player, projectiles);
      this.cooldownTimer = this.cooldown;
    }
  }

  fire(player, projectiles) {
    player.triggerAttack();
    const angle = player.vx || player.vy ? Math.atan2(player.vy, player.vx) : player.angle;
    const totalDamage = this.damage * player.might;

    const wave = new Projectile(player.x, player.y, angle, this.speed, totalDamage, this.radius, '#00ff66', 'boomerang');
    projectiles.push(wave);

    if (this.level >= 3) {
      const oppositeWave = new Projectile(player.x, player.y, angle + Math.PI, this.speed, totalDamage, this.radius, '#00ff66', 'boomerang');
      projectiles.push(oppositeWave);
    }
  }

  onLevelUp() {
    if (this.level === 2) this.radius = 32; // 레벨업 시 크기 가시성 확대
    if (this.level === 4) this.damage = 24;
    if (this.level === 5) this.cooldown = 45;
  }

  getUpgradeDesc() {
    switch (this.level) {
      case 1: return "[NEW] 진행 방향으로 발사되어 돌아오는 초승달 반원 검기를 던집니다.";
      case 2: return "검기의 비주얼 및 타격 영역 크기가 확장됩니다.";
      case 3: return "캐릭터 뒤쪽 방향으로도 부메랑 검기를 한 장 더 던집니다.";
      case 4: return "검기의 파괴력이 강해집니다. (14 -> 24)";
      case 5: return "부메랑 검기의 연사 속도가 빨라집니다.";
      default: return "최대 레벨입니다.";
    }
  }
}

// 1.8 플라즈마 지뢰 (적이 접근 시 붉게 깜빡임 처리)
export class PlasmaMine extends Weapon {
  constructor() {
    super('플라즈마 지뢰', '💠');
    this.cooldown = 100;
    this.damage = 20;
    this.explodeRadius = 60;
  }

  update(player, enemies, projectiles, particles, engine) {
    super.update(player, enemies, projectiles, particles, engine);
    if (this.cooldownTimer <= 0) {
      this.drop(player, projectiles);
      this.cooldownTimer = this.cooldown;
    }
  }

  drop(player, projectiles) {
    player.triggerAttack();
    const totalDamage = this.damage * player.might;
    
    const oppAngle = player.angle + Math.PI;
    const dropX = player.x + Math.cos(oppAngle) * 12;
    const dropY = player.y + Math.sin(oppAngle) * 12;

    const mine = new Projectile(dropX, dropY, 0, 0, totalDamage, 10, '#00f2fe', 'mine', {
      explodeRadius: this.explodeRadius
    });
    projectiles.push(mine);

    if (this.level >= 3) {
      const mine2 = new Projectile(dropX + (Math.random() - 0.5) * 40, dropY + (Math.random() - 0.5) * 40, 0, 0, totalDamage, 10, '#00f2fe', 'mine', {
        explodeRadius: this.explodeRadius
      });
      projectiles.push(mine2);
    }
  }

  onLevelUp() {
    if (this.level === 2) this.explodeRadius = 80;
    if (this.level === 4) this.damage = 35;
    if (this.level === 5) this.cooldown = 60;
  }

  getUpgradeDesc() {
    switch (this.level) {
      case 1: return "[NEW] 지나간 자리에 지뢰를 놓습니다. 적 감지 시 빨갛게 깜빡이다 기폭합니다.";
      case 2: return "지뢰의 작동 폭발 감지 및 폭사 반경이 확장됩니다.";
      case 3: return "지뢰를 한 번에 2개씩 스폰합니다.";
      case 4: return "지뢰 폭사 데미지가 증가합니다. (20 -> 35)";
      case 5: return "지뢰 재생성 속도가 빨라집니다.";
      default: return "최대 레벨입니다.";
    }
  }
}

// 1.9 네온 화염방사기 (동기적 매 프레임 업데이트 방출로 가시성 100% 보장 완료)
export class FlameThrower extends Weapon {
  constructor() {
    super('네온 화염방사', '🔥');
    this.cooldown = 110; // 연사간격 조정
    this.damage = 1.2;    // 프레임당 가해지는 직접 데미지
    this.burnDuration = 180; // 3초 화상
    this.burnDamage = 2; 

    // 동기식 상태머신을 위한 변수
    this.activeTimer = 0;
    this.activeDuration = 35; // 35프레임 동안 연속 화염 방사
  }

  update(player, enemies, projectiles, particles, engine) {
    super.update(player, enemies, projectiles, particles, engine);

    // 1. 쿨타임 만료 시 화염 방사 작동 시작
    if (this.cooldownTimer <= 0 && this.activeTimer <= 0) {
      this.activeTimer = this.activeDuration;
      this.cooldownTimer = this.cooldown;
    }

    // 2. 동기식 매 프레임 파티클 분사 및 타격 검출
    if (this.activeTimer > 0) {
      this.activeTimer--;

      // 플레이어 공격 모션 작동 유지
      player.triggerAttack();

      const angle = player.angle;
      const totalDamage = this.damage * player.might;
      const actualBurnDamage = this.burnDamage * player.might;

      // 매 프레임 1~2개 화염 불똥 직접 스폰 (비동기 루프 폐지)
      const particleCount = 2;
      for (let k = 0; k < particleCount; k++) {
        const spread = 0.38; // 약 45도
        const randAngle = angle + (Math.random() - 0.5) * spread;
        const speed = 4.5 + Math.random() * 3.5;
        
        particles.push({
          type: 'spark',
          x: player.x + Math.cos(angle) * player.radius,
          y: player.y + Math.sin(angle) * player.radius,
          vx: Math.cos(randAngle) * speed + player.vx * 0.4,
          vy: Math.sin(randAngle) * speed + player.vy * 0.4,
          color: '#ff4e00',
          radius: 7 + Math.random() * 9,
          life: 20 + Math.random() * 12,
          maxLife: 32
        });
      }

      // 화염 직접 히트 검출 범위
      const flameRange = this.level >= 3 ? 130 : 90;
      const spreadLimit = 0.38;

      for (let enemy of enemies) {
        if (enemy.isDead) continue;
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < flameRange) {
          const angleToEnemy = Math.atan2(dy, dx);
          let diffAngle = Math.abs(angleToEnemy - angle);
          if (diffAngle > Math.PI) diffAngle = Math.PI * 2 - diffAngle;

          if (diffAngle < spreadLimit) {
            enemy.takeDamage(totalDamage, particles);
            enemy.applyBurn(this.burnDuration, actualBurnDamage);
          }
        }
      }
    }
  }

  onLevelUp() {
    if (this.level === 2) this.activeDuration = 45; // 화염 방출 시간 연장
    if (this.level === 3) this.burnDamage = 4;
    if (this.level === 4) this.damage = 2.0; // 프레임당 직접 데미지 상승
    if (this.level === 5) this.burnDuration = 300; 
  }

  getUpgradeDesc() {
    switch (this.level) {
      case 1: return "[NEW] 정면 부채꼴 방향에 화염을 뿜어 적들에게 데미지와 3초간 지속되는 화상을 남깁니다.";
      case 2: return "화염 방출 기류 시간이 길어집니다.";
      case 3: return "화상 도트 데미지가 증가합니다. (2 -> 4)";
      case 4: return "화염 직접 피해 파괴력 및 방사 거리가 넓어집니다.";
      case 5: return "[극의] 화상의 지속시간이 5초로 증가하고 도트 데미지 주기가 강해집니다.";
      default: return "최대 레벨입니다.";
    }
  }
}

// 1.10 홀로그램 수류탄 (사용자 피드백: 투척 속도 및 공격 속도 대폭 감축, 렙업 시 스플래시 및 넉백 강화)
export class Grenade extends Weapon {
  constructor() {
    super('홀로그램 수류탄', '💣');
    this.cooldown = 180; // 3초 (연사 속도 크게 하향 조정)
    this.damage = 35;
    this.explodeRadius = 65;
    this.knockbackForce = 8.5; // 기본 넉백 강도
  }

  update(player, enemies, projectiles, particles, engine) {
    super.update(player, enemies, projectiles, particles, engine);
    if (this.cooldownTimer <= 0 && enemies.length > 0) {
      this.fire(player, enemies, projectiles);
      this.cooldownTimer = this.cooldown;
    }
  }

  fire(player, enemies, projectiles) {
    const target = enemies[Math.floor(Math.random() * enemies.length)];
    if (!target) return;

    player.triggerAttack();

    // 수류탄 낙하 예상 중심지
    const targetX = target.x + (Math.random() - 0.5) * 15;
    const targetY = target.y + (Math.random() - 0.5) * 15;

    const angle = Math.atan2(targetY - player.y, targetX - player.x);
    const totalDamage = this.damage * player.might;

    // 수류탄 비행 속도 느리게 하향 조정 (4.5 -> 3.0), duration 연장
    const grenade = new Projectile(player.x, player.y, angle, 3.0, totalDamage, 9, '#ffcc00', 'grenade', {
      targetX: targetX,
      targetY: targetY,
      duration: 65,
      explodeRadius: this.explodeRadius
    });
    grenade.knockbackForce = this.knockbackForce; // 폭심지 넉백 데이터 이전

    projectiles.push(grenade);

    if (this.level >= 3) {
      setTimeout(() => {
        if (enemies.length > 0 && engine.state === 'PLAYING') {
          const t2 = enemies[Math.floor(Math.random() * enemies.length)];
          const g2 = new Projectile(player.x, player.y, Math.atan2(t2.y - player.y, t2.x - player.x), 3.0, totalDamage, 9, '#ffcc00', 'grenade', {
            targetX: t2.x,
            targetY: t2.y,
            duration: 65,
            explodeRadius: this.explodeRadius
          });
          g2.knockbackForce = this.knockbackForce;
          projectiles.push(g2);
        }
      }, 350);
    }
  }

  onLevelUp() {
    if (this.level === 2) {
      this.explodeRadius = 95; // 스플래시 피해 영역 대폭 확대
      this.knockbackForce = 11.5; // 넉백 파워 증가
    }
    if (this.level === 4) {
      this.damage = 60; // 폭사 데미지 증가
      this.knockbackForce = 14.0; 
    }
    if (this.level === 5) {
      this.explodeRadius = 125; // 초거대 폭심지화
      this.cooldown = 150; // 약간 쿨타임 완화 (2.5초)
    }
  }

  getUpgradeDesc() {
    switch (this.level) {
      case 1: return "[NEW] 적진에 아주 느리게 날아가 폭발하는 고화력 수류탄을 던집니다. 강한 광역 피해와 큰 넉백을 입힙니다.";
      case 2: return "폭발의 스플래시 범위 및 적을 날리는 넉백 거리가 증가합니다.";
      case 3: return "약간의 시차를 두고 수류탄을 2개 연달아 던집니다.";
      case 4: return "수류탄 폭사 데미지가 비약적으로 상승하고 넉백이 강력해집니다.";
      case 5: return "폭발의 스플래시 피해 반경이 거대해지며 쿨타임이 소폭 줄어듭니다.";
      default: return "최대 레벨입니다.";
    }
  }
}

// 1.11 투척용 단검 (사용자 피드백: 무제한 다중 관통, 비행 후 화면 끝 정지 바닥 회수 연동)
export class ThrowingDagger extends Weapon {
  constructor() {
    super('투척 단검', '🗡️');
    this.cooldown = 180; // 3초
    this.damage = 45;
    this.speed = 10;
  }

  update(player, enemies, projectiles, particles, engine) {
    super.update(player, enemies, projectiles, particles, engine);
    if (this.cooldownTimer <= 0 && enemies.length > 0) {
      this.fire(player, enemies, projectiles);
      this.cooldownTimer = this.cooldown;
    }
  }

  fire(player, enemies, projectiles) {
    let closestEnemy = null;
    let minDist = Infinity;
    for (let enemy of enemies) {
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        minDist = dist;
        closestEnemy = enemy;
      }
    }

    if (!closestEnemy) return;

    player.triggerAttack();

    const angle = Math.atan2(closestEnemy.y - player.y, closestEnemy.x - player.x);
    const totalDamage = this.damage * player.might;

    // 단검 투사체 타입 'dagger'로 스폰.
    // Dagger 타입은 Projectile.js에서 무제한 관통 및 바닥 낙하 정지 로직이 일체화되어 있습니다.
    const dagger = new Projectile(player.x, player.y, angle, this.speed, totalDamage, 6, '#e0e0e0', 'dagger');
    // 무제한 관통을 위해 pierceCount 대신 piercing 플래그만 설정
    dagger.piercing = true;
    dagger.hitEnemies = new Set();
    dagger.weaponRef = this; // 쿨타임 리셋을 위해 무기 레퍼런스를 투사체에 직접 꽂아 전달!

    projectiles.push(dagger);
  }

  resetCooldown() {
    this.cooldownTimer = 0;
  }

  onLevelUp() {
    if (this.level === 2) this.damage = 75;
    if (this.level === 3) this.speed = 13;
    if (this.level === 5) this.damage = 120;
  }

  getUpgradeDesc() {
    switch (this.level) {
      case 1: return "[NEW] 적을 무제한 관통하는 단검을 던집니다. 화면 바깥에 멈춰 서 있는 단검을 주우면 즉시 연사가 가능합니다.";
      case 2: return "단검의 관통 데미지가 크게 상승합니다. (45 -> 75)";
      case 3: return "단검 비행 속도가 매우 빨라집니다.";
      case 4: return "플레이어의 단검 아이템 유효 자석 획득 범위가 증가합니다.";
      case 5: return "[극의] 단발 데미지가 극도로 상승합니다. (데미지 120)";
      default: return "최대 레벨입니다.";
    }
  }
}


/* ==========================================
   2. 진화 무기 6종 (Evolved Weapons - 보관)
   ========================================== */

export class EvolvedOrbitingBlade extends Weapon {
  constructor() {
    super('초공전 플라즈마 환도', '🌀✨', 1);
    this.damage = 25;
    this.currentAngle = 0;
    this.rotateSpeed = 0.09; 
    this.orbitRadius = 90;
    this.bladeSize = 16;
    this.isEvolved = true;
  }

  update(player, enemies, projectiles, particles, engine) {
    this.currentAngle += this.rotateSpeed;
    const bladeCount = 6;
    const totalDamage = this.damage * player.might;

    for (let i = 0; i < bladeCount; i++) {
      const angleOffset = (Math.PI * 2 / bladeCount) * i;
      const bladeX = player.x + Math.cos(this.currentAngle + angleOffset) * this.orbitRadius;
      const bladeY = player.y + Math.sin(this.currentAngle + angleOffset) * this.orbitRadius;

      for (let enemy of enemies) {
        const dx = enemy.x - bladeX;
        const dy = enemy.y - bladeY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < enemy.radius + this.bladeSize) {
          enemy.takeDamage(totalDamage, particles);
          enemy.applyKnockback(player.x, player.y, 4.5);
        }
      }
    }
  }

  getBlades(player) {
    const bladeCount = 6;
    const blades = [];
    for (let i = 0; i < bladeCount; i++) {
      const angleOffset = (Math.PI * 2 / bladeCount) * i;
      const bladeX = player.x + Math.cos(this.currentAngle + angleOffset) * this.orbitRadius;
      const bladeY = player.y + Math.sin(this.currentAngle + angleOffset) * this.orbitRadius;
      blades.push({ x: bladeX, y: bladeY, size: this.bladeSize });
    }
    return blades;
  }

  getUpgradeDesc() { return "진화 완료. 더 이상 강화할 수 없습니다."; }
}

export class EvolvedMagicMissile extends Weapon {
  constructor() {
    super('메가 입자 유도 캐논', '🔮✨', 1);
    this.cooldown = 24; 
    this.damage = 25;
    this.projectileSpeed = 8.5;
    this.radius = 14; 
    this.isEvolved = true;
  }

  update(player, enemies, projectiles, particles, engine) {
    super.update(player, enemies, projectiles, particles, engine);
    if (this.cooldownTimer <= 0 && enemies.length > 0) {
      this.fire(player, enemies, projectiles);
      this.cooldownTimer = this.cooldown;
    }
  }

  fire(player, enemies, projectiles) {
    let closestEnemy = null;
    let minDist = Infinity;
    for (let enemy of enemies) {
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        minDist = dist;
        closestEnemy = enemy;
      }
    }

    if (!closestEnemy) return;

    player.triggerAttack();
    const angle = Math.atan2(closestEnemy.y - player.y, closestEnemy.x - player.x);
    const totalDamage = this.damage * player.might;

    const megaMissile = new Projectile(player.x, player.y, angle, this.projectileSpeed, totalDamage, this.radius, '#ff00aa');
    megaMissile.isEvolvedMissile = true; 
    projectiles.push(megaMissile);
  }

  getUpgradeDesc() { return "진화 완료. 더 이상 강화할 수 없습니다."; }
}

export class EvolvedFlameThrower extends Weapon {
  constructor() {
    super('네파림의 불꽃 장벽', '🔥✨', 1);
    this.cooldown = 100;
    this.damage = 8;
    this.burnDuration = 240; 
    this.burnDamage = 5;
    this.isEvolved = true;
  }

  update(player, enemies, projectiles, particles, engine) {
    super.update(player, enemies, projectiles, particles, engine);
    if (this.cooldownTimer <= 0) {
      this.fire(player, enemies, particles);
      this.cooldownTimer = this.cooldown;
    }
  }

  fire(player, enemies, particles) {
    let tick = 0;
    const totalDamage = this.damage * player.might;
    const actualBurnDamage = this.burnDamage * player.might;

    const fireInterval = setInterval(() => {
      if (engine.state !== 'PLAYING') {
        clearInterval(fireInterval);
        return;
      }

      player.triggerAttack();
      const particleCount = 8;
      const startAngle = Math.random() * Math.PI;

      for (let i = 0; i < particleCount; i++) {
        const angle = startAngle + (Math.PI * 2 / particleCount) * i;
        const speed = 3.5 + Math.random() * 2.5;

        particles.push({
          type: 'spark',
          x: player.x,
          y: player.y,
          vx: Math.cos(angle) * speed + player.vx * 0.3,
          vy: Math.sin(angle) * speed + player.vy * 0.3,
          color: '#ffcc00', 
          radius: 8 + Math.random() * 6,
          life: 25,
          maxLife: 25
        });
      }

      const waveRange = 130;
      for (let enemy of enemies) {
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < waveRange + enemy.radius) {
          enemy.takeDamage(totalDamage, particles);
          enemy.applyBurn(this.burnDuration, actualBurnDamage);
        }
      }

      tick++;
      if (tick >= 25) {
        clearInterval(fireInterval);
      }
    }, 45);
  }

  getUpgradeDesc() { return "진화 완료. 더 이상 강화할 수 없습니다."; }
}

export class EvolvedGrenade extends Weapon {
  constructor() {
    super('중력 붕괴 블랙홀 탄', '🧲✨', 1);
    this.cooldown = 110;
    this.damage = 45;
    this.explodeRadius = 85;
    this.isEvolved = true;
  }

  update(player, enemies, projectiles, particles, engine) {
    super.update(player, enemies, projectiles, particles, engine);
    if (this.cooldownTimer <= 0 && enemies.length > 0) {
      this.fire(player, enemies, projectiles);
      this.cooldownTimer = this.cooldown;
    }
  }

  fire(player, enemies, projectiles) {
    const target = enemies[Math.floor(Math.random() * enemies.length)];
    if (!target) return;

    player.triggerAttack();
    const angle = Math.atan2(target.y - player.y, target.x - player.x);
    const totalDamage = this.damage * player.might;

    const grenade = new Projectile(player.x, player.y, angle, 4.5, totalDamage, 10, '#bd00ff', 'grenade', {
      targetX: target.x,
      targetY: target.y,
      duration: 40,
      explodeRadius: this.explodeRadius
    });
    grenade.isEvolvedGrenade = true; 

    projectiles.push(grenade);
  }

  getUpgradeDesc() { return "진화 완료. 더 이상 강화할 수 없습니다."; }
}

export class EvolvedLightningStrike extends Weapon {
  constructor() {
    super('기가 볼트 체인 라이트닝', '⚡✨', 1);
    this.cooldown = 90;
    this.damage = 40;
    this.radius = 40;
    this.isEvolved = true;
  }

  update(player, enemies, projectiles, particles, engine) {
    super.update(player, enemies, projectiles, particles, engine);
    if (this.cooldownTimer <= 0 && enemies.length > 0) {
      this.strikeChain(player, enemies, particles);
      this.cooldownTimer = this.cooldown;
    }
  }

  strikeChain(player, enemies, particles) {
    let target = enemies[Math.floor(Math.random() * enemies.length)];
    if (!target) return;

    player.triggerAttack();
    const totalDamage = this.damage * player.might;
    const hitList = new Set(); 

    const strikeOne = (currentX, currentY, prevEnemy = null) => {
      particles.push({
        type: 'lightning',
        x: currentX,
        y: currentY,
        radius: this.radius,
        life: 15,
        maxLife: 15
      });

      for (let enemy of enemies) {
        const dx = enemy.x - currentX;
        const dy = enemy.y - currentY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < this.radius + enemy.radius) {
          enemy.takeDamage(totalDamage, particles);
        }
      }
    };

    strikeOne(target.x, target.y);
    hitList.add(target);

    let chainCount = 4;
    let lastX = target.x;
    let lastY = target.y;

    const triggerNextChain = (index) => {
      if (index >= chainCount || enemies.length <= 0) return;

      let nextTarget = null;
      let minDist = 220; 

      for (let enemy of enemies) {
        if (hitList.has(enemy) || enemy.isDead) continue;
        const dx = enemy.x - lastX;
        const dy = enemy.y - lastY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          minDist = dist;
          nextTarget = enemy;
        }
      }

      if (nextTarget) {
        hitList.add(nextTarget);
        
        particles.push({
          type: 'spark',
          x: lastX,
          y: lastY,
          vx: (nextTarget.x - lastX) * 0.1,
          vy: (nextTarget.y - lastY) * 0.1,
          color: '#00f2fe',
          radius: 3,
          life: 10,
          maxLife: 10
        });

        lastX = nextTarget.x;
        lastY = nextTarget.y;

        strikeOne(lastX, lastY);
        
        setTimeout(() => triggerNextChain(index + 1), 150);
      }
    };

    setTimeout(() => triggerNextChain(0), 150);
  }

  getUpgradeDesc() { return "진화 완료. 더 이상 강화할 수 없습니다."; }
}

export class EvolvedThrowingDagger extends Weapon {
  constructor() {
    super('무한 폭풍 사검', '🗡️✨', 1);
    this.cooldown = 7; 
    this.damage = 28;
    this.speed = 14;
    this.isEvolved = true;
  }

  update(player, enemies, projectiles, particles, engine) {
    super.update(player, enemies, projectiles, particles, engine);
    if (this.cooldownTimer <= 0 && enemies.length > 0) {
      this.fire(player, enemies, projectiles);
      this.cooldownTimer = this.cooldown;
    }
  }

  fire(player, enemies, projectiles) {
    const target = enemies[Math.floor(Math.random() * enemies.length)];
    if (!target) return;

    player.triggerAttack();
    const angle = Math.atan2(target.y - player.y, target.x - player.x) + (Math.random() - 0.5) * 0.25; 
    const totalDamage = this.damage * player.might;

    const dagger = new Projectile(player.x, player.y, angle, this.speed, totalDamage, 5, '#bd00ff', 'bullet');
    dagger.pierceCount = 2; 
    dagger.hitEnemies = new Set();
    dagger.isDagger = false; 
    projectiles.push(dagger);
  }

  getUpgradeDesc() { return "진화 완료. 더 이상 강화할 수 없습니다."; }
}
