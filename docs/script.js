 document.getElementById("analyzeBtn").addEventListener("click", async () => {
  const text = document.getElementById("journalEntry").value.trim();
  const moodEl = document.getElementById("mood");
  const quoteEl = document.getElementById("quote");
  const resultBox = document.getElementById("resultBox");

  if (text === "") {
    alert("Please write something in your journal!");
    return;
  }

  try {
    const response = await fetch("https://knowemotion.onrender.com/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text })
    });

    const data = await response.json();
    console.log("API Response:", data);

    if (data.mood && data.quote) {
      moodEl.textContent = data.mood;
      quoteEl.textContent = data.quote;
      resultBox.style.display = "block";

      const entry = {
        text: text,
        mood: data.mood,
        quote: data.quote,
        time: new Date().toLocaleString()
      };

      saveToLocalStorage(entry);
    } else {
      console.error("Invalid response format from API.");
      alert("Error: Invalid response format.");
    }
  } catch (err) {
    console.error("Error:", err);
    alert("Something went wrong. Is your server running?");
  }
});

document.getElementById("showEntriesBtn").addEventListener("click", () => {
  const entries = JSON.parse(localStorage.getItem("moodJournalEntries")) || [];
  const box = document.getElementById("entriesBox");
  const list = document.getElementById("entriesList");
  list.innerHTML = "";

  // ✅ MODIFIED DISPLAY WITH STYLING, EMOJI & DELETE
  entries.forEach(entry => {
    const div = document.createElement("div");
    const emoji = getMoodEmoji(entry.mood);
    const moodColor = getMoodColor(entry.mood);

    div.classList.add("entry-card");
    div.style.borderLeft = `6px solid ${moodColor}`;
    div.style.padding = "10px";
    div.style.marginBottom = "10px";
    div.style.backgroundColor = "#f9f9f9";
    div.style.borderRadius = "8px";

    div.innerHTML = `
      <p><strong>${entry.time}</strong></p>
      <p><em>Mood:</em> ${emoji} ${entry.mood}</p>
      <p><em>Entry:</em> ${entry.text}</p>
      <p><em>Quote:</em> “${entry.quote}”</p>
      <button class="delete-entry" data-time="${entry.time}" style="margin-top:5px;">❌ Delete</button>
    `;

    list.appendChild(div);
  });

  box.style.display = "block";
});

// ✅ DELETE SPECIFIC ENTRY
document.getElementById("entriesList").addEventListener("click", function (e) {
  if (e.target.classList.contains("delete-entry")) {
    const time = e.target.getAttribute("data-time");
    let entries = JSON.parse(localStorage.getItem("moodJournalEntries")) || [];
    entries = entries.filter(entry => entry.time !== time);
    localStorage.setItem("moodJournalEntries", JSON.stringify(entries));
    e.target.parentElement.remove();
  }
});

function saveToLocalStorage(entry) {
  const entries = JSON.parse(localStorage.getItem("moodJournalEntries")) || [];
  entries.push(entry);
  localStorage.setItem("moodJournalEntries", JSON.stringify(entries));
}

// ✅ MOOD EMOJI FUNCTION
function getMoodEmoji(mood) {
  const map = {
    happy: "😊",
    sad: "😢",
    angry: "😠",
    anxious: "😰",
    neutral: "😐",
    excited: "🥳",
    stressed: "😫",
    relaxed: "😌"
  };
  return map[mood.toLowerCase()] || "📝";
}

// ✅ MOOD COLOR FUNCTION
function getMoodColor(mood) {
  const map = {
    happy: "#facc15",
    sad: "#60a5fa",
    angry: "#f87171",
    anxious: "#a78bfa",
    stressed: "#fca5a5",
    relaxed: "#6ee7b7",
    excited: "#fcd34d",
    neutral: "#cbd5e1"
  };
  return map[mood.toLowerCase()] || "#ddd";
}

// ✅ DARK MODE
const switchToggle = document.getElementById('theme-toggle');
switchToggle.addEventListener('change', () => {
  document.body.classList.toggle('dark');
}); 

const deleteAllBtn = document.getElementById('deleteAllBtn');
deleteAllBtn.addEventListener('click', function() {
    localStorage.removeItem('moodJournalEntries');  // right key
    document.getElementById('entriesList').innerHTML = '';
    document.getElementById('entriesBox').style.display = 'none';
});
