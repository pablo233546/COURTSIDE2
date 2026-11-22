/* NBA SUBMENU AND TRAINING */
const themeToggle = document.querySelector(".theme-toggle");
const themeIcon = themeToggle?.querySelector(".theme-icon");
const themeStorageKey = "courtside-theme";

function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    document.body.dataset.theme = theme;
    if (themeIcon) {
        themeIcon.textContent = theme === "light" ? "\u2600" : "\u263E";
    }

    if (themeToggle) {
        const nextTheme = theme === "light" ? "dark" : "light";
        themeToggle.setAttribute("aria-label", `Switch to ${nextTheme} mode`);
        themeToggle.setAttribute("title", `Switch to ${nextTheme} mode`);
    }
}

let savedTheme = "dark";
try {
    const storedTheme = localStorage.getItem(themeStorageKey);
    if (storedTheme === "light" || storedTheme === "dark") {
        savedTheme = storedTheme;
    }
} catch (error) {
    console.warn("Could not read the saved COURTSIDE theme:", error);
}
setTheme(savedTheme);

themeToggle?.addEventListener("click", () => {
    const nextTheme = document.body.dataset.theme === "light" ? "dark" : "light";
    setTheme(nextTheme);

    try {
        localStorage.setItem(themeStorageKey, nextTheme);
    } catch (error) {
        console.error("Could not save the selected COURTSIDE theme:", error);
    }
});

const dropdowns = document.querySelectorAll(".nav-dropdown");

dropdowns.forEach((dropdown) => {
    dropdown.addEventListener("toggle", () => {
        if (dropdown.open) {
            dropdowns.forEach((otherDropdown) => {
                if (otherDropdown !== dropdown) {
                    otherDropdown.open = false;
                }
            });
        }
    });
});


// NBA TEAMS

const teamsGrid =
    document.getElementById("nba-teams-grid") ||
    document.getElementById("teams-grid");
const teamFilters = document.querySelectorAll(".team-filter");

let allTeams = [];

if (teamsGrid) {
    loadTeams();
}

async function loadTeams() {
    try {
        const response = await fetch("http://localhost:3000/api/teams");

        if (!response.ok) {
            throw new Error(`Failed to load teams (HTTP ${response.status})`);
        }

        allTeams = await response.json();
        if (!Array.isArray(allTeams)) {
            throw new Error("NBA API returned an invalid teams list");
        }

        renderTeams(allTeams);

    } catch (error) {
        console.error("Teams loading error:", error);
        teamsGrid.innerHTML =
            "<p>Could not load NBA teams. Make sure the backend is running and try again.</p>";
    }
}

function renderTeams(teams) {
    teamsGrid.innerHTML = teams.map(team => `
        <article 
        class="team-card"
          onclick="window.location.href='team.html?id=${team.id}'"
>

            <div class="team-logo">
                <img 
                    src="https://a.espncdn.com/i/teamlogos/nba/500/${team.abbreviation.toLowerCase()}.png"
                    alt="${team.full_name} logo"
                    onerror="this.style.display='none'"
                >
            </div>

            <span class="team-abbreviation">
                ${team.abbreviation}
            </span>

            <h3>${team.full_name}</h3>

            <div class="team-info">
                <span>${team.conference} Conference</span>
                <span>${team.division} Division</span>
            </div>

        </article>
    `).join("");
}

// CONFERENCE FILTERS

teamFilters.forEach(button => {
    button.addEventListener("click", () => {

        teamFilters.forEach(filter => {
            filter.classList.remove("active");
        });

        button.classList.add("active");

        const conference = button.dataset.conference;

        const filteredTeams = conference === "all"
            ? allTeams
            : allTeams.filter(team => team.conference === conference);

        renderTeams(filteredTeams);
    });
});
