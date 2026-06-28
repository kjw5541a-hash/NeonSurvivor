export class DaggerPickup {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 8;
    this.isDead = false;

    // 물리 보간 가속 (Gem과 유사하게 플레이어 자석 반응)
    this.vx = 0;
    this.vy = 0;
    this.speed = 0;
    this.maxSpeed = 14; // 조금 더 빠르게 날아가서 캐치되는 느낌
    this.accel = 0.7;
    
    this.color = '#e0e0e0'; // 빛나는 화이트/실버
    this.shadowColor = '#bd00ff'; // 보라색 아우라
  }

  update(player) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // 단검은 플레이어의 자석 반경보다 1.2배 멀리서도 잘 끌려오게 설정해줌 (줍기 편하게 유틸성 상향)
    const pickupRange = player.magnetRange * 1.2;

    if (dist < pickupRange) {
      this.speed = Math.min(this.speed + this.accel, this.maxSpeed);
      
      this.vx = (dx / dist) * this.speed;
      this.vy = (dy / dist) * this.speed;

      this.x += this.vx;
      this.y += this.vy;

      // 플레이어 접촉 흡수
      if (dist < player.radius + this.radius) {
        this.isDead = true;
      }
    } else {
      this.vx *= 0.9;
      this.vy *= 0.9;
      this.x += this.vx;
      this.y += this.vy;
    }
  }

  // 바닥에 떨어진 단검 그리기 (네온 실버/보라 보석 모양 또는 단검 심볼)
  draw(ctx) {
    ctx.save();

    ctx.shadowColor = this.shadowColor;
    ctx.shadowBlur = 10;
    ctx.fillStyle = this.color;

    // 회전 각도 펄스(주기적으로 흔들림) 효과
    const time = Date.now() * 0.005;
    const offset = Math.sin(time) * 0.3;

    ctx.translate(this.x, this.y);
    ctx.rotate(offset);

    // 단검 모형 그리기
    ctx.beginPath();
    ctx.moveTo(0, -this.radius); // 칼끝
    ctx.lineTo(this.radius * 0.4, -this.radius * 0.2); // 우측 날
    ctx.lineTo(this.radius * 0.2, this.radius * 0.4); // 손잡이 가드
    ctx.lineTo(this.radius * 0.5, this.radius * 0.5); // 가드 우측
    ctx.lineTo(-this.radius * 0.5, this.radius * 0.5); // 가드 좌측
    ctx.lineTo(-this.radius * 0.2, this.radius * 0.4); // 손잡이 가드
    ctx.lineTo(-this.radius * 0.4, -this.radius * 0.2); // 좌측 날
    ctx.closePath();
    ctx.fill();

    // 손잡이선
    ctx.beginPath();
    ctx.moveTo(0, this.radius * 0.5);
    ctx.lineTo(0, this.radius);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.restore();
  }
}
