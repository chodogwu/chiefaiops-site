(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  var root = document.documentElement;

  /* ── Smooth scroll ─────────────────────────────────────────────── */
  var lenis = null;
  if (!reduce && typeof window.Lenis !== 'undefined') {
    lenis = new window.Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); } });
    if (hasGSAP) {
      lenis.on('scroll', window.ScrollTrigger.update);
      window.gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      window.gsap.ticker.lagSmoothing(0);
    } else {
      var loop = function (t) { lenis.raf(t); requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    }
  }

  /* ── Anchor links ──────────────────────────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var hash = a.getAttribute('href');
      var target = hash === '#' ? document.body : document.querySelector(hash);
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(hash === '#' ? 0 : target, { offset: -84 });
      else if (hash === '#') window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      if (hash !== '#') history.replaceState(null, '', hash);
    });
  });

  /* ── Nav state + scroll progress ───────────────────────────────── */
  var nav = document.getElementById('nav');
  var bar = document.querySelector('.progress');
  var lastY = 0;
  function onScroll(y) {
    nav.classList.toggle('is-scrolled', y > 40);
    var goingDown = y > lastY + 4;
    var goingUp = y < lastY - 4;
    if (goingDown && y > 480) nav.classList.add('is-hidden');
    if (goingUp || y < 480) nav.classList.remove('is-hidden');
    if (Math.abs(y - lastY) > 4) lastY = y;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
  }
  if (lenis) lenis.on('scroll', function (e) { onScroll(e.scroll); });
  else window.addEventListener('scroll', function () { onScroll(window.scrollY); }, { passive: true });
  onScroll(window.scrollY);

  /* ── Flow field: busywork to order ─────────────────────────────── */
  function FlowField(canvas) {
    var mode = canvas.getAttribute('data-flow');
    var section = canvas.parentElement;
    var ctx = canvas.getContext('2d');
    var w = 0, h = 0, lines = [], t = Math.random() * 100, chaos = 1, target = 1;
    var running = false, visible = false;
    var mouse = { x: -9999, y: -9999, on: false };

    function build() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = w < 720 ? 30 : 58;
      var top = mode === 'hero' ? 0.1 : 0.14, span = mode === 'hero' ? 0.62 : 0.72;
      lines = [];
      for (var i = 0; i < n; i++) {
        lines.push({
          i: i,
          base: h * (top + span * (i / (n - 1))),
          amp: 50 + Math.random() * 130,
          ph: Math.random() * Math.PI * 2,
          sp: 0.18 + Math.random() * 0.32,
          a: 0.05 + Math.random() * 0.14,
          bright: Math.random() < 0.09
        });
      }
    }

    function yAt(l, x) {
      var n = Math.sin(x * 0.0031 + t * l.sp + l.ph) * 0.55 +
              Math.sin(x * 0.0089 - t * 0.33 + l.i * 0.71) * 0.3 +
              Math.sin(x * 0.021 + t * 0.7 + l.ph * 2) * 0.15;
      var y = l.base + n * l.amp * chaos;
      if (mouse.on) {
        var dx = x - mouse.x, dy = y - mouse.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < 170) y += (dy / (d || 1)) * (170 - d) * 0.32;
      }
      return y;
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      var step = w < 720 ? 16 : 11;
      for (var k = 0; k < lines.length; k++) {
        var l = lines[k];
        var alpha = l.bright ? Math.min(0.55, l.a * 2.6) : l.a;
        ctx.strokeStyle = l.bright ? 'rgba(240,199,102,' + alpha + ')' : 'rgba(201,161,74,' + alpha + ')';
        ctx.lineWidth = l.bright ? 1.15 : 0.9;
        ctx.beginPath();
        for (var x = -step; x <= w + step; x += step) {
          var y = yAt(l, x);
          if (x === -step) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    function targetChaos() {
      var r = section.getBoundingClientRect(), vh = window.innerHeight;
      if (mode === 'hero') {
        var p = Math.min(1, Math.max(0, -r.top / (r.height * 0.85)));
        return 1 - p * 0.92;
      }
      var q = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.9)));
      return 1 - q * 0.94;
    }

    function frame() {
      if (!running) return;
      t += 0.0065;
      target = targetChaos();
      chaos += (target - chaos) * 0.06;
      draw();
      requestAnimationFrame(frame);
    }

    function start() { if (running || reduce) return; running = true; requestAnimationFrame(frame); }
    function stop() { running = false; }

    build();
    if (reduce) { chaos = mode === 'hero' ? 0.4 : 0.08; draw(); }
    else { chaos = mode === 'hero' ? 1 : 0.95; }

    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) start(); else stop();
    }).observe(section);

    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { build(); if (reduce) draw(); }, 150);
    });

    if (finePointer && !reduce) {
      section.addEventListener('pointermove', function (e) {
        var r = canvas.getBoundingClientRect();
        mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.on = true;
      });
      section.addEventListener('pointerleave', function () { mouse.on = false; });
    }
  }
  document.querySelectorAll('canvas[data-flow]').forEach(function (c) {
    if (c.getContext) FlowField(c);
  });

  /* ── Magnetic buttons ──────────────────────────────────────────── */
  if (finePointer && !reduce) {
    document.querySelectorAll('[data-magnetic]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * 0.22;
        var y = (e.clientY - r.top - r.height / 2) * 0.32;
        el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  /* ── Bio modal ─────────────────────────────────────────────────── */
  var modal = document.getElementById('bio-modal');
  var openBtn = document.querySelector('.read-bio-btn');
  var closeBtn = modal ? modal.querySelector('.bio-modal-close') : null;
  var lastFocus = null;
  function openModal() {
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add('modal-open');
    if (lenis) lenis.stop();
    closeBtn.focus();
    if (hasGSAP && !reduce) {
      window.gsap.fromTo(modal, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power2.out' });
      window.gsap.fromTo(modal.querySelector('.bio-modal-panel'), { y: 40, opacity: 0, scale: 0.98 }, { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: 'expo.out' });
    }
  }
  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove('modal-open');
    if (lenis) lenis.start();
    if (lastFocus) lastFocus.focus();
  }
  if (modal && openBtn) {
    openBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', function (e) {
      if (modal.hidden) return;
      if (e.key === 'Escape') closeModal();
      if (e.key === 'Tab') {
        var f = modal.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ── GSAP choreography ─────────────────────────────────────────── */
  if (!hasGSAP || reduce) return;
  var gsap = window.gsap, ST = window.ScrollTrigger;
  gsap.registerPlugin(ST);

  function splitWords(el) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      var parts = node.textContent.split(/(\s+)/);
      var frag = document.createDocumentFragment();
      parts.forEach(function (p) {
        if (!p) return;
        if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
        var o = document.createElement('span'); o.className = 'w';
        var i = document.createElement('span'); i.className = 'wi'; i.textContent = p;
        o.appendChild(i); frag.appendChild(o);
      });
      node.parentNode.replaceChild(frag, node);
    });
    return el.querySelectorAll('.wi');
  }

  // Hero intro
  var heroWords = splitWords(document.querySelector('.hero-title'));
  var intro = gsap.timeline({ defaults: { ease: 'expo.out' }, delay: 0.15 });
  intro
    .from(heroWords, { yPercent: 118, rotate: 4, duration: 1.6, stagger: 0.1 })
    .from('[data-intro]', { y: 26, opacity: 0, duration: 1.2, stagger: 0.08 }, '-=1.15')
    .from('.scroll-cue', { opacity: 0, duration: 1 }, '-=0.8');

  // Hero content drifts up and fades as you leave
  gsap.to('.hero-inner', {
    yPercent: -12, opacity: 0.25, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
  });

  // Headline word reveals
  document.querySelectorAll('[data-split]').forEach(function (h) {
    var words = splitWords(h);
    gsap.from(words, {
      yPercent: 118, duration: 1.3, ease: 'expo.out', stagger: 0.045,
      scrollTrigger: { trigger: h, start: 'top 86%' }
    });
  });

  // Eyebrows draw in
  gsap.utils.toArray('.section .eyebrow, .final .eyebrow').forEach(function (e) {
    gsap.from(e, { opacity: 0, x: -16, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: e, start: 'top 90%' } });
  });

  // Generic reveals
  gsap.utils.toArray('[data-reveal]').forEach(function (el) {
    gsap.from(el, { y: 32, opacity: 0, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
  });

  // Staggered groups
  gsap.utils.toArray('[data-stagger]').forEach(function (group) {
    gsap.from(group.children, {
      y: 48, opacity: 0, duration: 1.2, ease: 'power3.out', stagger: 0.1,
      scrollTrigger: { trigger: group, start: 'top 84%' }
    });
  });

  // Browser tabs pile up
  gsap.from('.tabs-deco i', {
    y: 60, opacity: 0, rotate: -6, duration: 1.1, ease: 'back.out(1.6)', stagger: 0.12,
    scrollTrigger: { trigger: '.tabs-deco', start: 'top 88%' }
  });

  // Manual tasks list in one by one
  gsap.utils.toArray('[data-tasks]').forEach(function (list) {
    gsap.from(list.querySelectorAll('.task'), {
      x: -24, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.12,
      scrollTrigger: { trigger: list, start: 'top 82%' }
    });
  });

  // The wrong first questions get struck through
  var qs = document.querySelectorAll('.q');
  if (qs.length) {
    gsap.to(qs, {
      '--strike': 1, color: 'rgba(90,75,47,0.5)', duration: 0.7, ease: 'power2.inOut', stagger: 0.35,
      scrollTrigger: { trigger: qs[0], start: 'top 72%' }
    });
  }

  // Case study: the response-time bar shrinks from 15 minutes to 2
  gsap.fromTo('.timebar-fill', { scaleX: 1 }, {
    scaleX: 2 / 15, ease: 'none',
    scrollTrigger: { trigger: '.timebar', start: 'top 82%', end: 'top 30%', scrub: 0.8 }
  });

  // Counters (land on the exact original text)
  document.querySelectorAll('[data-count-to]').forEach(function (el) {
    var finalText = el.textContent;
    var to = parseFloat(el.getAttribute('data-count-to'));
    var from = parseFloat(el.getAttribute('data-count-from') || '0');
    var dec = parseInt(el.getAttribute('data-decimals') || '0', 10);
    var obj = { v: from };
    ST.create({
      trigger: el, start: 'top 94%', once: true,
      onEnter: function () {
        el.textContent = from.toFixed(dec);
        gsap.to(obj, {
          v: to, duration: 2.2, ease: 'power3.out',
          onUpdate: function () { el.textContent = obj.v.toFixed(dec); },
          onComplete: function () { el.textContent = finalText; }
        });
      }
    });
  });

  // Workflow cards: the before to after line draws down
  gsap.utils.toArray('.wf-line').forEach(function (line) {
    gsap.fromTo(line, { scaleY: 0 }, { scaleY: 1, duration: 1.4, ease: 'power2.inOut', scrollTrigger: { trigger: line, start: 'top 80%' } });
  });

  // Method: pinned sequence on desktop, rail on mobile
  var steps = gsap.utils.toArray('.method-step');
  var mm = gsap.matchMedia();
  mm.add('(min-width: 960px)', function () {
    var tl = gsap.timeline({
      scrollTrigger: { trigger: '.method', start: 'top top', end: '+=160%', scrub: 0.8, pin: true, anticipatePin: 1 }
    });
    tl.fromTo('.method-rail-fill', { scaleX: 0 }, { scaleX: 1, ease: 'none', duration: steps.length });
    steps.forEach(function (s, i) {
      tl.fromTo(s, { opacity: 0.3, y: 16 }, {
        opacity: 1, y: 0, duration: 0.6,
        onStart: function () { s.classList.add('is-active'); },
        onReverseComplete: function () { s.classList.remove('is-active'); }
      }, i + 0.05);
    });
  });
  mm.add('(max-width: 959px)', function () {
    gsap.fromTo('.method-rail-fill', { scaleY: 0 }, {
      scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.method-track', start: 'top 70%', end: 'bottom 60%', scrub: 0.6 }
    });
    steps.forEach(function (s) {
      ST.create({
        trigger: s, start: 'top 72%',
        onEnter: function () { s.classList.add('is-active'); },
        onLeaveBack: function () { s.classList.remove('is-active'); }
      });
      gsap.from(s, { opacity: 0, y: 30, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: s, start: 'top 85%' } });
    });
  });

  // Recalculate after fonts settle so pinned/trigger positions are right
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ST.refresh(); });
  window.addEventListener('load', function () { ST.refresh(); });
})();
