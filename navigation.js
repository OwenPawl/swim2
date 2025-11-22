// Global load function
window.load = function(file, scriptFile, clickedNavElement) {
  
  // 1. Visual Feedback
  if (clickedNavElement) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    clickedNavElement.classList.add('active');
  }

  // 2. Fetch Content
  fetch(file)
    .then(response => {
      if (!response.ok) throw new Error(response.statusText);
      return response.text();
    })
    .then(html => {
      const app = document.getElementById("app");
      if(app) {
        app.innerHTML = html;
        
        // 3. Handle Scripts
        if (scriptFile) {
          // Cleanup old scripts to prevent duplicate listeners
          const oldScript = document.querySelector(`script[src="${scriptFile}"]`);
          if (oldScript) oldScript.remove();

          const script = document.createElement("script");
          script.src = scriptFile;
          document.body.appendChild(script);
        }
      }
    })
    .catch(err => console.error("Nav Error:", err));
};

// Initial Load
document.addEventListener("DOMContentLoaded", () => {
  const firstTab = document.querySelector('.nav-item');
  if (firstTab) {
    // IMPORTANT: Make sure you have created schedule.html and schedule.js!
    window.load("schedule.html", "schedule.js", firstTab);
  }
});
