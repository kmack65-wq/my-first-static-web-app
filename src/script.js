let videoCompleted = false;
let signatureCompleted = false;

const $ = id => document.getElementById(id);

function updateSubmitState() {
  $("submitBtn").disabled = !(videoCompleted && signatureCompleted);
}

function setStatus(msg) {
  $("status").textContent = msg;
}

/* ---------- SIGNATURE (MOUSE + TOUCH, WHITE PEN, MOBILE SAFE) ---------- */
(() => {
  const canvas = $("signaturePad");
  const ctx = canvas.getContext("2d");
  let drawing = false;

  const PEN_COLOR = "#ffffff"; // FORCE WHITE
  const PEN_WIDTH = 2;

  // ---------- Canvas setup ----------
  function setupCanvas() {
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    ctx.lineWidth = PEN_WIDTH;
    ctx.lineCap = "round";
    ctx.strokeStyle = PEN_COLOR; // ALWAYS reset pen color
  }

  setupCanvas();

  // Re-apply on resize / orientation / focus changes
  window.addEventListener("resize", setupCanvas);
  window.addEventListener("orientationchange", setupCanvas);
  window.addEventListener("focus", () => {
    ctx.strokeStyle = PEN_COLOR;
  });

  // ---------- Position helper ----------
  function getPos(e) {
    const rect = canvas.getBoundingClientRect();

    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }

    return {
      x: e.offsetX,
      y: e.offsetY
    };
  }

  // ---------- Drawing handlers ----------
  function startDraw(e) {
    e.preventDefault();
    drawing = true;

    // Re-force pen color on every stroke (mobile fix)
    ctx.strokeStyle = PEN_COLOR;

    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function draw(e) {
    if (!drawing) return;
    e.preventDefault();

    ctx.strokeStyle = PEN_COLOR; // EXTRA safety
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    signatureCompleted = true;
    updateSubmitState();
  }

  function endDraw() {
    drawing = false;
  }

  // ---------- Mouse events ----------
  canvas.addEventListener("mousedown", startDraw);
  canvas.addEventListener("mousemove", draw);
  window.addEventListener("mouseup", endDraw);

  // ---------- Touch events ----------
  canvas.addEventListener("touchstart", startDraw, { passive: false });
  canvas.addEventListener("touchmove", draw, { passive: false });
  window.addEventListener("touchend", endDraw);

  // ---------- Clear ----------
  $("clearSignature").onclick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    signatureCompleted = false;
    updateSubmitState();

    // Re-apply pen after clear
    ctx.strokeStyle = PEN_COLOR;
  };
})();



/* ---------- SAFETY VIDEO (AZURE BLOB) ---------- */
(() => {
  const video = $("safetyVideo");

  if (!video) {
    console.error("Safety video element not found.");
    return;
  }

  // Initial state
  videoCompleted = false;
  updateSubmitState();
  setStatus("You must watch the entire safety video.");

  // Prevent skipping ahead
  let lastAllowedTime = 0;

  video.addEventListener("timeupdate", () => {
    if (video.currentTime > lastAllowedTime + 1) {
      video.currentTime = lastAllowedTime;
    } else {
      lastAllowedTime = video.currentTime;
    }
  });

  // Mark completion
  video.addEventListener("ended", () => {
    videoCompleted = true;
    setStatus("Video completed.");
    updateSubmitState();
  });

  // Extra guard (in case user tries to submit early)
  $("ackForm").addEventListener("submit", e => {
    if (!videoCompleted) {
      e.preventDefault();
      alert("You must watch the entire safety video before submitting.");
    }
  });
})();



