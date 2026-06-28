// 파티클 업데이트 및 드로잉 함수 모음
export class ParticleSystem {
  static update(particles) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life--;

      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      // 파티클 종류별 물리 공식 적용
      switch (p.type) {
        case 'spark':
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.95;
          p.vy *= 0.95;
          break;
        case 'damage_text':
          p.y -= 0.6;
          break;
        case 'lightning':
          break;
        case 'level_up':
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.96;
          p.vy *= 0.96;
          break;
        case 'blackhole':
          // 블랙홀 자체의 크기는 시간 경과에 따라 수축 팽창
          break;
      }
    }
  }

  static draw(ctx, particles) {
    ctx.save();

    for (let p of particles) {
      const alpha = Math.max(p.life / p.maxLife, 0);

      switch (p.type) {
        case 'spark':
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * alpha, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = alpha;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 6;
          ctx.fill();
          break;

        case 'damage_text':
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.font = 'bold 12px "Outfit"';
          ctx.textAlign = 'center';
          ctx.globalAlpha = alpha;
          ctx.shadowColor = '#000000';
          ctx.shadowBlur = 4;
          ctx.fillText(p.text, p.x, p.y);
          break;

        case 'lightning':
          ctx.globalAlpha = alpha;
          ctx.shadowColor = '#00f2fe';
          ctx.shadowBlur = 15;
          
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 4;
          ctx.beginPath();
          
          let currentY = p.y - 400; 
          let currentX = p.x;
          ctx.moveTo(currentX, currentY);

          while (currentY < p.y) {
            currentY += 40;
            currentX += (Math.random() - 0.5) * 30; 
            ctx.lineTo(currentX, Math.min(currentY, p.y));
          }
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * (1 - alpha), 0, Math.PI * 2);
          ctx.strokeStyle = '#00f2fe';
          ctx.lineWidth = 3;
          ctx.stroke();
          break;

        case 'level_up':
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue}, 100%, 65%, ${alpha})`;
          ctx.globalAlpha = alpha;
          ctx.shadowColor = `hsla(${p.hue}, 100%, 65%, 1)`;
          ctx.shadowBlur = 8;
          ctx.fill();
          break;

        case 'blackhole':
          // 블랙홀: 소용돌이치는 네온 보라색 구체
          ctx.globalAlpha = alpha;
          ctx.shadowColor = '#bd00ff';
          ctx.shadowBlur = 20;

          const radius = p.radius * (1 + Math.sin(Date.now() * 0.03) * 0.15); // 일렁이는 펄스

          // 바깥 광륜
          ctx.strokeStyle = 'rgba(189, 0, 255, 0.4)';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
          ctx.stroke();

          // 내부 암부 코어
          ctx.fillStyle = '#030712';
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius * 0.8, 0, Math.PI * 2);
          ctx.fill();

          // 소용돌이 입자
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius * 0.5, Date.now() * 0.01, Date.now() * 0.01 + Math.PI * 0.7);
          ctx.stroke();
          break;
      }
    }

    ctx.restore();
  }

  static spawnLevelUpEffect(x, y, particles) {
    const particleCount = 40;
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 5;
      particles.push({
        type: 'level_up',
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3 + Math.random() * 3,
        hue: Math.floor(Math.random() * 360),
        life: 40 + Math.random() * 20,
        maxLife: 60
      });
    }
  }

  // 폭발용 화염/불꽃 스파크 방출
  static spawnExplosion(x, y, radius, particles, color = '#ff7700') {
    const sparkCount = 18 + Math.floor(Math.random() * 10);
    for (let i = 0; i < sparkCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 5;
      particles.push({
        type: 'spark',
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: color,
        radius: 3 + Math.random() * 4,
        life: 25 + Math.random() * 15,
        maxLife: 40
      });
    }
  }
}
