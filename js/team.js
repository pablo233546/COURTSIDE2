
const teamInfo = document.getElementById("team-info");

if (teamInfo) {
    loadTeam();
}

async function loadTeam() {
    const params = new URLSearchParams(window.location.search);
    const teamId = Number(params.get("id"));

    if (!Number.isInteger(teamId) || teamId < 1) {
        showTeamError("Invalid team ID.");
        return;
    }

    try {
        const response = await fetch(
            `http://localhost:3000/api/teams/${teamId}`
        );

        if (!response.ok) {
            throw new Error("Team not found");
        }

        const team = await response.json();

        renderTeam(team);
        loadRoster(teamId);

    } catch (error) {
        console.error("Team loading error:", error);
        showTeamError("Could not load team. Please try again.");
    }
}

function renderTeam(team) {
    const logoUrl = `https://a.espncdn.com/i/teamlogos/nba/500/${team.abbreviation.toLowerCase()}.png`;

    teamInfo.innerHTML = `
        <div class="team-hero-content">

            <div class="team-hero-logo">
                <img
                    src="${logoUrl}"
                    alt="${team.full_name} logo"
                    onerror="this.style.display='none'"
                >
            </div>

            <div class="team-hero-text">
                <span class="team-tag">
                    NBA TEAM
                </span>

                <h1>${team.full_name}</h1>

                <p class="team-subtitle">
                    ${team.city} · ${team.conference} Conference
                </p>

                <p class="team-description">
                    Explore the profile, information and history
                    of the ${team.full_name}.
                </p>
            </div>

        </div>
    `;

    document.getElementById("team-city").textContent = team.city;
    document.getElementById("team-conference").textContent =
        team.conference;
    document.getElementById("team-division").textContent =
        team.division;
    document.getElementById("team-abbreviation").textContent =
        team.abbreviation;

        async function loadRoster(teamId) {
    const rosterGrid = document.getElementById("roster-grid");

    try {
        const response = await fetch(
            `http://localhost:3000/api/teams/${teamId}/players`
        );

        if (!response.ok) {
            throw new Error("Could not load active roster");
        }

        const players = await response.json();

        if (!players.length) {
            rosterGrid.innerHTML = "<p>No active players found.</p>";
            return;
        }

        renderRoster(players);

    } catch (error) {
        console.error("Roster loading error:", error);

        rosterGrid.innerHTML = `
            <p class="roster-error">
                Could not load the current roster.
            </p>
        `;
    }
}

function renderRoster(players) {
    const rosterGrid = document.getElementById("roster-grid");

    rosterGrid.innerHTML = players.map(player => {
        const firstName = player.first_name || "";
        const lastName = player.last_name || "";
        const initials =
            (firstName[0] || "") + (lastName[0] || "");

        return `
            <article class="player-card">
                <div class="player-avatar">
                    ${initials}
                </div>

                <div class="player-card-info">
                    <span class="player-number">
                        #${player.jersey_number || "—"}
                    </span>

                    <h3>
                        ${firstName} ${lastName}
                    </h3>

                    <p>${player.position || "Position unknown"}</p>

                    <span class="player-height">
                        ${player.height || "Height unknown"}
                    </span>
                </div>
            </article>
        `;
    }).join("");
}
}

function showTeamError(message) {
    teamInfo.innerHTML = `
        <p class="team-error">${message}</p>
    `;
}
