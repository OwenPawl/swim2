// Logic to populate the SCHEDULE (Read Only)
window.addEventListener("scheduleUpdated", (e) => {
  updateScheduleTable(e.detail);
});

// If data exists on load, render immediately
if (sessionStorage.getItem("schedule")) {
  updateScheduleTable(sessionStorage.getItem("schedule"));
}

function updateScheduleTable(scheduleData) {
  let data = [];
  try {
    data = typeof scheduleData === "string" ? JSON.parse(scheduleData) : scheduleData;
  } catch (e) { console.error("Parse error", e); return; }

  // Filter out invalid/canceled
  data = data.filter(item => (item[2]!="late_canceled" && item[2]!="canceled" && ![11485475,11559838,13602611,13167161,""].includes(item[0])));

  const tableBody = document.querySelector("#scheduleTable tbody");
  if (!data.length) {
    tableBody.innerHTML = "<tr><td colspan='3' style='text-align:center;'>No classes today</td></tr>";
    return;
  }

  let html = "";
  data.forEach(row => {
    // row structure: [id, vid, state, start, end, name, level]
    const startTime = row[3].split(" ")[0]; // Just the time part
    const name = row[5];
    const level = row[6] || "";

    html += `
      <tr>
        <td style="color:var(--muted); font-size:13px; font-weight:700;">${startTime}</td>
        <td class="name-col" title="${name}">${name}</td>
        <td style="font-size:14px;">${level}</td>
      </tr>
    `;
  });

  tableBody.innerHTML = html;
}
