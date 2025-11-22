// We attach 'load' to the window object to ensure it is globally available
window.load = function(file, scriptFile, clickedNavElement) {
  
  // 1. Visual Feedback
  if (clickedNavElement) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    clickedNavElement.classList.add('active');
  }

  // 2. Fetch Content
  fetch(file)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load ${file} - Status: ${response.status}`);
      }
      return response.text();
    })
    .then(html => {
      const app = document.getElementById("app");
      if(app) {
        app.innerHTML = html;
        
        // 3. Handle Scripts
        if (scriptFile) {
          const oldScript = document.querySelector(`script[src="${scriptFile}"]`);
          if (oldScript) oldScript.remove();

          const script = document.createElement("script");
          script.src = scriptFile;
          // Append to body and run
          document.body.appendChild(script);
        }
      }
    })
    .catch(err => {
      console.error("Nav Error:", err);
      const app = document.getElementById("app");
      if(app) app.innerHTML = `<div style="text-align:center; padding:20px; color:#850000;">
        <h3>Error Loading View</h3>
        <p>Could not load <strong>${file}</strong>.</p>
        <p>Check console for details.</p>
      </div>`;
    });
};

// Initial Load
document.addEventListener("DOMContentLoaded", () => {
  const firstTab = document.querySelector('.nav-item');
  if (firstTab) {
    // Default to schedule. If you don't have schedule.html yet, 
    // this will error unless you change it to attendance.html
    window.load("schedule.html", "table_populator.js", firstTab);
  }
});
