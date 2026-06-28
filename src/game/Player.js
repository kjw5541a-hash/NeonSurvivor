export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    
    // 피격 범위를 캐릭터 가로 테두리선 두께에 맞춰 반지름 10으로 유지
    this.radius = 10;
    
    // 이동 속도 및 관성(물리)
    this.vx = 0;
    this.vy = 0;
    this.baseSpeed = 3.5;
    this.speedModifier = 1.0;
    this.friction = 0.2; 

    // 캐릭터 스탯
    this.level = 1;
    this.xp = 0;
    this.nextLevelXp = 5; 
    this.hp = 100;
    this.maxHp = 100;
    
    // 특수 성장 능력치
    this.magnetRange = 70; 
    this.might = 1.0;       
    this.armor = 0;        
    
    // 공격 방향 및 스프라이트 상태
    this.angle = 0;

    // 픽셀 아트 애니메이션 데이터 (상황별 스프라이트 시트 분리 로드)
    this.sprites = {
      idle: { img: new Image(), src: '/src/assets/Punk_idle.png', frames: 4, speed: 8 },
      run: { img: new Image(), src: '/src/assets/player_run.png', frames: 6, speed: 6 },
      hurt: { img: new Image(), src: '/src/assets/Punk_hurt.png', frames: 2, speed: 7 },
      death: { img: new Image(), src: '/src/assets/Punk_death.png', frames: 6, speed: 8 },
      attack: { img: new Image(), src: '/src/assets/Punk_attack3.png', frames: 8, speed: 5 }
    };

    // 소스 로드 일괄 처리
    for (let key in this.sprites) {
      this.sprites[key].img.src = this.sprites[key].src;
    }

    this.animState = 'idle'; 
    this.frameWidth = 48;
    this.frameHeight = 48;
    this.currentFrame = 0;
    this.animTimer = 0;
    
    this.isMoving = false;
    this.facingRight = true; 

    // 애니메이션 지속 타이머 (피격, 공격 등 지속 유지용)
    this.hurtTimer = 0;
    this.attackTimer = 0;

    // 비주얼 렌더링 절대 크기 분리 (모든 애니메이션이 동일 스케일 적용)
    this.visualSize = 83; 

    // 무기 및 아이템 목록
    this.weapons = [];
    this.passives = [];
  }

  // 피격 모션 강제 트리거
  triggerHurt(duration = 14) {
    if (this.hp > 0) {
      this.hurtTimer = duration;
    }
  }

  // 공격/기술 모션 강제 트리거 (하이브리드 보정 설계)
  triggerAttack() {
    if (this.hp <= 0 || this.hurtTimer > 0) return;

    // 이미 공격 중일 때는 리셋 오버라이드 방지하여 모션 연속성 보장
    if (this.attackTimer > 0) return;

    if (this.isMoving) {
      // 1. 이동 중일 때: 달리기 시각 효과를 해치지 않게 짧고 간결한 '스쳐 지나가는 투척 찌르기' (10틱만 노출)
      this.attackTimer = 10;
    } else {
      // 2. 멈춰 서서 기술을 쓸 때: 기 모으고 포탄 뿜는 화려한 8프레임 전 모션 완벽 상영 (8프레임 * 5틱 = 40틱 할당)
      this.attackTimer = 40;
    }
  }

  // 매 프레임 업데이트
  update(inputX, inputY) {
    const targetSpeed = this.baseSpeed * this.speedModifier;
    
    // 가속도 반영
    const targetVx = inputX * targetSpeed;
    const targetVy = inputY * targetSpeed;

    // 부드러운 관성 가감속
    this.vx += (targetVx - this.vx) * this.friction;
    this.vy += (targetVy - this.vy) * this.friction;

    // 좌표 갱신 (사망하지 않은 경우에만 이동)
    if (this.hp > 0) {
      this.x += this.vx;
      this.y += this.vy;
      this.isMoving = Math.abs(inputX) > 0.05 || Math.abs(inputY) > 0.05;
    } else {
      this.isMoving = false;
      this.vx = 0;
      this.vy = 0;
    }

    if (inputX > 0.05) {
      this.facingRight = true;
    } else if (inputX < -0.05) {
      this.facingRight = false;
    }

    if (this.isMoving) {
      this.angle = Math.atan2(this.vy, this.vx);
    }

    // --- 상황별 애니메이션 우선순위 결정 ---
    const prevState = this.animState;

    if (this.hp <= 0) {
      this.animState = 'death';
    } else if (this.hurtTimer > 0) {
      this.animState = 'hurt';
      this.hurtTimer--;
    } else if (this.attackTimer > 0) {
      this.animState = 'attack';
      this.attackTimer--;
    } else if (this.isMoving) {
      this.animState = 'run';
    } else {
      this.animState = 'idle';
    }

    // 상태가 변경되었을 때 프레임 리셋 (인덱스 아웃 방지)
    if (this.animState !== prevState) {
      this.currentFrame = 0;
      this.animTimer = 0;
    }

    // --- 애니메이션 프레임 제어 ---
    const currentSpriteData = this.sprites[this.animState];
    this.animTimer++;

    if (this.animState === 'death') {
      // 사망 모션은 마지막 쓰러진 프레임 고정
      if (this.currentFrame < currentSpriteData.frames - 1) {
        if (this.animTimer % currentSpriteData.speed === 0) {
          this.currentFrame++;
        }
      }
    } else {
      // 일반 모션들은 루프
      if (this.animTimer % currentSpriteData.speed === 0) {
        this.currentFrame = (this.currentFrame + 1) % currentSpriteData.frames;
      }
    }
  }

  // 플레이어 그리기 (상황별 이미지 바인딩 및 Y 보정값 +2px 하강)
  draw(ctx) {
    ctx.save();

    // 1. 플레이어 중심 좌표로 평행 이동
    ctx.translate(this.x, this.y);

    // 2. 왼쪽을 볼 때 좌우 대칭 변환
    if (!this.facingRight) {
      ctx.scale(-1, 1);
    }

    // 3. 은은한 사이버 네온 글로우 효과 적용
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 10;

    const drawSize = this.visualSize; 
    const activeSprite = this.sprites[this.animState].img;
    const sx = this.currentFrame * this.frameWidth;
    const sy = 0;

    // X축: 에셋 자체 좌측 쏠림 보정 (+6px 우측 이동)
    const xOffset = -drawSize / 2 + 6;
    
    // Y축: 체력 바 Y 오프셋(radius + 10px 아래)과 정렬 맞춤 보정식
    const yOffset = -drawSize + this.radius + 10;

    ctx.drawImage(
      activeSprite,
      sx, sy, this.frameWidth, this.frameHeight,
      xOffset, yOffset, drawSize, drawSize
    );

    ctx.restore();
  }

  // 경험치 추가 및 레벨업 체크
  addXp(amount) {
    this.xp += amount;
    let didLevelUp = false;

    while (this.xp >= this.nextLevelXp) {
      this.xp -= this.nextLevelXp;
      this.level++;
      this.nextLevelXp = Math.floor(this.nextLevelXp * 1.4) + 5;
      didLevelUp = true;
    }
    return didLevelUp;
  }
}
