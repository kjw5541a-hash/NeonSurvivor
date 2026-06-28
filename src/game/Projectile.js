export class Projectile {
  constructor(x, y, angle, speed, damage, radius, color = '#ffe600', type = 'bullet', extra = {}) {
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.damage = damage;
    this.radius = radius;
    this.color = color;
    this.type = type; // 'bullet', 'boomerang', 'grenade', 'mine', 'dagger'
    this.extra = extra;
    
    this.life = 120; 
    this.isDead = false;
    this.history = [];
    this.maxHistory = 6;

    // 관통 연동용
    this.piercing = false;
    this.hitEnemies = new Set();

    // 부메랑 검기용 전용 물리
    if (this.type === 'boomerang') {
      this.phase = 'forward'; 
      this.forwardDuration = 25; 
      this.returnSpeed = speed * 1.3;
      this.piercing = true;
    }

    // 플라즈마 지뢰 전용 물리 (적이 근처에 오면 빨간색으로 깜빡이다 폭발)
    if (this.type === 'mine') {
      this.vx = 0;
      this.vy = 0;
      this.life = 600; // 10초 대기
      this.explodeRadius = extra.explodeRadius || 60;
      this.isTriggered = false;
      this.triggerTimer = 0;
      this.triggerDuration = 30; // 0.5초간 감지 깜빡임
    }

    // 수류탄(Grenade)용 전용 물리
    if (this.type === 'grenade') {
      this.startX = x;
      this.startY = y;
      this.targetX = extra.targetX;
      this.targetY = extra.targetY;
      this.duration = extra.duration || 65; // 사용자의 수류탄 속도 하향 요청 반영
      this.elapsed = 0;
      this.explodeRadius = extra.explodeRadius || 60;
    }

    // 단검(Dagger)용 전용 물리 (관통 및 화면 경계 낙하 정지)
    if (this.type === 'dagger') {
      this.piercing = true;
      this.isDropped = false; // 화면 끝에 도착해 바닥에 떨어진 상태
      this.magnetSpeed = 0;
      this.life = 40; // 40프레임 동안 날아감
    }
  }

  update(player, enemies) {
    this.history.push({ x: this.x, y: this.y });
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // 1. 단검 업데이트 (날아가는 중 vs 바닥 정지 후 회수 대기)
    if (this.type === 'dagger') {
      if (!this.isDropped) {
        // 비행 중
        this.x += this.vx;
        this.y += this.vy;
        this.life--;

        if (this.life <= 0) {
          this.isDropped = true;
          this.vx = 0;
          this.vy = 0;
        }
      } else {
        // 바닥에 정지한 상태: 플레이어 자석 범위에 끌림
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // 회수가 용이하게 넓은 획득 범위 설정
        if (dist < player.magnetRange * 1.5) {
          this.magnetSpeed = Math.min(this.magnetSpeed + 0.6, 12);
          this.x += (dx / dist) * this.magnetSpeed;
          this.y += (dy / dist) * this.magnetSpeed;

          if (dist < player.radius + this.radius) {
            this.isDead = true; // 플레이어 획득 완료 (소멸 후 엔진에서 쿨타임 리셋)
          }
        }
      }
      return;
    }

    // 2. 수류탄 포물선 업데이트
    if (this.type === 'grenade') {
      this.elapsed++;
      const t = this.elapsed / this.duration;
      
      if (t >= 1) {
        this.x = this.targetX;
        this.y = this.targetY;
        this.isDead = true; 
      } else {
        this.x = this.startX + (this.targetX - this.startX) * t;
        this.y = this.startY + (this.targetY - this.startY) * t;
      }
      return;
    }

    // 3. 부메랑 검기 업데이트
    if (this.type === 'boomerang') {
      if (this.phase === 'forward') {
        this.x += this.vx;
        this.y += this.vy;
        this.forwardDuration--;
        if (this.forwardDuration <= 0) {
          this.phase = 'return';
        }
      } else if (this.phase === 'return' && player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 5) {
          this.x += (dx / dist) * this.returnSpeed;
          this.y += (dy / dist) * this.returnSpeed;
        } else {
          this.isDead = true; 
        }
      }
      return;
    }

    // 4. 플라즈마 지뢰 업데이트 (적 감지 시 빨간색 깜빡임)
    if (this.type === 'mine') {
      if (!this.isTriggered) {
        this.life--;
        if (this.life <= 0) {
          this.isDead = true;
        }

        // 주변 70px 이내 적 감지 체크
        if (enemies && enemies.length > 0) {
          for (let enemy of enemies) {
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 70) {
              this.isTriggered = true;
              this.triggerTimer = this.triggerDuration;
              break;
            }
          }
        }
      } else {
        // 감지되어 0.5초(30프레임) 동안 빨갛게 깜빡이다 기폭
        this.triggerTimer--;
        if (this.triggerTimer <= 0) {
          this.isDead = true;
        }
      }
      return;
    }

    // 5. 일반 탄알 업데이트
    this.x += this.vx;
    this.y += this.vy;

    this.life--;
    if (this.life <= 0) {
      this.isDead = true;
    }
  }

  draw(ctx) {
    ctx.save();

    if (this.history.length > 1 && this.type !== 'mine' && (!this.isDropped)) {
      ctx.beginPath();
      ctx.moveTo(this.history[0].x, this.history[0].y);
      for (let i = 1; i < this.history.length; i++) {
        ctx.lineTo(this.history[i].x, this.history[i].y);
      }
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.radius * 0.8;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.25;
      ctx.stroke();
    }

    ctx.globalAlpha = 1.0;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8;

    if (this.type === 'grenade') {
      const t = this.elapsed / this.duration;
      const height = -Math.sin(t * Math.PI) * 45; 
      
      ctx.shadowBlur = 3;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 0.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 10;
      ctx.shadowColor = this.color;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y + height, this.radius, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

    } else if (this.type === 'mine') {
      // 적 감지 여부에 따라 렌더링 색상 분기 (작동 시 빨간색 깜빡임)
      let mineColor = '#00f2fe';
      let shadowColor = '#00f2fe';
      let blinkSpeed = 0.01;

      if (this.isTriggered) {
        mineColor = '#ff003c'; // 감지 시 네온 레드
        shadowColor = '#ff003c';
        blinkSpeed = 0.05; // 매우 빠른 깜빡임
      }

      const blink = Math.sin(Date.now() * blinkSpeed) * 0.5 + 0.5;
      ctx.fillStyle = this.isTriggered 
        ? `rgba(255, 0, 60, ${0.4 + blink * 0.6})`
        : `rgba(0, 242, 254, ${0.2 + blink * 0.4})`;

      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = 8 + blink * 8;

      ctx.beginPath();
      ctx.moveTo(this.x, this.y - this.radius);
      ctx.lineTo(this.x + this.radius, this.y);
      ctx.lineTo(this.x, this.y + this.radius);
      ctx.lineTo(this.x - this.radius, this.y);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
      ctx.fill();

    } else if (this.type === 'boomerang') {
      // 가시성 극대화: 두껍고 선명하게 꽉 찬 반원형 네온 그린 부메랑 드로우
      ctx.translate(this.x, this.y);
      ctx.rotate(Date.now() * 0.02);

      ctx.shadowColor = '#00ff66';
      ctx.shadowBlur = 12;

      // 두꺼운 검기 반원 면 렌더링
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, -Math.PI * 0.6, Math.PI * 0.6);
      ctx.strokeStyle = 'rgba(0, 255, 102, 0.8)';
      ctx.lineWidth = 6;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, this.radius, -Math.PI * 0.6, Math.PI * 0.6);
      ctx.strokeStyle = '#ffffff'; // 속코어 화이트 강조선
      ctx.lineWidth = 2.0;
      ctx.stroke();

    } else if (this.type === 'dagger') {
      // 단검: 바닥에 드롭되었을 때 보라색 아우라 뿜기
      ctx.translate(this.x, this.y);
      
      const time = Date.now() * 0.005;
      const offset = Math.sin(time) * 0.25;
      ctx.rotate(offset + (this.isDropped ? 0 : Math.atan2(this.vy, this.vx) + Math.PI / 2));

      ctx.shadowColor = '#bd00ff';
      ctx.shadowBlur = this.isDropped ? 12 : 6;
      ctx.fillStyle = '#ffffff';

      // 날렵한 단검 형상
      ctx.beginPath();
      ctx.moveTo(0, -this.radius); 
      ctx.lineTo(this.radius * 0.35, -this.radius * 0.2); 
      ctx.lineTo(this.radius * 0.2, this.radius * 0.3); 
      ctx.lineTo(this.radius * 0.5, this.radius * 0.4); 
      ctx.lineTo(-this.radius * 0.5, this.radius * 0.4); 
      ctx.lineTo(-this.radius * 0.2, this.radius * 0.3); 
      ctx.lineTo(-this.radius * 0.35, -this.radius * 0.2); 
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, this.radius * 0.4);
      ctx.lineTo(0, this.radius * 0.8);
      ctx.strokeStyle = this.isDropped ? '#bd00ff' : '#ffffff';
      ctx.lineWidth = 2.0;
      ctx.stroke();

    } else {
      // 일반 bullet
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.strokeStyle = this.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.restore();
  }
}
