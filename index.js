// ====== APP INIT ======
document.addEventListener("DOMContentLoaded", () => {
  console.log("App loaded 🚀");

  handleNetworkStatus();
  handleExternalLinks();
});


// ====== 🌐 NETWORK HANDLING ======
function handleNetworkStatus() {
  function showOfflineBanner() {
    if (document.getElementById("offline-banner")) return;

    const banner = document.createElement("div");
    banner.id = "offline-banner";
    banner.innerText = "No internet connection 🚫";

    Object.assign(banner.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100%",
      background: "#ff3b30",
      color: "white",
      textAlign: "center",
      padding: "10px",
      zIndex: "9999",
      fontFamily: "sans-serif"
    });

    document.body.appendChild(banner);
  }

  function removeOfflineBanner() {
    const banner = document.getElementById("offline-banner");
    if (banner) banner.remove();
  }

  // Initial check
  if (!navigator.onLine) {
    showOfflineBanner();
  }

  // Listen for changes
  window.addEventListener("offline", showOfflineBanner);
  window.addEventListener("online", removeOfflineBanner);
}


// ====== 🔗 EXTERNAL LINK HANDLING ======
// ====== 🔗 EXTERNAL LINK HANDLING ======
// ====== 🔗 EXTERNAL LINK HANDLING ======
function handleExternalLinks() {
  document.addEventListener('click', (e) => {
    // 1. Find the link or button being clicked
    const target = e.target.closest('a') || e.target.closest('button');
    if (!target) return;

    // 2. Get the destination URL
    // Firebase Redirects usually happen via window.location, 
    // but if it's a link click, we catch it here.
    const href = target.href || "";

    // 3. FORCE FIREBASE & GOOGLE TO STAY INSIDE
    if (href.includes('google.com') || href.includes('firebaseapp.com')) {
      e.preventDefault(); // Stop the app from opening Chrome
      window.location.assign(href); // Force the current window to go there
    }
  }, true); // Use 'true' for capture phase to catch it before other scripts
}


// ====== OPTIONAL: LOADING INDICATOR ======
window.addEventListener("load", () => {
  console.log("Fully loaded ✅");
});