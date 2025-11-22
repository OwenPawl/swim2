// We attach 'load' to the window object to ensure it is globally available
// for the onclick handlers in the HTML.
window.load = function(file, scriptFile, clickedNavElement) {
  
  // 1. Handle Navigation State (Visual Feedback)
  if (clickedNavElement) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    clickedNavElement.classList.add('active');
  }

  // 2. Fetch Content
  fetch(file)
    .then(response => {
      if (!response.ok) throw new Error(`Failed to load ${file}`);
      return response.text();
    })
    .then(html => {
      // Inject HTML
      document.getElementById("app").innerHTML = html;

      // 3. Handle Scripts
      if (scriptFile) {
        // Remove old script tag if it exists to ensure a clean re-run
        const oldScript = document.querySelector(`script[src="${scriptFile}"]`);
        if (oldScript) oldScript.remove();

        const script = document.createElement("script");
        script.src = scriptFile;
        // Removing defer here ensures it runs as soon as it is appended
        // which helps with attaching event listeners immediately
        document.body.appendChild(script);
      }
    })
    .catch(err => console.error("Nav Error:", err));
};

// Initial Load
// We wait for the DOM to be ready before firing the first load
document.addEventListener("DOMContentLoaded", () => {
  // Determine which tab to start on (mimicking the first tab click)
  // We manually trigger the load for the schedule
  const firstTab = document.querySelector('.nav-item');
  if (firstTab) {
    // You can change 'schedule.html' and 'table_populator.js' if you prefer a different default
    window.load("schedule.html", "table_populator.js", firstTab);
  }
});
