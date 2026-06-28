export class Enemy {
  constructor(x, y, type = 'standard') {
    this.x = x;
    this.y = y;
    this.type = type;
    
    // 사망 처리 예약 상태 (사망 애니메이션 끝날 때까지 대기)
    this.isDead = false;
    this.dying = false;
    this.deathTimer = 0;
    this.maxDeathDuration = 50; // 기본 사망 연출 프레임수

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

    // 1. 기본 슬라임 (standard) 애니메이션 리소스 바인딩
    if (this.type === 'standard') {
      this.spriteWalk = new Image();
      this.spriteWalk.src = '/src/assets/Slime1_Walk_with_shadow.png'; 
      this.spriteHurt = new Image();
      this.spriteHurt.src = '/src/assets/Slime1_Hurt_with_shadow.png'; 

      this.frameWidth = 64;
      this.frameHeight = 64;
      this.totalWalkFrames = 8;
      this.totalHurtFrames = 5;
      
      this.currentFrame = 0;
      this.animTimer = 0;
      this.animSpeed = 6;
      this.row = 0; 
    }

    // 2. 두 번째 슬라임 (fast) 애니메이션 리소스 바인딩 (달리기/사망 포함)
    if (this.type === 'fast') {
      this.spriteWalk = new Image();
      this.spriteWalk.src = '/src/assets/Slime2_Walk_with_shadow.png';
      this.spriteRun = new Image();
      this.spriteRun.src = '/src/assets/Slime2_Run_with_shadow.png';
      this.spriteHurt = new Image();
      this.spriteHurt.src = '/src/assets/Slime2_Hurt_with_shadow.png';
      this.spriteDeath = new Image();
      this.spriteDeath.src = '/src/assets/Slime2_Death_with_shadow.png';

      this.frameWidth = 64;
      this.frameHeight = 64;
      this.totalWalkFrames = 8;
      this.totalRunFrames = 8;
      this.totalHurtFrames = 5;
      this.totalDeathFrames = 10; // 사망 10프레임
      
      this.currentFrame = 0;
      this.animTimer = 0;
      this.animSpeed = 6;
      this.row = 0;

      // AI 돌격 패턴 파라미터
      this.aiState = 'walk'; // 'walk', 'run'
      this.runTimer = 0;
      this.runCooldown = 0;
    }

    this.setupStats();
  }

  setupStats() {
    switch (this.type) {
      case 'fast':
        this.radius = 11;
        this.speed = 1.9; // 기본 걷기 속도
        this.hp = 12;
        this.maxHp = 12;
        this.damage = 6;
        this.xpValue = 1;
        this.color = '#00f2fe'; // 네온 블루
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

    // 피격 시 프레임 리셋
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
      
      // 사망 애니메이션 연출 타임 돌입
      if (this.type === 'fast') {
        this.maxDeathDuration = 50; // 50프레임 동안 사망 애니메이션 상영
        this.deathTimer = 50;
      } else {
        // 사망 애니메이션이 제공되지 않는 일반/특수 몬스터는 짧은 연출 뒤 소멸
        this.maxDeathDuration = 15;
        this.deathTimer = 15;
      }
    }
  }

  update(player, particles) {
    if (this.invincibilityFrames > 0) {
      this.invincibilityFrames--;
    }

    // 1. 사망 중(dying) 상태 처리
    if (this.dying) {
      this.x += this.knockbackX;
      this.y += this.knockbackY;
      this.knockbackX *= this.knockbackFriction;
      this.knockbackY *= this.knockbackFriction;

      this.deathTimer--;
      if (this.deathTimer <= 0) {
        this.isDead = true; // 최종 삭제 승격
      }
      return;
    }

    // 2. 빙결 상태 처리
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

    // 3. 화상 상태 처리
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
          this.maxDeathDuration = this.type === 'fast' ? 50 : 15;
          this.deathTimer = this.maxDeathDuration;
          return;
        }
      }

      if (Math.random() < 0.2) {
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

    // 4. 물리 및 플레이어 추적 이동
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
      this.x += this.knockbackX;
      this.y += this.knockbackY;
      
      this.knockbackX *= this.knockbackFriction;
      this.knockbackY *= this.knockbackFriction;

      // 슬라임2 (fast) 돌격 기계적 AI 상태 전환
      if (this.type === 'fast') {
        if (this.aiState === 'walk') {
          if (this.runCooldown > 0) this.runCooldown--;
          
          // 거리가 150px 이하로 좁혀지면 돌격 상태로 전환
          if (this.runCooldown <= 0 && dist < 150) {
            this.aiState = 'run';
            this.runTimer = 60; // 1초간 돌격
            this.currentFrame = 0;
            this.animTimer = 0;
          }
        } else if (this.aiState === 'run') {
          this.runTimer--;
          // 1초 돌격이 종료되면 1.5초(90프레임) 걷기 쿨다운 적용
          if (this.runTimer <= 0) {
            this.aiState = 'walk';
            this.runCooldown = 90;
            this.currentFrame = 0;
            this.animTimer = 0;
          }
        }

        // 상태별 속도 배정
        this.speed = this.aiState === 'run' ? 3.8 : 1.9;
      }

      this.x += (dx / dist) * this.speed;
      this.y += (dy / dist) * this.speed;

      // 5. 방향별 스프라이트 행(row) 선택 및 애니메이션 제어
      if (this.type === 'standard' || this.type === 'fast') {
        if (Math.abs(dy) > Math.abs(dx)) {
          this.row = dy > 0 ? 0 : 1; 
        } else {
          this.row = dx > 0 ? 3 : 2; 
        }

        // 피격 무적 프레임 동안에는 애니메이션 갱신 정지
        if (this.invincibilityFrames <= 0) {
          this.animTimer++;
          
          let speedLimit = this.animSpeed;
          let frameLimit = this.totalWalkFrames;

          if (this.type === 'fast' && this.aiState === 'run') {
            speedLimit = 4; // 뛰어갈 때는 발을 매우 빠르게 움직임
            frameLimit = this.totalRunFrames;
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

    // 1. 슬라임1(standard) 그리기
    if (this.type === 'standard') {
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = shadowBlur;

      const drawSize = this.radius * 8.3; 
      
      let activeSprite;
      let frameIndex;

      if (this.dying) {
        // 슬라임1은 사망 시 걷기 모션에서 스무스하게 페이드아웃 연출
        ctx.globalAlpha = Math.max(this.deathTimer / this.maxDeathDuration, 0);
        activeSprite = this.spriteWalk;
        frameIndex = this.currentFrame;
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

    // 2. 슬라임2(fast) 그리기 (걷기, 달리기, 피격, 사망 전 스프라이트 지원)
    } else if (this.type === 'fast') {
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = shadowBlur;

      // 슬라임1과 완전히 일치하는 비주얼/물리 비율 (8.3배 적용)
      const drawSize = this.radius * 8.3; // 11 * 8.3 = 91.3px (물리반지름 11에 정확히 비례 정렬)
      
      let activeSprite;
      let frameIndex;

      if (this.dying) {
        // 사망 상태: Slime2_Death_with_shadow.png 사용 (10프레임)
        activeSprite = this.spriteDeath;
        const progress = Math.max(this.maxDeathDuration - this.deathTimer, 0);
        frameIndex = Math.floor(progress / (this.maxDeathDuration / this.totalDeathFrames));
        frameIndex = Math.min(frameIndex, this.totalDeathFrames - 1); // 마지막 프레임 고정
      } else if (this.invincibilityFrames > 0) {
        // 피격 상태: Slime2_Hurt_with_shadow.png 사용 (5프레임)
        activeSprite = this.spriteHurt;
        frameIndex = Math.floor((this.maxInvincibilityFrames - this.invincibilityFrames) / 2) % this.totalHurtFrames;
      } else if (this.aiState === 'run') {
        // 돌격 상태: Slime2_Run_with_shadow.png 사용 (8프레임)
        activeSprite = this.spriteRun;
        frameIndex = this.currentFrame;
      } else {
        // 일반 걷기: Slime2_Walk_with_shadow.png 사용 (8프레임)
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
      // 3. 기타 탱크, 보스 몬스터 기하학 다각형 렌더링
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

    // 체력 바 그리기 (사망 중이 아닐 때만 노출)
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
