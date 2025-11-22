document.getElementById("dateInput").addEventListener("change", () => {
  document.getElementById("myTable").querySelector("tbody").innerHTML = "<tr><td colspan='3' style='text-align:center; padding:20px;'>Loading...</td></tr>";
});

window.addEventListener("scheduleUpdated", (e) => {
  updateAttendanceTable(e.detail);
});

// Trigger immediate load if data exists
if (sessionStorage.getItem("schedule")) {
  updateAttendanceTable(sessionStorage.getItem("schedule"));
}

function normalizeSchedule(scheduleData) {
  if (Array.isArray(scheduleData)) return scheduleData;
  if (typeof scheduleData === "string" && scheduleData.trim()) {
    try { return JSON.parse(scheduleData); } catch (e) { return []; }
  }
  return [];
}

function updateAttendanceTable(schedule){
  const rawData = normalizeSchedule(schedule);
  
  // Filter
  const data = rawData.filter(item => (
    item[2] !== "late_canceled" && 
    ![11485475,11559838,13602611,13167161,""].includes(item[0])
  ));

  const tableBody = document.querySelector("#myTable tbody");

  if (!data.length) {
    tableBody.innerHTML = "<tr><td colspan='3' style='text-align:center;'>No Events</td></tr>";
    return;
  }

  // Merge Consecutive Logic
  const merged = [];
  for (let i = 0; i < data.length; ) {
    const [id, vid, state, start, end, name, level] = data[i];
    let blockEnd = end;
    let vids = [vid];
    let states = [state];
    
    // Look ahead for consecutive lessons for the SAME person
    let j = i + 1;
    while (
      j < data.length &&
      data[j][0] === id &&       // Same person
      data[j][3] === blockEnd    // Next start time == Previous end time
    ) {
      blockEnd = data[j][4];     // Extend block
      vids.push(data[j][1]);
      states.push(data[j][2]);
      j++;
    }

    // Format Name (Title Case)
    const formattedName = name.trim().split(/\s+/).map(x => 
      x[0].toUpperCase() + x.slice(1).toLowerCase()
    ).join(" ");

    merged.push({
      name: formattedName,
      id: id,
      vids: vids,
      states: states
    });
    
    i = j; // Skip processed rows
  }

  let html = "";
  merged.forEach(row => {
    html += `<tr>`;
    
    // 1. Name (No wrapping handled by CSS .name-col)
    html += `<td class="name-col" title="${row.name}">${row.name}</td>`;
    
    // 2. Buttons (Flex container for multiple lessons)
    html += `<td><div style="display:flex; gap:6px; overflow-x:auto;">`;
    row.vids.forEach((vid, index) => {
      const state = row.states[index];
      const isNoShow = state === "noshowed";
      const isComplete = state === "completed";
      
      // Determine color/text
      let bgColor = "#007BB4"; // Default Blue
      let text = "Check In";
      
      if (isNoShow) {
        bgColor = "#850000"; // Red
        text = "No Show";
      } else if (isComplete) {
        bgColor = "#00833D"; // Green
      }

      html += `<button class="checkIn" 
                 style="background-color:${bgColor}; flex:1;" 
                 id="${vid}" 
                 data-state="${state}" 
                 onclick="toggleCheckIn(this)">${text}</button>`;
    });
    html += `</div></td>`;

    // 3. Notes (Single button)
    html += `<td>
      <button class="checkIn" style="background-color:#007BB4;" 
      onclick="location.href='https://mcdonaldswimschool.pike13.com/people/${row.id}/notes';">
      Notes</button>
    </td>`;
    
    html += `</tr>`;
  });

  tableBody.innerHTML = html;
}

// Global function for the onclick handler to keep code clean
window.toggleCheckIn = function(btn) {
  if (btn.textContent === "Check In") {
    btn.textContent = "No Show";
    btn.style.backgroundColor = "#850000";
  } else {
    btn.textContent = "Check In";
    btn.style.backgroundColor = "#00833D";
  }
};

// --- Submit / Reset Logic ---

function collectAttendanceData() {
  const attendance = [];
  const rows = document.getElementById("myTable").rows;
  // Start from 0 since we query selector tbody in some versions, 
  // but if using .rows on table, header might be row 0. 
  // Safest is to query buttons directly.
  const buttons = document.querySelectorAll("#myTable .checkIn[id]"); // Only get check-in buttons (they have VIDs as IDs)
  
  buttons.forEach(btn => {
    attendance.push({
      vid: btn.id,
      state: btn.getAttribute("data-state"),
      type: btn.textContent
    });
  });
  return attendance;
}

document.getElementById("submit").addEventListener("click", async () => {
  const attendance = collectAttendanceData();
  const dateVal = document.getElementById("dateInput").value;
  
  // Basic validation
  if (new Date() < new Date(dateVal)) {
    alert("Cannot submit future attendance.");
    return;
  }

  const desk = "https://mcdonaldswimschool.pike13.com/api/v2/desk/";
  const headers = {
    "Authorization": `Bearer ${localStorage.getItem("access_token")}`,
    "Content-Type": "application/json"
  };

  document.querySelector(".floating-actions").innerHTML = "<button class='action-btn' style='background:#ccc'>Submitting...</button>";

  // Reset
  for (const v of attendance.filter(v => (v.type == "Check In" ? "complete" : "noshow") != v.state && v.state != "registered")) {
    await fetch(`${desk}visits/${v.vid}`, { method: "PUT", headers, body: JSON.stringify({ visit: { state_event: "reset" } }) });
  }
  // Update
  for (const v of attendance.filter(v => (v.type == "Check In" ? "complete" : "noshow") != v.state)) {
    await fetch(`${desk}visits/${v.vid}`, { method: "PUT", headers, body: JSON.stringify({ visit: { state_event: v.type == "Check In" ? "complete" : "noshow" } }) });
  }
  // Punch No-shows
  for (const v of attendance.filter(v => v.type == "No Show" && v.state != "noshow")) {
    await fetch(`${desk}punches`, { method: "POST", headers, body: JSON.stringify({ punch: { visit_id: v.vid } }) });
  }

  // Refresh
  await new Promise(r => setTimeout(r, 500));
  location.reload(); // Simple reload to refresh state
});

document.getElementById("reset").addEventListener("click", async () => {
  const attendance = collectAttendanceData();
  const desk = "https://mcdonaldswimschool.pike13.com/api/v2/desk/";
  const headers = { "Authorization": `Bearer ${localStorage.getItem("access_token")}`, "Content-Type": "application/json" };
  
  document.querySelector(".floating-actions").innerHTML = "<button class='action-btn' style='background:#ccc'>Resetting...</button>";

  await Promise.allSettled(attendance.map(visit => 
    fetch(`${desk}visits/${visit.vid}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ visit: { state_event: "reset" } })
    })
  ));

  await new Promise(r => setTimeout(r, 500));
  location.reload();
});
