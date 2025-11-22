document.getElementById("dateInput").addEventListener("change", (event) => {
  document.getElementById("myTable").innerHTML = "<tr><th>Loading...</th></tr>";
});
window.addEventListener("scheduleUpdated", (e) => {
  updateTable(e.detail);
});

function normalizeSchedule(scheduleData) {
  if (Array.isArray(scheduleData)) return scheduleData;
  if (typeof scheduleData === "string" && scheduleData.trim()) {
    try { return JSON.parse(scheduleData); } catch (e) { console.error("Unable to parse schedule", e); }
  }
  const stored = sessionStorage.getItem("schedule");
  if (stored) {
    try { return JSON.parse(stored); } catch (e) { console.error("Unable to parse stored schedule", e); }
  }
  return [];
}

function updateTable(schedule){
  const data = normalizeSchedule(schedule)
    .filter(item => (item[2]!="late_canceled"&&![11485475,11559838,13602611,13167161,""].includes(item[0])))
    .map(i => i.slice(0,7));
  if (!data.length) {
    document.getElementById("myTable").innerHTML = "<tr><th>No Events</th></tr>";
    return;
  }
  const merged = [];
  for (let i = 0; i < data.length; ) {
    const [id,vid,state, start, end, name, level] = data[i];
    let blockEnd = end;
    let vids = [vid];
    let states=[state];
    let j = i + 1;
    while (
      j < data.length &&
      data[j][0] === id &&
      data[j][3] === blockEnd // next start matches previous end
    ) {
      blockEnd = data[j][4];
      vids.push(data[j][1]);
      states.push(data[j][2]);
      j++;
    }
    // Only one row per Merged Block
    merged.push({start,end: blockEnd,name: (s =>(w = s.trim().split(/\s+/),(w.length > 1 ? [w[0], w[w.length-1]] : [w[0]]).map(x => x[0].toUpperCase() + (/^[A-Z]+$/.test(x) ? x.slice(1).toLowerCase() : x.slice(1))).join(" ")))(name),level,id,vids,states});
    i = j;
  }

  let html="";
  for (let i = 0; i < merged.length; i++){
    // Column 1: Name
    html += `<tr>`;
    html += `<td style="font-weight:800; color:#007bb4;">${merged[i].name}</td>`;
    
    // Column 2: Multiple Check-in Buttons
    html += `<td><div style="display:flex; flex-wrap:wrap; gap:5px;">`;
    for (let j = 0; j < merged[i].vids.length; j++){
      const isNoShow = merged[i].states[j] === "noshowed";
      const isComplete = merged[i].states[j] === "completed";
      const color = isNoShow ? "#850000" : (isComplete ? "#00833D" : "#007BB4");
      const text = isNoShow ? "No Show" : "Check In";
      
      html += `<button class="checkIn" 
          style="background-color:${color}; flex:1;" 
          id="${merged[i].vids[j]}" 
          data-state="${merged[i].states[j]}" 
          onclick='if (this.textContent === "Check In") {this.textContent = "No Show";this.style.backgroundColor="#850000";} else {this.textContent = "Check In";this.style.backgroundColor="#00833D";}'>
          ${text}
        </button>`;
    }
    html += `</div></td>`;

    // Column 3: Single Notes Button (always visible)
    html += `<td><button class="checkIn" style="background-color:#007BB4;" onclick="location.href='https://mcdonaldswimschool.pike13.com/people/${merged[i].id}/notes';" id="${merged[i].id}">Notes</button></td>`;
    html += `</tr>`;
  }
  
  console.log((merged.length>0)?html:"<tr><th>No Events</th></tr>");
  document.getElementById("myTable").innerHTML = (merged.length>0)?html:"<tr><th>No Events</th></tr>";
}

updateTable();

document.getElementById("submit").addEventListener("click", (event) => {
  let attendance=[];
  [...document.getElementById("myTable").rows].forEach(row=>{
    // Logic update: The buttons are now in cell index 1 (0=Name, 1=Buttons, 2=Notes)
    if(row.cells[1]) {
       attendance=attendance.concat(([...row.cells[1].querySelectorAll("button")].map(btn=>({vid:btn.id,state:btn.getAttribute("data-state"),type:btn.textContent}))));
    }
  });
  console.log(attendance);
  const desk="https://mcdonaldswimschool.pike13.com/api/v2/desk/";
  async function Attendance() {
  if (new Date() >= new Date(document.getElementById("dateInput").value)) {
    // Show simplified loading message in the buttons cell if desired, 
    // but typically we replace the whole table content.
    // For now we just replace the table content to show success.
    document.getElementById("myTable").innerHTML = "<tr><th>Attendance Submitted!</th></tr>";
    
    const headers = {
      "Authorization": `Bearer ${localStorage.getItem("access_token")}`,
      "Content-Type": "application/json"
    };
    // reset
    for (const v of attendance.filter(v => (v.type == "Check In" ? "complete" : "noshow") != v.state && v.state != "registered")) {
      await fetch(`${desk}visits/${v.vid}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ visit: { state_event: "reset" } })
      });
    }
    // update state
    for (const v of attendance.filter(v => (v.type == "Check In" ? "complete" : "noshow") != v.state)) {
      await fetch(`${desk}visits/${v.vid}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ visit: { state_event: v.type == "Check In" ? "complete" : "noshow" } })
      });
    }
    // punch no-shows
    for (const v of attendance.filter(v => v.type == "No Show" && v.state != "noshow")) {
      await fetch(`${desk}punches`, {
        method: "POST",
        headers,
        body: JSON.stringify({ punch: { visit_id: v.vid } })
      });
    }
    await new Promise(r => setTimeout(r, 500));
    document.getElementById("dateInput").dispatchEvent(new Event("change"));
  } else {
    document.getElementById("myTable").innerHTML = "<tr><th>All Events Must Be In the Past</th></tr>";
    await new Promise(r => setTimeout(r, 2000));
    updateTable();
  }
}
  Attendance();
});

document.getElementById("reset").addEventListener("click", (event) => {
  let attendance=[];
  [...document.getElementById("myTable").rows].forEach(row=>{
     // Logic update: Buttons are in cell index 1
     if(row.cells[1]) {
        attendance=attendance.concat(([...row.cells[1].querySelectorAll("button")].map(btn=>({vid:btn.id,state:btn.getAttribute("data-state"),type:btn.textContent}))));
     }
  });
  console.log(attendance);
  const desk="https://mcdonaldswimschool.pike13.com/api/v2/desk/";
  async function Reset(){
    document.getElementById("myTable").innerHTML = "<tr><th>Attendance Reset!</th></tr>";
    await Promise.allSettled(attendance.map(visit=>fetch(desk+`visits/${visit.vid}`,{body:JSON.stringify({"visit":{"state_event":"reset"}}),method:"PUT",headers: {"Authorization": `Bearer ${localStorage.getItem("access_token")}`,"Content-Type": "application/json"},redirect: "follow"})));
    await new Promise(resolve => setTimeout(resolve, 500));
    document.getElementById("dateInput").dispatchEvent(new Event("change"));
  };
  Reset();
});
