// Vite 빌드 시 몬스터 이미지 파일이 번들링 과정에서 자동 해싱 매핑되도록 정적 임포트 처리
import slime1WalkImg from '../assets/Slime1_Walk_with_shadow.png';
import slime1HurtImg from '../assets/Slime1_Hurt_with_shadow.png';
import slime1DeathImg from '../assets/Slime1_Death_with_shadow.png'; // 새로 추가
import slime2WalkImg from '../assets/Slime2_Walk_with_shadow.png';
import slime2RunImg from '../assets/Slime2_Run_with_shadow.png';
import slime2HurtImg from '../assets/Slime2_Hurt_with_shadow.png';
import slime2DeathImg from '../assets/Slime2_Death_with_shadow.png';

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
      this.totalDeathFrames = 10; // 10프레임 사망 시트
      
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

    if (this.type === 'standard' || this.type === 'fast') {
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
      
      // standard 와 fast 모두 사망 10프레임 지원 연출 설정
      if (this.type === 'standard' || this.type === 'fast') {
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
          this.maxDeathDuration = (this.type === 'fast' || this.type === 'standard') ? 50 : 15;
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

      if (this.type === 'fast') {
        if (this.aiState === 'walk') {
          if (this.runCooldown > 0) this.runCooldown--;
          
          if (this.runCooldown <= 0 && dist < 150) {
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

      if (this.type === 'fast' && this.aiState === 'dash') {
        this.x += Math.cos(this.dashAngle) * this.speed;
        this.y += Math.sin(this.dashAngle) * this.speed;
      } else {
        this.x += (dx / dist) * this.speed;
        this.y += (dy / dist) * this.speed;
      }

      if (this.type === 'standard' || this.type === 'fast') {
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
        // 슬라임1 사망 이미지 지원 적용 (10프레임 시트 순환 재생)
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
