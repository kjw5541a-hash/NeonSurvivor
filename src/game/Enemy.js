// Vite 빌드 시 몬스터 이미지 파일이 번들링 과정에서 자동 해싱 매핑되도록 정적 임포트 처리
import slime1WalkImg from '../assets/Slime1_Walk_with_shadow.png';
import slime1HurtImg from '../assets/Slime1_Hurt_with_shadow.png';
import slime1DeathImg from '../assets/Slime1_Death_with_shadow.png'; 
import slime2WalkImg from '../assets/Slime2_Walk_with_shadow.png';
import slime2RunImg from '../assets/Slime2_Run_with_shadow.png';
import slime2HurtImg from '../assets/Slime2_Hurt_with_shadow.png';
import slime2DeathImg from '../assets/Slime2_Death_with_shadow.png';
// 세 번째 슬라임 (Slime3) 정적 임포트 추가
import slime3WalkImg from '../assets/Slime3_Walk_with_shadow.png';
import slime3DeathImg from '../assets/Slime3_Death_with_shadow.png';
import slime3AttachImg from '../assets/Slime3_Attach_with_shadow.png';

export class Enemy {
  constructor(x, y, type = 'standard') {
    this.x = x;
    this.y = y;
    this.type = type;
    
    // 사망 처리 예약 상태 (사망 애니메이션 끝날 때까지 대기)
    this.isDead = false;
    this.dying = false;
    this.deathTimer = 0;
    this.maxDeathDuration = 50; 

    // 피격 시 넉백 물리
    this.knockbackX = 0;
    this.knockbackY = 0;
    this.knockbackFriction = 0.85;

    // 타격 연속 무적 쿨타임 (피격 애니메이션 지속시간과 연계)
    this.invincibilityFrames = 0;
    this.maxInvincibilityFrames = 10; 

    // 상태이상 스탯
    this.burnTimer = 0;
    this.burnDamage = 0;
    this.burnInterval = 30; 
    this.burnIntervalTimer = 0;
    this.freezeTimer = 0;

    // 1. 기본 슬라임 (standard) 애니메이션 리소스 바인딩 (사망 포함)
    if (this.type === 'standard') {
      this.spriteWalk = new Image();
      this.spriteWalk.src = slime1WalkImg; 
      this.spriteHurt = new Image();
      this.spriteHurt.src = slime1HurtImg; 
      this.spriteDeath = new Image();
      this.spriteDeath.src = slime1DeathImg;

      this.frameWidth = 64;
      this.frameHeight = 64;
      this.totalWalkFrames = 8;
      this.totalHurtFrames = 5;
      this.totalDeathFrames = 10; 
      
      this.currentFrame = 0;
      this.animTimer = 0;
      this.animSpeed = 6;
      this.row = 0; 
    }

    // 2. 두 번째 슬라임 (fast) 애니메이션 리소스 바인딩 (달리기/사망 포함)
    if (this.type === 'fast') {
      this.spriteWalk = new Image();
      this.spriteWalk.src = slime2WalkImg;
      this.spriteRun = new Image();
      this.spriteRun.src = slime2RunImg;
      this.spriteHurt = new Image();
      this.spriteHurt.src = slime2HurtImg;
      this.spriteDeath = new Image();
      this.spriteDeath.src = slime2DeathImg;

      this.frameWidth = 64;
      this.frameHeight = 64;
      this.totalWalkFrames = 8;
      this.totalRunFrames = 8;
      this.totalHurtFrames = 5;
      this.totalDeathFrames = 10; 
      
      this.currentFrame = 0;
      this.animTimer = 0;
      this.animSpeed = 6;
      this.row = 0;

      // AI 돌격 패턴 파라미터
      this.aiState = 'walk'; 
      this.runTimer = 0;
      this.runCooldown = 0;
    }

    // 3. 세 번째 슬라임 (tank_heal) 애니메이션 리소스 바인딩
    if (this.type === 'tank_heal') {
      this.spriteWalk = new Image();
      this.spriteWalk.src = slime3WalkImg;
      this.spriteDeath = new Image();
      this.spriteDeath.src = slime3DeathImg;
      this.spriteAttach = new Image();
      this.spriteAttach.src = slime3AttachImg;

      this.frameWidth = 64; // 512 / 8 = 64px
      this.frameHeight = 64; // 256 / 4 = 64px (4방향 정식 시트 적용)
      this.totalWalkFrames = 8;
      this.totalDeathFrames = 10;
      this.totalAttachFrames = 9;

      this.currentFrame = 0;
      this.animTimer = 0;
      this.animSpeed = 6;
      this.row = 0;
      this.facingRight = true;

      // AI FSM 패턴 변수
      this.aiState = 'wander'; 
      this.wanderTimer = 0;
      this.wanderVx = 0;
      this.wanderVy = 0;
    }

    this.setupStats();
  }

  setupStats() {
    switch (this.type) {
      case 'fast':
        this.radius = 11;
        this.speed = 1.9; 
        this.hp = 12;
        this.maxHp = 12;
        this.damage = 6;
        this.xpValue = 1;
        this.color = '#00f2fe'; 
        this.points = 4; 
        break;
      case 'tank':
        this.radius = 24;
        this.speed = 0.9;
        this.hp = 70;
        this.maxHp = 70;
        this.damage = 18;
        this.xpValue = 5;
        this.color = '#bd00ff'; 
        this.points = 6; 
        break;
      case 'boss':
        this.radius = 35;
        this.speed = 1.1;
        this.hp = 600;
        this.maxHp = 600;
        this.damage = 30;
        this.xpValue = 50; 
        this.color = '#ff007f'; 
        this.points = 8; 
        break;
      case 'tank_heal':
        // 1, 2번 슬라임의 70% 크기 (1번 반경 14 기준 70% -> 10)
        this.radius = 10;
        this.speed = 1.0; // 느린 속도
        this.hp = 35; // 튼튼한 체력
        this.maxHp = 35;
        this.damage = 12;
        this.xpValue = 3; // 치료하는 녀석이므로 보상 증가
        this.color = '#ffaa00'; // 노란 불기둥 색
        this.points = 0;
        break;
      case 'standard':
      default:
        this.radius = 14;
        this.speed = 1.4;
        this.hp = 20;
        this.maxHp = 20;
        this.damage = 10;
        this.xpValue = 1;
        this.color = '#ff3333'; 
        this.points = 0; 
        break;
    }
  }

  applyBurn(duration, damagePerTick) {
    if (this.dying) return;
    this.burnTimer = Math.max(this.burnTimer, duration);
    this.burnDamage = Math.max(this.burnDamage, damagePerTick);
  }

  applyFreeze(duration) {
    if (this.dying) return;
    this.freezeTimer = Math.max(this.freezeTimer, duration);
  }

  takeDamage(amount, particles) {
    if (this.invincibilityFrames > 0 || this.dying) return;
    
    let damageToTake = amount;
    if (this.freezeTimer > 0) {
      damageToTake = amount * 1.5;
      this.freezeTimer = 0; 
      
      const shardCount = 8;
      for (let i = 0; i < shardCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 4;
        particles.push({
          type: 'spark',
          x: this.x,
          y: this.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: '#00f2fe', 
          radius: 1.5 + Math.random() * 2,
          life: 25,
          maxLife: 25
        });
      }
    }

    this.hp -= damageToTake;
    this.invincibilityFrames = this.maxInvincibilityFrames;

    if (this.type === 'standard' || this.type === 'fast' || this.type === 'tank_heal') {
      this.currentFrame = 0;
      this.animTimer = 0;
    }

    particles.push({
      type: 'damage_text',
      x: this.x,
      y: this.y - this.radius - 5,
      text: Math.round(damageToTake),
      color: '#ffffff',
      life: 30,
      maxLife: 30
    });

    const sparkCount = 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < sparkCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      particles.push({
        type: 'spark',
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: this.color,
        radius: 2 + Math.random() * 2,
        life: 20 + Math.random() * 15,
        maxLife: 35
      });
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.dying = true;
      
      // 10프레임 사망 애니메이션 상영 시간 설정
      if (this.type === 'standard' || this.type === 'fast' || this.type === 'tank_heal') {
        this.maxDeathDuration = 50; 
        this.deathTimer = 50;
      } else {
        this.maxDeathDuration = 15;
        this.deathTimer = 15;
      }
    }
  }

  update(player, particles) {
    if (this.invincibilityFrames > 0) {
      this.invincibilityFrames--;
    }

    if (this.dying) {
      this.x += this.knockbackX;
      this.y += this.knockbackY;
      this.knockbackX *= this.knockbackFriction;
      this.knockbackY *= this.knockbackFriction;

      this.deathTimer--;
      if (this.deathTimer <= 0) {
        this.isDead = true; 
      }
      return;
    }

    if (this.freezeTimer > 0) {
      this.freezeTimer--;
      this.knockbackX = 0;
      this.knockbackY = 0;
      
      if (Math.random() < 0.08) {
        particles.push({
          type: 'spark',
          x: this.x + (Math.random() - 0.5) * this.radius * 2,
          y: this.y + (Math.random() - 0.5) * this.radius * 2,
          vx: 0,
          vy: -0.5,
          color: '#e0f7fa',
          radius: 1,
          life: 15,
          maxLife: 15
        });
      }
      return; 
    }

    if (this.burnTimer > 0) {
      this.burnTimer--;
      this.burnIntervalTimer--;

      if (this.burnIntervalTimer <= 0) {
        this.hp -= this.burnDamage;
        this.burnIntervalTimer = this.burnInterval;

        particles.push({
          type: 'damage_text',
          x: this.x,
          y: this.y - this.radius - 5,
          text: Math.round(this.burnDamage),
          color: '#ff6a00',
          life: 25,
          maxLife: 25
        });

        if (this.hp <= 0) {
          this.hp = 0;
          this.dying = true;
          this.maxDeathDuration = (this.type === 'fast' || this.type === 'standard' || this.type === 'tank_heal') ? 50 : 15;
          this.deathTimer = this.maxDeathDuration;
          return;
        }
      }

      if (Math.random() < 0.05) { // 스폰 빈도 20%에서 5%로 하향 조정
        particles.push({
          type: 'spark',
          x: this.x + (Math.random() - 0.5) * this.radius * 1.5,
          y: this.y + (Math.random() - 0.5) * this.radius * 1.5,
          vx: (Math.random() - 0.5) * 1.5,
          vy: -1 - Math.random(),
          color: '#ff5722',
          radius: 1 + Math.random(),
          life: 15,
          maxLife: 15
        });
      }
    }

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
      this.x += this.knockbackX;
      this.y += this.knockbackY;
      
      this.knockbackX *= this.knockbackFriction;
      this.knockbackY *= this.knockbackFriction;

      // 4. 슬라임2 (fast) 3단계 FSM 돌격 패턴 제어
      if (this.type === 'fast') {
        if (this.aiState === 'walk') {
          if (this.runCooldown > 0) this.runCooldown--;
          
          if (this.runCooldown <= 0 && dist < 160) {
            this.aiState = 'aim';
            this.aimTimer = 24; 
            this.dashTargetX = player.x; 
            this.dashTargetY = player.y;
            this.speed = 0;
            this.currentFrame = 0;
            this.animTimer = 0;
          }
        } else if (this.aiState === 'aim') {
          this.speed = 0; 
          this.aimTimer--;
          if (this.aimTimer <= 0) {
            this.aiState = 'dash';
            this.dashTimer = 22; 
            this.dashAngle = Math.atan2(this.dashTargetY - this.y, this.dashTargetX - this.x);
            this.speed = 6.2; 
            this.currentFrame = 0;
            this.animTimer = 0;
          }
        } else if (this.aiState === 'dash') {
          this.dashTimer--;
          this.speed = 6.2;
          if (this.dashTimer <= 0) {
            this.aiState = 'walk';
            this.runCooldown = 120;
            this.speed = 1.9;
            this.currentFrame = 0;
            this.animTimer = 0;
          }
        }
      }

      // 4.5 세 번째 슬라임 (tank_heal) FSM AI 패턴 제어
      if (this.type === 'tank_heal') {
        const hpPercent = this.hp / this.maxHp;

        // 1. 체력이 30% 이하가 되면 자가 치유(heal) 모드로 전격 진입
        if (hpPercent <= 0.3 && this.aiState !== 'heal') {
          this.aiState = 'heal';
          this.speed = 0;
          this.currentFrame = 0;
          this.animTimer = 0;
        }

        // 2. 상태별 AI 처리
        if (this.aiState === 'heal') {
          this.speed = 0;

          // 프레임당 체력 점진 회복 (초당 약 8% 회복 -> 프레임당 약 0.05hp 회복)
          this.hp = Math.min(this.hp + 0.05, this.maxHp);

          // 힐링 중 연두색 스파크 방출 연출
          if (Math.random() < 0.15) {
            particles.push({
              type: 'spark',
              x: this.x + (Math.random() - 0.5) * this.radius * 2,
              y: this.y + (Math.random() - 0.5) * this.radius * 2,
              vx: 0,
              vy: -1 - Math.random() * 0.5,
              color: '#39ff14', // 형광 녹색 힐 스파크
              radius: 1.5,
              life: 20,
              maxLife: 20
            });
          }

          // 최대 체력의 70% 이상 채워지면 방황 모드로 정상 복귀
          if (this.hp >= this.maxHp * 0.7) {
            this.aiState = 'wander';
            this.wanderTimer = 0;
          }
        } else {
          // 치유 상태가 아닐 때
          if (dist < 150) {
            // 사정거리 내에 들어오면 돌격
            this.aiState = 'dash';
            this.speed = 3.2;
          } else {
            // 사정거리 밖에서는 랜덤 방황
            if (this.aiState !== 'wander') {
              this.aiState = 'wander';
              this.wanderTimer = 0;
            }

            this.speed = 0.5; // 방황은 매우 천천히
            this.wanderTimer--;

            if (this.wanderTimer <= 0) {
              // 1~2초 동안 임의의 방황 벡터 계산
              this.wanderTimer = 60 + Math.random() * 60;
              const randomAngle = Math.random() * Math.PI * 2;
              this.wanderVx = Math.cos(randomAngle);
              this.wanderVy = Math.sin(randomAngle);
            }
          }
        }
      }

      // 각 몹의 FSM 속도를 기반으로 위치 갱신
      if (this.type === 'fast' && this.aiState === 'dash') {
        this.x += Math.cos(this.dashAngle) * this.speed;
        this.y += Math.sin(this.dashAngle) * this.speed;
      } else if (this.type === 'tank_heal') {
        if (this.aiState === 'heal') {
          // 치유 중 정지
          this.x += this.knockbackX;
          this.y += this.knockbackY;
        } else if (this.aiState === 'wander') {
          this.x += this.knockbackX + this.wanderVx * this.speed;
          this.y += this.knockbackY + this.wanderVy * this.speed;
        } else if (this.aiState === 'dash') {
          this.x += this.knockbackX + (dx / dist) * this.speed;
          this.y += this.knockbackY + (dy / dist) * this.speed;
        }
      } else {
        this.x += (dx / dist) * this.speed;
        this.y += (dy / dist) * this.speed;
      }

      // 5. 방향별 스프라이트 행(row) 선택 및 애니메이션 제어
      if (this.type === 'standard' || this.type === 'fast' || this.type === 'tank_heal') {
        let checkDx = dx;
        let checkDy = dy;

        if (this.type === 'fast' && (this.aiState === 'aim' || this.aiState === 'dash')) {
          checkDx = this.dashTargetX - this.x;
          checkDy = this.dashTargetY - this.y;
        }

        if (Math.abs(checkDy) > Math.abs(checkDx)) {
          this.row = checkDy > 0 ? 0 : 1; 
        } else {
          this.row = checkDx > 0 ? 3 : 2; 
        }

        this.facingRight = checkDx >= 0;

        // 피격 무적 프레임 동안에는 애니메이션 갱신 정지
        if (this.invincibilityFrames <= 0) {
          this.animTimer++;
          
          let speedLimit = this.animSpeed;
          let frameLimit = this.totalWalkFrames;

          if (this.type === 'fast') {
            if (this.aiState === 'aim') {
              speedLimit = 3; 
              frameLimit = this.totalRunFrames;
            } else if (this.aiState === 'dash') {
              speedLimit = 4; 
              frameLimit = this.totalRunFrames;
            }
          } else if (this.type === 'tank_heal') {
            if (this.aiState === 'heal') {
              speedLimit = 5; // 불기둥 기 모으는 속도
              frameLimit = this.totalAttachFrames;
            } else {
              speedLimit = 6;
              frameLimit = this.totalWalkFrames;
            }
          }

          if (this.animTimer % speedLimit === 0) {
            this.currentFrame = (this.currentFrame + 1) % frameLimit;
          }
        }
      }
    }
  }

  applyKnockback(fromX, fromY, force = 4) {
    if (this.freezeTimer > 0 || this.dying) return; 

    const dx = this.x - fromX;
    const dy = this.y - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) {
      this.knockbackX += (dx / dist) * force;
      this.knockbackY += (dy / dist) * force;
    }
  }

  draw(ctx) {
    ctx.save();

    let renderColor = this.color;
    let shadowColor = this.color;
    let shadowBlur = 10;

    if (this.freezeTimer > 0) {
      renderColor = '#00f2fe';
      shadowColor = '#00f2fe';
      shadowBlur = 15;
    } else if (this.burnTimer > 0) {
      renderColor = '#ff3c00';
      shadowColor = '#ff6a00';
      shadowBlur = 12;
    }

    if (this.type === 'standard') {
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = shadowBlur;

      const drawSize = this.radius * 8.3; 
      
      let activeSprite;
      let frameIndex;

      if (this.dying) {
        activeSprite = this.spriteDeath;
        const progress = Math.max(this.maxDeathDuration - this.deathTimer, 0);
        frameIndex = Math.floor(progress / (this.maxDeathDuration / this.totalDeathFrames));
        frameIndex = Math.min(frameIndex, this.totalDeathFrames - 1); 
      } else if (this.invincibilityFrames > 0) {
        activeSprite = this.spriteHurt;
        frameIndex = Math.floor((this.maxInvincibilityFrames - this.invincibilityFrames) / 2) % this.totalHurtFrames;
      } else {
        activeSprite = this.spriteWalk;
        frameIndex = this.currentFrame;
      }

      const sx = frameIndex * this.frameWidth;
      const sy = this.row * this.frameHeight;

      ctx.drawImage(
        activeSprite,
        sx, sy, this.frameWidth, this.frameHeight,
        this.x - drawSize / 2, this.y - drawSize / 2, drawSize, drawSize
      );

    } else if (this.type === 'fast') {
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = shadowBlur;

      const drawSize = this.radius * 8.3; 
      
      let activeSprite;
      let frameIndex;

      if (this.dying) {
        activeSprite = this.spriteDeath;
        const progress = Math.max(this.maxDeathDuration - this.deathTimer, 0);
        frameIndex = Math.floor(progress / (this.maxDeathDuration / this.totalDeathFrames));
        frameIndex = Math.min(frameIndex, this.totalDeathFrames - 1); 
      } else if (this.invincibilityFrames > 0) {
        activeSprite = this.spriteHurt;
        frameIndex = Math.floor((this.maxInvincibilityFrames - this.invincibilityFrames) / 2) % this.totalHurtFrames;
      } else if (this.aiState === 'aim' || this.aiState === 'dash') {
        activeSprite = this.spriteRun;
        frameIndex = this.currentFrame;
      } else {
        activeSprite = this.spriteWalk;
        frameIndex = this.currentFrame;
      }

      const sx = frameIndex * this.frameWidth;
      const sy = this.row * this.frameHeight;

      ctx.drawImage(
        activeSprite,
        sx, sy, this.frameWidth, this.frameHeight,
        this.x - drawSize / 2, this.y - drawSize / 2, drawSize, drawSize
      );

    } else if (this.type === 'tank_heal') {
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = shadowBlur;

      const drawSize = this.radius * 8.3; // 83px 너비 기준
      
      let activeSprite;
      let frameIndex;
      let isDeathOrAttach = false;
      let fw = 64;
      let fh = 64;

      if (this.dying) {
        activeSprite = this.spriteDeath;
        const progress = Math.max(this.maxDeathDuration - this.deathTimer, 0);
        frameIndex = Math.floor(progress / (this.maxDeathDuration / this.totalDeathFrames));
        frameIndex = Math.min(frameIndex, this.totalDeathFrames - 1); 
        isDeathOrAttach = true;
        fw = 58.7; 
        fh = 256;  
      } else if (this.aiState === 'heal') {
        activeSprite = this.spriteAttach;
        frameIndex = this.currentFrame;
        isDeathOrAttach = true;
        fw = 64.4; 
        fh = 256;  
      } else {
        activeSprite = this.spriteWalk;
        frameIndex = this.currentFrame;
        fw = 64;   
        fh = 64;   
      }

      ctx.save();
      ctx.translate(this.x, this.y);

      // Walk 상태일 때만 좌우 방향에 따른 대칭 반전
      if (!isDeathOrAttach && !this.facingRight) {
        ctx.scale(-1, 1);
      }

      const sx = frameIndex * fw;
      const sy = this.row * fh; // 3종 에셋 모두 4개 방향 row 적용

      // 상하 여백 캔버스를 1:1 비율인 drawSize 정사각형 크기로 맞춰 그립니다.
      ctx.drawImage(
        activeSprite,
        sx, sy, fw, fh,
        -drawSize / 2, -drawSize / 2, drawSize, drawSize
      );
      ctx.restore();

    } else {
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = shadowBlur;
      ctx.fillStyle = renderColor;

      if (this.points > 0) {
        ctx.beginPath();
        for (let i = 0; i < this.points; i++) {
          const angle = (Math.PI * 2 / this.points) * i;
          const x = this.x + Math.cos(angle) * this.radius;
          const y = this.y + Math.sin(angle) * this.radius;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.shadowBlur = 0;
      ctx.strokeStyle = this.freezeTimer > 0 ? '#e0f7fa' : '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    if (this.hp < this.maxHp && !this.dying) {
      const barWidth = this.radius * 2;
      const barHeight = 4;
      const barX = this.x - this.radius;
      const barY = this.y - this.radius - 10;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(barX, barY, barWidth, barHeight);

      const hpPercent = Math.max(this.hp / this.maxHp, 0);
      ctx.fillStyle = renderColor;
      ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
    }

    ctx.restore();
  }
}
export default Enemy;
