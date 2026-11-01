(function () {
  "use strict";

  var toggle = document.getElementById("slideshowToggle");
  var speed = document.getElementById("slideshowSpeed");
  var status = document.getElementById("slideshowStatus");
  var gallery = document.getElementById("gallery");
  var shell = document.querySelector(".app-shell");
  var playing = false;
  var frame = null;
  var previousTime = null;
  var position = 0;
  var previousScroller = null;
  var returning = null;

  function scroller() {
    // In portrait, the landscape fallback rotates an independently scrolling shell.
    if (document.body.classList.contains("landscape-view") &&
        window.getComputedStyle(shell).position === "fixed") return shell;
    return document.scrollingElement || document.documentElement;
  }

  function stop(message) {
    playing = false;
    window.cancelAnimationFrame(frame);
    frame = null;
    returning = null;
    toggle.setAttribute("aria-pressed", "false");
    toggle.textContent = "スライドショー";
    status.textContent = message || "";
  }

  function tick(time) {
    if (!playing) return;
    if (!gallery.querySelector(".viewer-card")) { stop("表示対象がありません"); return; }
    var target = scroller();
    if (previousScroller !== target || Math.abs(target.scrollTop - position) > 2) {
      position = target.scrollTop;
      returning = null;
    }
    var elapsed = previousTime === null ? 0 : Math.min(time - previousTime, 100);
    previousTime = time;
    previousScroller = target;
    var end = Math.max(0, target.scrollHeight - target.clientHeight);
    if (returning) {
      // A short, cancellable rewind, independent of the selected reading speed.
      var progress = Math.min(1, (time - returning.time) / 450);
      position = Math.min(end, returning.from * (1 - progress * progress * (3 - 2 * progress)));
      if (progress >= 1) returning = null;
    } else {
      position = Math.min(end, position + Number(speed.value) * elapsed / 1000);
      if (end > 0 && position >= end) {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) position = 0;
        else returning = { time: time, from: end };
      }
    }
    target.scrollTop = position;
    frame = window.requestAnimationFrame(tick);
  }

  toggle.addEventListener("click", function () {
    if (playing) { stop("停止しました"); return; }
    if (!gallery.querySelector(".viewer-card")) { status.textContent = "表示対象がありません"; return; }
    // Collapse the mobile menu to release its body scroll lock before starting.
    var expand = document.getElementById("toolbarToggle");
    if (expand.getAttribute("aria-expanded") === "true") expand.click();
    playing = true;
    previousTime = null;
    previousScroller = null;
    returning = null;
    toggle.setAttribute("aria-pressed", "true");
    toggle.textContent = "スライドショー終了";
    status.textContent = "再生中";
    frame = window.requestAnimationFrame(tick);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && playing) stop("停止しました");
  });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden && playing) stop("停止しました");
  });
}());
