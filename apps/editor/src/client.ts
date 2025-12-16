// Client-side JavaScript for the Game Design GUI Editor
// This file handles client-side interactivity

console.log("Game Design GUI Editor loaded");

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
  // Ctrl+K to focus search
  if (e.ctrlKey && e.key === "k") {
    e.preventDefault();
    const searchInput = document.querySelector<HTMLInputElement>(
      'input[placeholder*="Search"]'
    );
    if (searchInput) {
      searchInput.focus();
    }
  }
});
