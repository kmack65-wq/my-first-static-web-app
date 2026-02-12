/*********************************
 * GLOBAL STATE
 *********************************/
window.safetyState = {
  videoCompleted: false,
  signatureCompleted: false
};

/*********************************
 * HELPERS
 *********************************/
function $(id) {
  return document.getElementById(id);
}

window.setStatus = function (msg, type = "info") {
  const el = $("status");
  if (!el) return;

  el.textContent = msg;
  el.className = `status ${type}`;
};

window.updateSubmitState = function () {
  const btn = $("submitBtn");
  if (!btn) return;

  btn.disabled = !(
    window.safetyState.videoCompleted &&
    window.safetyState.signatureCompleted
  );
};

/*********************************
 * VIDEO GATE (HTML5)
 *********************************/
function initVideoGate() {
  const video = $("trainingVideo");
  if (!video) return;

  video.addEventListener("ended", () => {
    window.safetyState.videoCompleted = true;
    setStatus("Video completed. Please sign below.", "success");
    updateSubmitState();
  });
}

/*********************************
 * SIGNATURE PAD (WHITE PEN + MOBILE SAFE)
 *********************************/
function initSignaturePad() {
  const canvas = $("signaturePad");
  const clearBtn = $("clearSignature");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let drawing = false;

  function resizeCanvas() {
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * ratio;
    canvas.height = 160 * ratio;

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#ffffff";
  }

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  function getPoint(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  function start(e) {
    drawing = true;
    ctx.beginPath();
    const p = getPoint(e);
    ctx.moveTo(p.x, p.y);
    e.preventDefault();
  }

  function move(e) {
    if (!drawing) return;
    const p = getPoint(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();

    window.safetyState.signatureCompleted = true;
    updateSubmitState();
  }

  function stop() {
    drawing = false;
  }

  // Mouse
  canvas.addEventListener("mousedown", start);
  canvas.addEventListener("mousemove", move);
  canvas.addEventListener("mouseup", stop);
  canvas.addEventListener("mouseleave", stop);

  // Touch
  canvas.addEventListener(
    "touchstart",
    e => start(e.touches[0]),
    { passive: false }
  );

  canvas.addEventListener(
    "touchmove",
    e => move(e.touches[0]),
    { passive: false }
  );

  canvas.addEventListener("touchend", stop);

  // Clear button
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      window.safetyState.signatureCompleted = false;
      updateSubmitState();
      setStatus("Signature cleared. Please sign again.", "info");
    });
  }
}

/*********************************
 * FORM GUARD
 *********************************/
function initFormGuard() {
  const form = $("ackForm");
  if (!form) return;

  form.addEventListener("submit", e => {
    if (
      !window.safetyState.videoCompleted ||
      !window.safetyState.signatureCompleted
    ) {
      e.preventDefault();
      setStatus("Please complete the video and signature.", "error");
      return;
    }

    setStatus("Submitting acknowledgement…", "info");
  });
}

/*********************************
 * INIT
 *********************************/
document.addEventListener("DOMContentLoaded", () => {
  initVideoGate();
  initSignaturePad();
  initFormGuard();
  updateSubmitState();
  setStatus("Please watch the safety video to begin.", "info");
});
