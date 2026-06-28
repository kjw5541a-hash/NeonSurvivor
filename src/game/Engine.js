import { Player } from './Player.js';
import { Enemy } from './Enemy.js';
import { Gem } from './Gem.js';
import { DaggerPickup } from './DaggerPickup.js';
import { ParticleSystem } from './Particle.js';
import { 
  StarterWeapon, MagicMissile, OrbitingBlade, LightningStrike,
  NeonAura, LaserBeam, WaveSlasher, PlasmaMine, FlameThrower, Grenade, ThrowingDagger,
  EvolvedOrbitingBlade, EvolvedMagicMissile, EvolvedFlameThrower, EvolvedGrenade, EvolvedLightningStrike, EvolvedThrowingDagger
} from './Weapon.js';

export class Engine {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.dpr = window.devicePixelRatio || 1;

    // 게임 상태
    this.state = 'START'; 
    this.kills = 0;
    this.startTime = 0;
    this.elapsedTime = 0; 
    this.spawnTimer = 0;

    // 카메라 및 쉐이크 효과
    this.camera = { x: 0, y: 0 };
    this.shakeTimer = 0;
    this.shakeIntensity = 0;

    // 가상 조이스틱
    this.joystick = {
      active: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      maxRadius: 60,
      inputX: 0,
      inputY: 0
    };

    // 게임 엔티티
    this.player = null;
    this.enemies = [];
    this.projectiles = [];
    this.gems = [];
    this.daggerPickups = []; // 회수용 단검 리스트
    this.particles = [];

    // 신규 추가 무기 7종을 포함한 10종 업그레이드 풀
    this.upgradePool = [
      { id: 'missile', classRef: MagicMissile, name: '매직 미사일' },
      { id: 'blade', classRef: OrbitingBlade, name: '궤도 칼날' },
      { id: 'lightning', classRef: LightningStrike, name: '천벌의 번개' },
      { id: 'aura', classRef: NeonAura, name: '네온 오라' },
      { id: 'laser', classRef: LaserBeam, name: '레이저 빔' },
      { id: 'wave', classRef: WaveSlasher, name: '부메랑 검기' },
      { id: 'mine', classRef: PlasmaMine, name: '플라즈마 지뢰' },
      { id: 'flame', classRef: FlameThrower, name: '네온 화염방사' },
      { id: 'grenade', classRef: Grenade, name: '홀로그램 수류탄' },
      { id: 'dagger', classRef: ThrowingDagger, name: '투척 단검' }
    ];

    // 패시브 리스트
    this.passivesPool = [
      { id: 'speed', name: '가속 회로 (공속)', icon: '🏃', desc: '이동 속도가 15% 빨라집니다.' },
      { id: 'might', name: '출력 강화 (공격력)', icon: '🔥', desc: '모든 공격 데미지가 20% 증가합니다.' },
      { id: 'magnet', name: '자석 유닛 (반경)', icon: '🧲', desc: '경험치 보석 획득 반경이 30% 증가합니다.' },
      { id: 'armor', name: '나노 합금 (방어력)', icon: '🛡️', desc: '피격 피해량을 2 감소시킵니다.' }
    ];

    // 무기 진화 조합 짝꿍 데이터
    this.evolutionFormula = {
      'OrbitingBlade': { passiveId: 'speed', evolvedClass: EvolvedOrbitingBlade, name: '초공전 플라즈마 환도', icon: '🌀✨' },
      'MagicMissile': { passiveId: 'might', evolvedClass: EvolvedMagicMissile, name: '메가 입자 유도 캐논', icon: '🔮✨' },
      'FlameThrower': { passiveId: 'armor', evolvedClass: EvolvedFlameThrower, name: '네파림의 불꽃 장벽', icon: '🔥✨' },
      'Grenade': { passiveId: 'magnet', evolvedClass: EvolvedGrenade, name: '중력 붕괴 블랙홀 탄', icon: '🧲✨' },
      'LightningStrike': { passiveId: 'might', evolvedClass: EvolvedLightningStrike, name: '기가 볼트 체인 라이트닝', icon: '⚡✨' },
      'ThrowingDagger': { passiveId: 'speed', evolvedClass: EvolvedThrowingDagger, name: '무한 폭풍 사검', icon: '🗡️✨' }
    };

    this.initResize();
    this.initInput();
    this.initUI();
  }

  initResize() {
    const resizeCanvas = () => {
      this.virtualWidth = 540;
      this.virtualHeight = 960;

      this.canvas.width = this.virtualWidth * this.dpr;
      this.canvas.height = this.virtualHeight * this.dpr;

      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';

      this.ctx.scale(this.dpr, this.dpr);
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
  }

  initInput() {
    const handleStart = (clientX, clientY) => {
      if (this.state !== 'PLAYING') return;

      const rect = this.canvas.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * this.virtualWidth;
      const y = ((clientY - rect.top) / rect.height) * this.virtualHeight;

      if (y > this.virtualHeight * 0.4) {
        this.joystick.active = true;
        this.joystick.startX = x;
        this.joystick.startY = y;
        this.joystick.currentX = x;
        this.joystick.currentY = y;
        this.joystick.inputX = 0;
        this.joystick.inputY = 0;
      }
    };

    const handleMove = (clientX, clientY) => {
      if (!this.joystick.active) return;

      const rect = this.canvas.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * this.virtualWidth;
      const y = ((clientY - rect.top) / rect.height) * this.virtualHeight;

      this.joystick.currentX = x;
      this.joystick.currentY = y;

      const dx = x - this.joystick.startX;
      const dy = y - this.joystick.startY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance === 0) {
        this.joystick.inputX = 0;
        this.joystick.inputY = 0;
      } else {
        const intensity = Math.min(distance / this.joystick.maxRadius, 1);
        this.joystick.inputX = (dx / distance) * intensity;
        this.joystick.inputY = (dy / distance) * intensity;
      }
    };

    const handleEnd = () => {
      this.joystick.active = false;
      this.joystick.inputX = 0;
      this.joystick.inputY = 0;
    };

    this.canvas.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY);
    }, { passive: true });

    this.canvas.addEventListener('touchmove', (e) => {
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    }, { passive: true });

    this.canvas.addEventListener('touchend', handleEnd, { passive: true });

    this.canvas.addEventListener('mousedown', (e) => {
      handleStart(e.clientX, e.clientY);
    });

    this.canvas.addEventListener('mousemove', (e) => {
      handleMove(e.clientX, e.clientY);
    });

    this.canvas.addEventListener('mouseup', handleEnd);
    this.canvas.addEventListener('mouseleave', handleEnd);
  }

  initUI() {
    const startBtn = document.getElementById('start-btn');
    const restartBtn = document.getElementById('restart-btn');

    startBtn.addEventListener('click', () => this.startGame());
    restartBtn.addEventListener('click', () => this.startGame());
  }

  startGame() {
    document.querySelectorAll('.ui-screen').forEach(screen => screen.classList.remove('active'));
    
    this.state = 'PLAYING';
    this.kills = 0;
    this.startTime = Date.now();
    this.elapsedTime = 0;
    this.spawnTimer = 0;
    this.shakeTimer = 0;

    this.enemies = [];
    this.projectiles = [];
    this.gems = [];
    this.daggerPickups = [];
    this.particles = [];

    // 플레이어 생성 및 기본 1성 매직 미사일 장착
    this.player = new Player(0, 0);
    this.player.weapons.push(new StarterWeapon());

    this.camera.x = this.player.x - this.virtualWidth / 2;
    this.camera.y = this.player.y - this.virtualHeight / 2;

    this.updateHUD();

    if (!this.loopActive) {
      this.loopActive = true;
      this.tick();
    }
  }

  tick() {
    if (this.state === 'PLAYING') {
      this.update();
      this.draw();
    } else if (this.state === 'LEVEL_UP' || this.state === 'GAME_OVER') {
      this.draw();
    }
    requestAnimationFrame(() => this.tick());
  }

  triggerCameraShake(duration, intensity) {
    this.shakeTimer = duration;
    this.shakeIntensity = intensity;
  }

  update() {
    // 1. 타이머
    this.elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);
    this.updateHUD();

    // 2. 플레이어 이동
    this.player.update(this.joystick.inputX, this.joystick.inputY);

    // 3. 카메라 트랙킹
    const targetCamX = this.player.x - this.virtualWidth / 2;
    const targetCamY = this.player.y - this.virtualHeight / 2;
    this.camera.x += (targetCamX - this.camera.x) * 0.1;
    this.camera.y += (targetCamY - this.camera.y) * 0.1;

    if (this.shakeTimer > 0) this.shakeTimer--;

    // 4. 무기 자동 공격 루프
    for (let weapon of this.player.weapons) {
      weapon.update(this.player, this.enemies, this.projectiles, this.particles, this);
    }

    // 5. 몬스터 스폰
    this.handleEnemySpawning();

    // 6. 블랙홀 중력 연산 (적들을 폭심지로 당김)
    const blackholes = this.particles.filter(p => p.type === 'blackhole');
    for (let bh of blackholes) {
      for (let enemy of this.enemies) {
        if (enemy.isDead) continue;
        const dx = bh.x - enemy.x;
        const dy = bh.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // 블랙홀 반경 1.5배 영역까지 흡입
        if (dist < bh.radius * 1.5) {
          const pullForce = (1 - dist / (bh.radius * 1.5)) * 3.5;
          enemy.x += (dx / dist) * pullForce;
          enemy.y += (dy / dist) * pullForce;
        }
      }
    }

    // 7. 적 업데이트 및 플레이어 충돌 검사
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(this.player, this.particles);

      if (enemy.isDead) {
        this.gems.push(new Gem(enemy.x, enemy.y, enemy.xpValue));
        this.kills++;
        this.enemies.splice(i, 1);
        continue;
      }

      // 플레이어와 적 충돌 (사망 연출 중인 적은 충돌 제외)
      if (enemy.dying) continue;

      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < enemy.radius + this.player.radius) {
        this.playerDamage(enemy.damage);
        enemy.applyKnockback(this.player.x, this.player.y, 5);
      }
    }

    // 8. 투사체 업데이트 및 적 충돌 처리
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.update(this.player, this.enemies);

      if (proj.isDead) {
        // 소멸 처리 및 단검(Dagger) 습득 시 쿨타임 리셋 처리
        if (proj.type === 'dagger') {
          const daggerWeapon = this.player.weapons.find(w => w instanceof ThrowingDagger);
          if (daggerWeapon) {
            daggerWeapon.resetCooldown();
            
            // 보라색 습득 펄스 이펙트
            for (let j = 0; j < 6; j++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = 1.5 + Math.random() * 2.5;
              this.particles.push({
                type: 'spark',
                x: this.player.x,
                y: this.player.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: '#bd00ff',
                radius: 2.5,
                life: 20,
                maxLife: 20
              });
            }
          }
        }
        
        this.handleProjectileExplode(proj);
        this.projectiles.splice(i, 1);
        continue;
      }

      // 적과의 충돌 검사
      for (let enemy of this.enemies) {
        if (enemy.isDead || enemy.dying) continue;

        // 관통 무기일 경우 이미 맞은 적은 스킵
        if (proj.piercing && proj.hitEnemies.has(enemy)) continue;

        const dx = enemy.x - proj.x;
        const dy = enemy.y - proj.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < enemy.radius + proj.radius) {
          const wasDeadBefore = enemy.isDead;
          
          enemy.takeDamage(proj.damage, this.particles);
          enemy.applyKnockback(proj.x, proj.y, 4);

          // 단검 관통에 대한 몬스터 처치 드롭 로직은 제거 (날아가다 멈추는 방식으로 대체됨)

          if (proj.piercing) {
            proj.hitEnemies.add(enemy);
            if (proj.pierceCount !== undefined) {
              proj.pierceCount--;
              if (proj.pierceCount <= 0) {
                proj.isDead = true;
                break;
              }
            }
          } else {
            proj.isDead = true;
            break;
          }
        }
      }
    }

    // 바닥에 떨어진 단검(dagger && isDropped) 최대 2개 개수 제한 (가장 먼저 떨어진 단검 순서로 자동 FIFO 삭제)
    const droppedDaggers = this.projectiles.filter(p => p.type === 'dagger' && p.isDropped);
    if (droppedDaggers.length > 2) {
      const oldestDagger = droppedDaggers[0];
      const idx = this.projectiles.indexOf(oldestDagger);
      if (idx > -1) {
        this.projectiles.splice(idx, 1);
      }
    }

    // 9. 경험치 보석 업데이트
    for (let i = this.gems.length - 1; i >= 0; i--) {
      const gem = this.gems[i];
      gem.update(this.player);

      if (gem.isDead) {
        const leveledUp = this.player.addXp(gem.xpValue);
        
        this.particles.push({
          type: 'spark',
          x: this.player.x,
          y: this.player.y,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          color: gem.color,
          radius: 2,
          life: 15,
          maxLife: 15
        });

        this.gems.splice(i, 1);

        if (leveledUp) {
          this.triggerLevelUp();
        }
      }
    }

    // 10. 단검 픽업 업데이트 및 흡수 (투사체 루프로 완벽 이관되어 삭제)

    // 11. 파티클 업데이트
    ParticleSystem.update(this.particles);

    // 5분 서바이벌 승리 체크
    if (this.elapsedTime >= 300) {
      this.triggerGameOver(true);
    }
  }

  // 투사체 소멸 시 특수 폭발 범위 처리
  handleProjectileExplode(proj) {
    // 수류탄 폭발
    if (proj.type === 'grenade') {
      const totalExplodeRadius = proj.explodeRadius;
      
      // 폭발 화염 방사
      ParticleSystem.spawnExplosion(proj.x, proj.y, totalExplodeRadius, this.particles, proj.color);
      this.triggerCameraShake(10, 8); // 지진 카메라 흔들림

      // 진화형 블랙홀 탄인 경우 블랙홀 생성
      if (proj.isEvolvedGrenade) {
        this.particles.push({
          type: 'blackhole',
          x: proj.x,
          y: proj.y,
          radius: totalExplodeRadius,
          life: 90, // 1.5초 지속
          maxLife: 90
        });
      }

      // 범위 피해 및 강력 넉백
      for (let enemy of this.enemies) {
        if (enemy.isDead) continue;
        const dx = enemy.x - proj.x;
        const dy = enemy.y - proj.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < totalExplodeRadius + enemy.radius) {
          enemy.takeDamage(proj.damage, this.particles);
          enemy.applyKnockback(proj.x, proj.y, proj.knockbackForce || 8.5); // 수류탄 넉백 강도 반영
        }
      }
    }

    // 메가 입자 유도 캐논 폭발
    if (proj.isEvolvedMissile) {
      const splashRadius = 60;
      ParticleSystem.spawnExplosion(proj.x, proj.y, splashRadius, this.particles, '#ff00aa');
      this.triggerCameraShake(6, 4);

      for (let enemy of this.enemies) {
        if (enemy.isDead) continue;
        const dx = enemy.x - proj.x;
        const dy = enemy.y - proj.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < splashRadius + enemy.radius) {
          // 폭발 중심 스플래시는 70% 데미지
          enemy.takeDamage(proj.damage * 0.7, this.particles);
          enemy.applyKnockback(proj.x, proj.y, 4);
        }
      }
    }
  }

  // 몬스터 스폰 난이도 시스템
  handleEnemySpawning() {
    this.spawnTimer--;
    if (this.spawnTimer <= 0) {
      let spawnInterval = 75; 
      let spawnTypes = ['standard'];

      if (this.elapsedTime >= 30) {
        spawnInterval = 55;
        spawnTypes.push('fast');
      }
      if (this.elapsedTime >= 70) {
        spawnInterval = 38;
        spawnTypes.push('tank');
      }
      if (this.elapsedTime >= 120) {
        spawnInterval = 20; 
      }

      this.spawnTimer = spawnInterval;

      // 보스 스폰 (2분 단위)
      if (this.elapsedTime > 0 && this.elapsedTime % 120 === 0 && !this.enemies.some(e => e.type === 'boss')) {
        this.spawnEnemy('boss');
      }

      const randomType = spawnTypes[Math.floor(Math.random() * spawnTypes.length)];
      this.spawnEnemy(randomType);
    }
  }

  spawnEnemy(type) {
    const angle = Math.random() * Math.PI * 2;
    const spawnDist = Math.max(this.virtualWidth, this.virtualHeight) / 2 + 50;
    
    const spawnX = this.player.x + Math.cos(angle) * spawnDist;
    const spawnY = this.player.y + Math.sin(angle) * spawnDist;

    this.enemies.push(new Enemy(spawnX, spawnY, type));
  }

  playerDamage(damage) {
    if (this.state !== 'PLAYING') return;

    const actualDamage = Math.max(damage - this.player.armor, 1);
    this.player.hp -= actualDamage;

    // 피격 모션 트리거 (14프레임 동안 Punk_hurt 애니메이션 노출)
    this.player.triggerHurt(14);

    this.triggerCameraShake(8, 6);

    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2;
      this.particles.push({
        type: 'spark',
        x: this.player.x,
        y: this.player.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: '#ff3333',
        radius: 2.5,
        life: 15,
        maxLife: 15
      });
    }

    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this.triggerGameOver(false);
    }
  }

  triggerLevelUp() {
    this.state = 'LEVEL_UP';
    
    ParticleSystem.spawnLevelUpEffect(this.player.x, this.player.y, this.particles);

    const levelupScreen = document.getElementById('levelup-screen');
    const cardContainer = document.getElementById('card-container');
    cardContainer.innerHTML = ''; 

    // 진화 및 스탯 카드 추출
    const choices = this.generateUpgradeOptions();

    choices.forEach(option => {
      const card = document.createElement('div');
      card.className = 'upgrade-card';
      
      const isNew = option.level === 0;
      let levelLabel = isNew ? 'NEW' : `LV.${option.level + 1}`;
      if (option.type === 'weapon_evolve') levelLabel = '진화✨';

      card.innerHTML = `
        <div class="card-icon">${option.icon}</div>
        <div class="card-info">
          <div class="card-name-row">
            <span class="card-name">${option.name}</span>
            <span class="card-level">${levelLabel}</span>
          </div>
          <p class="card-desc">${option.desc}</p>
        </div>
      `;

      card.addEventListener('click', () => {
        this.applyUpgrade(option);
        levelupScreen.classList.remove('active');
        this.state = 'PLAYING';
        this.joystick.active = false;
      });

      cardContainer.appendChild(card);
    });

    levelupScreen.classList.add('active');
  }

  // 진화 무기 및 스탯/신규 무기 결합 선택지 구성
  generateUpgradeOptions() {
    const options = [];

    // 1. 진화 무기 판정 (Max 무기 5레벨 + 필요 패시브 보유 상태)
    this.player.weapons.forEach(weapon => {
      // 이미 진화하지 않은 일반 무기이며 5레벨(Max)인지 체크
      if (!weapon.isEvolved && weapon.level === 5) {
        const className = weapon.constructor.name;
        const formula = this.evolutionFormula[className];

        if (formula) {
          // 필요 패시브 소지 검사
          const hasPassive = this.player.passives.includes(formula.passiveId);
          if (hasPassive) {
            options.push({
              type: 'weapon_evolve',
              id: `evolve_${className}`,
              name: formula.name,
              icon: formula.icon,
              level: 5,
              desc: `[진화] ${weapon.name}를 ${formula.name}로 합성 진화시킵니다!`,
              weaponInstance: weapon,
              evolveClass: formula.evolvedClass
            });
          }
        }
      }
    });

    // 2. 일반 보유 무기 업그레이드 및 신규 습득 후보군 추가
    this.upgradePool.forEach(item => {
      const existingWeapon = this.player.weapons.find(w => w instanceof item.classRef);
      
      if (existingWeapon) {
        // 이미 5레벨 도달했거나 진화된 상태면 업그레이드 배제
        if (!existingWeapon.isEvolved && existingWeapon.level < existingWeapon.maxLevel) {
          options.push({
            type: 'weapon_upgrade',
            id: item.id,
            name: item.name,
            icon: existingWeapon.icon,
            level: existingWeapon.level,
            desc: existingWeapon.getUpgradeDesc(),
            weaponInstance: existingWeapon
          });
        }
      } else {
        // 새 무기 습득 (단, 이미 보유 무기가 6개 꽉 차있으면 새 무기 습득 차단)
        if (this.player.weapons.length < 6) {
          const tempInstance = new item.classRef();
          options.push({
            type: 'weapon_new',
            id: item.id,
            name: item.name,
            icon: tempInstance.icon,
            level: 0,
            desc: tempInstance.getUpgradeDesc(),
            classRef: item.classRef
          });
        }
      }
    });

    // 3. 스탯 패시브 추가
    this.passivesPool.forEach(p => {
      options.push({
        type: 'stat',
        id: p.id,
        name: p.name,
        icon: p.icon,
        desc: p.desc
      });
    });

    const shuffled = options.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  }

  applyUpgrade(option) {
    if (option.type === 'weapon_new') {
      this.player.weapons.push(new option.classRef());
    } else if (option.type === 'weapon_upgrade') {
      option.weaponInstance.levelUp();
    } else if (option.type === 'weapon_evolve') {
      // 기존 5레벨 무기 인스턴스를 파괴하고 진화형 무기로 대체 교환
      const index = this.player.weapons.indexOf(option.weaponInstance);
      if (index > -1) {
        this.player.weapons[index] = new option.evolveClass();
        
        // 화면 진화 폭죽 연출
        ParticleSystem.spawnLevelUpEffect(this.player.x, this.player.y, this.particles);
      }
    } else if (option.type === 'stat') {
      // 패시브 보유 목록에 ID 저장 (진화 연동용)
      if (!this.player.passives.includes(option.id)) {
        this.player.passives.push(option.id);
      }

      switch (option.id) {
        case 'speed':
          this.player.speedModifier += 0.15;
          break;
        case 'might':
          this.player.might += 0.20;
          break;
        case 'magnet':
          this.player.magnetRange += 22;
          break;
        case 'armor':
          this.player.armor += 2;
          break;
      }
    }
  }

  triggerGameOver(isVictory = false) {
    this.state = 'GAME_OVER';
    this.joystick.active = false;

    const gameoverScreen = document.getElementById('gameover-screen');
    const resultTitle = document.getElementById('result-title');
    const resultTime = document.getElementById('result-time');
    const resultKills = document.getElementById('result-kills');
    const resultLevel = document.getElementById('result-level');

    if (isVictory) {
      resultTitle.innerText = 'VICTORY!';
      resultTitle.style.color = '#00f2fe';
      resultTitle.style.textShadow = '0 0 15px rgba(0, 242, 254, 0.4)';
    } else {
      resultTitle.innerText = 'GAME OVER';
      resultTitle.style.color = '#ff007f';
      resultTitle.style.textShadow = '0 0 15px rgba(255, 0, 127, 0.4)';
    }

    const minutes = String(Math.floor(this.elapsedTime / 60)).padStart(2, '0');
    const seconds = String(this.elapsedTime % 60).padStart(2, '0');
    resultTime.innerText = `${minutes}:${seconds}`;
    resultKills.innerText = this.kills;
    resultLevel.innerText = this.player.level;

    gameoverScreen.classList.add('active');
  }

  updateHUD() {
    const minutes = String(Math.floor(this.elapsedTime / 60)).padStart(2, '0');
    const seconds = String(this.elapsedTime % 60).padStart(2, '0');
    
    document.getElementById('hud-time').innerText = `${minutes}:${seconds}`;
    document.getElementById('hud-level').innerText = this.player ? this.player.level : 1;
    document.getElementById('hud-kills').innerText = this.kills;

    if (this.player) {
      const xpPercent = (this.player.xp / this.player.nextLevelXp) * 100;
      document.getElementById('xp-bar-fill').style.width = `${xpPercent}%`;
    }
  }

  draw() {
    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeTimer > 0) {
      shakeX = (Math.random() - 0.5) * this.shakeIntensity;
      shakeY = (Math.random() - 0.5) * this.shakeIntensity;
    }

    this.ctx.fillStyle = '#0b0f19';
    this.ctx.fillRect(0, 0, this.virtualWidth, this.virtualHeight);

    this.ctx.save();
    this.ctx.translate(-this.camera.x + shakeX, -this.camera.y + shakeY);

    // 1. 그리드 렌더링
    this.drawGrid();

    // 2. 단검 픽업 그리기
    for (let pickup of this.daggerPickups) {
      pickup.draw(this.ctx);
    }

    // 3. 보석 그리기
    for (let gem of this.gems) {
      gem.draw(this.ctx);
    }

    // 4. 투사체 그리기
    for (let proj of this.projectiles) {
      proj.draw(this.ctx);
    }

    // 5. 적 그리기
    for (let enemy of this.enemies) {
      enemy.draw(this.ctx);
    }

    // 6. 플레이어 그리기
    if (this.player) {
      // 네온 오라 필드가 있다면 렌더링 (플레이어 그리기 전에 밑에 깔아줌)
      const auraWeapon = this.player.weapons.find(w => w instanceof NeonAura);
      if (auraWeapon) {
        auraWeapon.drawAura(this.ctx, this.player);
      }

      this.player.draw(this.ctx);

      // 플레이어 공전 궤도 칼날 및 진화 환도 그리기
      const bladeWeapon = this.player.weapons.find(w => w instanceof OrbitingBlade || w instanceof EvolvedOrbitingBlade);
      if (bladeWeapon) {
        const blades = bladeWeapon.getBlades(this.player);
        blades.forEach(blade => {
          this.ctx.save();
          // 진화 환도는 분홍빛/황금색, 일반 칼날은 보라색
          const color = bladeWeapon.isEvolved ? '#ffcc00' : '#bd00ff';
          this.ctx.shadowColor = color;
          this.ctx.shadowBlur = 12;
          this.ctx.fillStyle = color;

          this.ctx.beginPath();
          this.ctx.arc(blade.x, blade.y, blade.size, 0, Math.PI * 2);
          this.ctx.fill();

          this.ctx.shadowBlur = 0;
          this.ctx.strokeStyle = '#ffffff';
          this.ctx.lineWidth = 1.5;
          this.ctx.stroke();

          this.ctx.restore();
        });
      }
    }

    // 7. 파티클 그리기
    ParticleSystem.draw(this.ctx, this.particles);

    this.ctx.restore();

    this.drawJoystickUI();
    this.drawPlayerHPUI();
  }

  drawPlayerHPUI() {
    if (this.state !== 'PLAYING' || !this.player) return;

    const screenX = this.player.x - this.camera.x;
    const screenY = this.player.y - this.camera.y;

    const barWidth = 36;
    const barHeight = 4;
    
    // 체력바의 중앙이 캐릭터 발밑 한가운데 위치하도록 플레이어 원점 중심으로 정렬 배치
    const barX = screenX - barWidth / 2;
    
    // 체력바를 발밑으로 2px 추가 하강시킴 (기존 radius + 8에서 radius + 10으로 조정)
    const barY = screenY + this.player.radius + 10;

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.ctx.fillRect(barX, barY, barWidth, barHeight);

    const hpPercent = Math.max(this.player.hp / this.player.maxHp, 0);
    this.ctx.fillStyle = hpPercent > 0.3 ? '#00f2fe' : '#ff007f';
    this.ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);

    this.ctx.restore();
  }

  drawGrid() {
    const gridSize = 60;
    const startX = Math.floor(this.camera.x / gridSize) * gridSize;
    const startY = Math.floor(this.camera.y / gridSize) * gridSize;
    const endX = startX + this.virtualWidth + gridSize;
    const endY = startY + this.virtualHeight + gridSize;

    this.ctx.strokeStyle = 'rgba(0, 242, 254, 0.04)';
    this.ctx.lineWidth = 1;

    for (let x = startX; x <= endX; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, startY);
      this.ctx.lineTo(x, endY);
      this.ctx.stroke();
    }

    for (let y = startY; y <= endY; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(startX, y);
      this.ctx.lineTo(endX, y);
      this.ctx.stroke();
    }
  }

  drawJoystickUI() {
    if (!this.joystick.active) return;

    this.ctx.save();
    
    this.ctx.beginPath();
    this.ctx.arc(this.joystick.startX, this.joystick.startY, this.joystick.maxRadius, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(0, 242, 254, 0.04)';
    this.ctx.strokeStyle = 'rgba(0, 242, 254, 0.2)';
    this.ctx.lineWidth = 2;
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.arc(this.joystick.currentX, this.joystick.currentY, 20, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(0, 242, 254, 0.6)';
    this.ctx.shadowColor = '#00f2fe';
    this.ctx.shadowBlur = 10;
    this.ctx.fill();

    this.ctx.restore();
  }
}
