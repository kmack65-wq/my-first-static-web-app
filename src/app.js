console.log("app.js loaded");

// ======================
// SIGNATURE PAD
// ======================

const canvas = document.getElementById("signaturePad");
const ctx = canvas.getContext("2d");

let drawing = false;

canvas.width = canvas.offsetWidth;
canvas.height = 150;

ctx.strokeStyle = "#ffffff";
ctx.lineWidth = 2;

canvas.addEventListener("mousedown", startDraw);
canvas.addEventListener("mousemove", draw);
canvas.addEventListener("mouseup", endDraw);
canvas.addEventListener("mouseout", endDraw);

canvas.addEventListener("touchstart", startDraw);
canvas.addEventListener("touchmove", draw);
canvas.addEventListener("touchend", endDraw);

function startDraw(e) {
  drawing = true;
  draw(e);
}

function draw(e) {
  if (!drawing) return;

  e.preventDefault();

  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX || e.touches[0].clientX) - rect.left;
  const y = (e.clientY || e.touches[0].clientY) - rect.top;

  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
}

function endDraw() {
  drawing = false;
  ctx.beginPath();
}

document.getElementById("clearBtn").addEventListener("click", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

// ======================
// FORM SUBMIT
// ======================

document.getElementById("ackForm").addEventListener("submit", async function(e) {
  e.preventDefault();

  const fullName = document.getElementById("fullName").value;
  const companyName = document.getElementById("companyName").value;
  const jobSite = document.getElementById("jobSite").value;
  const email = document.getElementById("email").value;
  const signature = canvas.toDataURL();

  const payload = {
    fullName,
    companyName,
    jobSite,
    email,
    signature
  };

  try {

    const response = await fetch("PASTE_YOUR_LOGIC_APP_URL_HERE", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error("Submit failed");

    showSuccessScreen();

  } catch (err) {
    alert("Submission failed. Please try again.");
    console.error(err);
  }
});

// ======================
// SUCCESS SCREEN
// ======================

function showSuccessScreen() {
  const now = new Date();

  const formatted = now.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });

  document.getElementById("submissionTimestamp").textContent =
    `Submitted on: ${formatted}`;

  document.getElementById("formSection").classList.add("hidden");
  document.getElementById("successScreen").classList.remove("hidden");
}
