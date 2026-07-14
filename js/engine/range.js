// MIROLE — el campo de tiro: minijuegos 2D táctiles. Nada de leer:
// aquí se APUNTA. Práctica de botellas (entrena la puntería de verdad)
// y el desenfunde de los duelos (tu dedo contra sus reflejos).
// DOM puro, cero dependencias: funcionará en 2060 igual que hoy.

// ---------- PRÁCTICA: botellas en la cerca ----------
// done(hits, shots) al terminar. Consume 1 bala por toque (máx. maxShots).
export function practice(container, seconds, maxShots, done) {
  let hits = 0, shots = 0, over = false;
  container.innerHTML = `
    <div class="range-arena" id="rArena">
      <div class="range-hud"><span id="rTime">${seconds}</span>s · 🍾 <span id="rHits">0</span> · balas <span id="rShots">${maxShots}</span></div>
    </div>`;
  const arena = container.querySelector('#rArena');

  function spawn() {
    if (over) return;
    const b = document.createElement('div');
    b.className = 'bottle';
    b.textContent = '🍾';
    b.style.left = (8 + Math.random() * 78) + '%';
    b.style.top = (18 + Math.random() * 68) + '%';
    arena.appendChild(b);
    setTimeout(() => b.remove(), 1400);
    setTimeout(spawn, 550 + Math.random() * 500);
  }

  arena.addEventListener('pointerdown', e => {
    if (over || shots >= maxShots) return;
    shots++;
    container.querySelector('#rShots').textContent = maxShots - shots;
    const t = e.target;
    if (t.classList && t.classList.contains('bottle')) {
      hits++;
      container.querySelector('#rHits').textContent = hits;
      t.textContent = '✨';
      t.classList.add('hitfx');
      setTimeout(() => t.remove(), 200);
    } else {
      const miss = document.createElement('div');
      miss.className = 'missfx';
      miss.textContent = '·';
      miss.style.left = (e.offsetX || 20) + 'px';
      miss.style.top = (e.offsetY || 20) + 'px';
      arena.appendChild(miss);
      setTimeout(() => miss.remove(), 300);
    }
    if (shots >= maxShots) end();
  });

  let left = seconds;
  const timer = setInterval(() => {
    left--;
    const el = container.querySelector('#rTime');
    if (el) el.textContent = left;
    if (left <= 0) end();
  }, 1000);

  function end() {
    if (over) return;
    over = true;
    clearInterval(timer);
    setTimeout(() => done(hits, shots), 350);
  }
  spawn();
}

// ---------- EL DESENFUNDE: tu dedo contra sus reflejos ----------
// Espera... espera... ¡YA! Toca la silueta antes de que su cuenta llegue.
// Tocar antes de tiempo es perder: los nerviosos mueren primero.
// done(win)
export function quickdraw(container, myReflex, foeReflex, foeName, done) {
  let phase = 'wait', finished = false;
  container.innerHTML = `
    <div class="range-arena qd" id="qArena">
      <div class="qd-msg" id="qMsg">No toques.<br>Espera la señal.<br><span class="dim small">${foeName} te sostiene la mirada.</span></div>
    </div>`;
  const arena = container.querySelector('#qArena');
  const msg = container.querySelector('#qMsg');

  // Su velocidad nace de SUS reflejos; tu margen, de los TUYOS.
  const foeTime = Math.max(320, 950 - foeReflex * 6) + (myReflex - foeReflex) * 3;

  const goAt = setTimeout(() => {
    if (finished) return;
    phase = 'go';
    arena.classList.add('go');
    msg.innerHTML = '¡DESENFUNDA!';
    const foe = document.createElement('div');
    foe.className = 'qd-foe';
    foe.textContent = '🤠';
    foe.style.left = (20 + Math.random() * 60) + '%';
    foe.style.top = (30 + Math.random() * 40) + '%';
    arena.appendChild(foe);
    // Si su cuenta llega antes que tu dedo: pierdes el desenfunde.
    setTimeout(() => end(false, 'Su cañón habló primero. Por un suspiro.'), foeTime);
  }, 900 + Math.random() * 1600);

  arena.addEventListener('pointerdown', e => {
    if (finished) return;
    if (phase === 'wait') {
      end(false, 'Saltaste antes de la señal. Los nerviosos desenfundan primero y apuntan último.');
      return;
    }
    const t = e.target;
    if (t.classList && t.classList.contains('qd-foe')) {
      t.textContent = '💥';
      end(true, 'Tu mano fue un latigazo. El silencio de después lo dice todo.');
    } else {
      end(false, 'Disparaste al aire. El aire, notablemente, sobrevivió.');
    }
  });

  function end(win, txt) {
    if (finished) return;
    finished = true;
    clearTimeout(goAt);
    msg.innerHTML = (win ? '✦ ' : '✝ ') + txt;
    arena.classList.add('done');
    setTimeout(() => done(win), 1300);
  }
}

// ---------- LA CABALGATA: persecución interactiva (fase 4) ----------
// Cosas vuelan hacia ti desde el frente del camino: obstáculos que hay
// que ESQUIVAR (tócalos para saltarlos) y jinetes enemigos que hay que
// ABATIR (tócalos para disparar). Lo que no tocas a tiempo, te golpea.
// done({score, hits, misses}). Puro DOM: vivirá en 2060 igual que hoy.
export function chase(container, seconds, done) {
  let hits = 0, misses = 0, over = false, hp = 3;
  container.innerHTML = `
    <div class="range-arena chase" id="cArena">
      <div class="range-hud">${seconds}s · ⏱ <span id="cTime">${seconds}</span> · ❤ <span id="cHp">3</span> · 🎯 <span id="cHits">0</span></div>
      <div class="rider">🐎</div>
    </div>`;
  const arena = container.querySelector('#cArena');

  function spawn() {
    if (over) return;
    const enemy = Math.random() < 0.5;
    const el = document.createElement('div');
    el.className = 'flyer ' + (enemy ? 'foe' : 'obs');
    el.dataset.kind = enemy ? 'foe' : 'obs';
    el.textContent = enemy ? '🤠' : (Math.random() < 0.5 ? '🌵' : '🪨');
    el.style.top = (20 + Math.random() * 55) + '%';
    el.style.left = '100%';
    arena.appendChild(el);
    const dur = 1500 + Math.random() * 900;
    el.style.transition = `left ${dur}ms linear`;
    requestAnimationFrame(() => { el.style.left = '-16%'; });
    // Si llega al jinete sin tocarlo, golpea.
    const timer = setTimeout(() => {
      if (el.dataset.done) return;
      el.dataset.done = '1';
      hp--; misses++;
      container.querySelector('#cHp').textContent = Math.max(0, hp);
      arena.classList.add('shake');
      setTimeout(() => arena.classList.remove('shake'), 200);
      el.remove();
      if (hp <= 0) end();
    }, dur * 0.82);
    el._timer = timer;
    setTimeout(spawn, 620 + Math.random() * 520);
  }

  arena.addEventListener('pointerdown', e => {
    if (over) return;
    const t = e.target;
    if (t.classList && t.classList.contains('flyer') && !t.dataset.done) {
      t.dataset.done = '1';
      clearTimeout(t._timer);
      hits++;
      container.querySelector('#cHits').textContent = hits;
      t.textContent = t.dataset.kind === 'foe' ? '💥' : '✨';
      t.classList.add('hitfx');
      setTimeout(() => t.remove(), 200);
    }
  });

  let left = seconds;
  const clock = setInterval(() => {
    left--;
    const el = container.querySelector('#cTime');
    if (el) el.textContent = left;
    if (left <= 0) end();
  }, 1000);

  function end() {
    if (over) return;
    over = true;
    clearInterval(clock);
    setTimeout(() => done({ score: hits, hits, misses, survived: hp > 0 }), 350);
  }
  spawn();
}
