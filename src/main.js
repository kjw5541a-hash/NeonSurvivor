import './style.css';
import { Engine } from './game/Engine.js';

// DOM 로드가 완료되면 게임 엔진 실행
window.addEventListener('DOMContentLoaded', () => {
  const gameEngine = new Engine();
  
  // 모바일 웹 뷰포트 바운스 스크롤 방지
  document.addEventListener('touchmove', (e) => {
    if (e.scale !== 1) {
      e.preventDefault();
    }
  }, { passive: false });
});
