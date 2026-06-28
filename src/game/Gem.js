export class Gem {
  constructor(x, y, xpValue = 1) {
    this.x = x;
    this.y = y;
    this.xpValue = xpValue;
    this.isDead = false;

    // 물리 보간 가속
    this.vx = 0;
    this.vy = 0;
    this.speed = 0;
    this.maxSpeed = 12;
    this.accel = 0.5;

    // 경험치 가치에 따른 색상 및 모양
    this.setupVisual();
  }

  setupVisual() {
    if (this.xpValue >= 50) {
      this.color = '#ff007f'; // 핫핑크 (보스 젬)
      this.radius = 9;
    } else if (this.xpValue >= 5) {
      this.color = '#bd00ff'; // 보라색 (정예 젬)
      this.radius = 7;
    } else {
      this.color = '#00f2fe'; // 청록색 (일반 젬)
      this.radius = 5;
    }
  }

  // 매 프레임 업데이트 (플레이어 자석 효과 처리)
  update(player) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // 자석 범위 내에 플레이어가 도달한 경우
    if (dist < player.magnetRange) {
      this.speed = Math.min(this.speed + this.accel, this.maxSpeed);
      
      this.vx = (dx / dist) * this.speed;
      this.vy = (dy / dist) * this.speed;

      this.x += this.vx;
      this.y += this.vy;

      // 플레이어와 충돌(흡수) 처리
      if (dist < player.radius + this.radius) {
        this.isDead = true;
      }
    } else {
      // 범위 밖에선 감속되어 정지 상태 유지
      this.vx *= 0.9;
      this.vy *= 0.9;
      this.x += this.vx;
      this.y += this.vy;
    }
  }

  // 경험치 보석 렌더링 (빛나는 다이아몬드 형상)
  draw(ctx) {
    ctx.save();

    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8;
    ctx.fillStyle = this.color;

    // 다이아몬드 그리기 (보석 느낌)
    ctx.beginPath();
    ctx.moveTo(this.x, this.y - this.radius);
    ctx.lineTo(this.x + this.radius, this.y);
    ctx.lineTo(this.x, this.y + this.radius);
    ctx.lineTo(this.x - this.radius, this.y);
    ctx.closePath();
    ctx.fill();

    // 테두리 강조
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }
}
