console.log("script.js loaded");

/* ===== GLOBAL STATE ===== */
const state = {
  videoCompleted: false,
  signatureCompleted: false,
  player: null
};

/* ===== HELPERS ===== */
function $(id) {
  return document.getElementById(id);
}

function setStatus(msg) {
  $("status").textContent = msg;
}

function updateSubmitState() {
  const btn = $("submitBtn");
  btn.disabled = !(state.videoCompleted && state.signatureCompleted);

  if (!state.videoCompleted) {
    setStatus("Please watch the entire video.");
  } else if (!state.signatureCompleted) {
    setStatus("Please provide your signature.");
  } else {
    setStatus("Ready to submit.");
  }
}

/* ===== SIGNATURE PAD ===== */
function initSignaturePad() {
  const canvas = $("signaturePad");
  const clearBtn = $("clearSignature");
  const ctx = canvas.getContext("2d");

  ctx.lineWidth = 2;
  ctx.lineCap = "round";

  let drawing = false;

  function pos(e) {
    const r = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
    return { x, y };
  }

  canvas.addEventListener("mousedown", e => {
    drawing = true;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  });

  canvas.addEventListener("mousemove", e => {
    if (!drawing) return;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    state.signatureCompleted = true;
    updateSubmitState();
  });

  window.addEventListener("mouseup", () => drawing = false);

  canvas.addEventListener("touchstart", e => {
    drawing = true;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener("touchmove", e => {
    if (!drawing) return;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    state.signatureCompleted = true;
    updateSubmitState();
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener("touchend", () => drawing = false);

  clearBtn.addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    state.signatureCompleted = false;
    updateSubmitState();
  });
}

/* ===== YOUTUBE VIDEO ===== */
window.onYouTubeIframeAPIReady = function () {
  console.log("YouTube API ready");

  state.player = new YT.Player("trainingVideo", {
    videoId: "YSVeHAzz1oA",
    playerVars: {
      autoplay: 0,
      controls: 1,
      rel: 0,
      modestbranding: 1,
      origin: window.location.origin
    },
    events: {
      onReady: () => {
        console.log("YouTube player ready");
        updateSubmitState();
      },
      onStateChange: e => {
        if (e.data === YT.PlayerState.ENDED) {
          console.log("Video completed");
          state.videoCompleted = true;
          updateSubmitState();
        }
      },
      onError: e => {
        console.error("YouTube error", e.data);
        setStatus("Video failed to load. Please refresh.");
      }
    }
  });
};

/* ===== FORM GUARD ===== */
$("ackForm").addEventListener("submit", e => {
  if (!state.videoCompleted || !state.signatureCompleted) {
    e.preventDefault();
    alert("Please complete the video and signature.");
  }
});

/* ===== INIT ===== */
document.addEventListener("DOMContentLoaded", () => {
  initSignaturePad();
  updateSubmitState();
});
