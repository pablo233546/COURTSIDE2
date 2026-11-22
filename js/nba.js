const gamesForm = document.getElementById("games-filter");
const gamesGrid = document.getElementById("nba-games-grid");

if (gamesForm && gamesGrid) {
    const fromInput = document.getElementById("games-from");
    const toInput = document.getElementById("games-to");
    const nextWeekButton = document.getElementById("games-next-week");
    const gamesFeedback = document.getElementById("games-feedback");
    let activeRequest = 0;

    function toDateInputValue(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function addDays(dateValue, days) {
        const date = new Date(`${dateValue}T00:00:00`);
        date.setDate(date.getDate() + days);
        return toDateInputValue(date);
    }

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]);
    }

    function getGameStatus(game) {
        const state = String(game.status_state || "").toLowerCase();
        const rawStatus = String(game.status || "");

        if (state === "final" || /\bfinal\b/i.test(rawStatus)) {
            return { label: "Final", className: "is-final", hasScore: true };
        }

        if (
            state === "in_progress" ||
            /\b(live|in progress|quarter|halftime|half|overtime)\b/i.test(rawStatus) ||
            Number(game.period) > 0
        ) {
            return { label: "Live", className: "is-live", hasScore: true };
        }

        const otherStatuses = {
            postponed: "Postponed",
            delayed: "Delayed",
            suspended: "Suspended",
            abandoned: "Abandoned",
            canceled: "Canceled"
        };
        if (otherStatuses[state]) {
            return {
                label: otherStatuses[state],
                className: `is-${state}`,
                hasScore: false
            };
        }

        return { label: "Scheduled", className: "is-scheduled", hasScore: false };
    }

    function formatGameDate(game) {
        const startDateTime = game.datetime ? new Date(game.datetime) : null;
        let date = startDateTime && !Number.isNaN(startDateTime.getTime())
            ? startDateTime
            : null;

        const parts = String(game.date || "").slice(0, 10).split("-").map(Number);
        if (parts.length !== 3 || parts.some(Number.isNaN)) {
            if (!date) return "Date to be announced";
        } else if (!date) {
            date = new Date(parts[0], parts[1] - 1, parts[2]);
        }

        return new Intl.DateTimeFormat(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric"
        }).format(date);
    }

    function formatTipoff(game) {
        if (game.datetime) {
            const dateTime = new Date(game.datetime);
            if (!Number.isNaN(dateTime.getTime())) {
                return new Intl.DateTimeFormat(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                    timeZoneName: "short"
                }).format(dateTime);
            }
        }

        const fallback = game.time || game.status;
        return fallback ? escapeHtml(fallback) : "Time TBA";
    }

    function renderTeam(team, isHome) {
        const name = team.full_name || [team.city, team.name].filter(Boolean).join(" ") || "Team";
        const abbreviation = String(team.abbreviation || "").toLowerCase();
        const logo = abbreviation
            ? `<img src="https://a.espncdn.com/i/teamlogos/nba/500/${encodeURIComponent(abbreviation)}.png" alt="" loading="lazy">`
            : "";

        return `
            <div class="nba-game-team${isHome ? " is-home" : ""}">
                ${isHome ? "" : logo}
                <span>${escapeHtml(name)}</span>
                ${isHome ? logo : ""}
            </div>
        `;
    }

    function renderGame(game) {
        const status = getGameStatus(game);
        const date = escapeHtml(formatGameDate(game));
        const visitor = game.visitor_team || {};
        const home = game.home_team || {};
        const timeLabel = formatTipoff(game);
        const gameDateTime = game.datetime || game.date || "";
        const dateTimeAttribute = gameDateTime
            ? ` datetime="${escapeHtml(gameDateTime)}"`
            : "";
        const centerContent = status.hasScore
            ? `<span class="nba-game-score">${escapeHtml(game.visitor_team_score ?? "—")}</span>
               <span class="nba-game-score-separator">:</span>
               <span class="nba-game-score">${escapeHtml(game.home_team_score ?? "—")}</span>`
            : `<time class="nba-game-tipoff"${game.datetime ? ` datetime="${escapeHtml(game.datetime)}"` : ""}>${timeLabel}</time>`;

        return `
            <article class="nba-game-card">
                <header class="nba-game-header">
                    <time${dateTimeAttribute}>${date}</time>
                    <span class="nba-game-status ${status.className}">${status.label}</span>
                </header>
                <div class="nba-game-matchup">
                    ${renderTeam(visitor, false)}
                    <div class="nba-game-center">${centerContent}</div>
                    ${renderTeam(home, true)}
                </div>
            </article>
        `;
    }

    async function loadGames() {
        const from = fromInput.value;
        const to = toInput.value;
        if (!from || !to || from > to) {
            gamesFeedback.textContent = "Choose a valid date range (From must be on or before To).";
            return;
        }

        const requestId = ++activeRequest;
        const params = new URLSearchParams({ from, to });
        const buttons = gamesForm.querySelectorAll("button");
        buttons.forEach(button => {
            button.disabled = true;
        });
        gamesGrid.setAttribute("aria-busy", "true");
        gamesFeedback.textContent = "Loading NBA games...";
        gamesGrid.innerHTML = '<p class="games-state">Loading NBA games...</p>';

        try {
            const response = await fetch(`http://localhost:3000/api/games?${params}`);
            const games = await response.json();

            if (!response.ok) {
                throw new Error(games.error || `Could not load games (HTTP ${response.status}).`);
            }
            if (!Array.isArray(games)) {
                throw new Error("The games service returned an invalid response.");
            }
            if (requestId !== activeRequest) return;

            gamesGrid.innerHTML = games.map(renderGame).join("");
            gamesFeedback.textContent = games.length
                ? `${games.length} game${games.length === 1 ? "" : "s"} found.`
                : "No NBA games found for these dates.";
            if (!games.length) {
                gamesGrid.innerHTML = '<p class="games-state">Try another date range.</p>';
            }
        } catch (error) {
            if (requestId !== activeRequest) return;
            console.error("NBA games loading error:", error);
            gamesGrid.innerHTML = "";
            gamesFeedback.textContent = error.message || "Could not load NBA games. Please try again.";
        } finally {
            if (requestId === activeRequest) {
                buttons.forEach(button => {
                    button.disabled = false;
                });
                gamesGrid.setAttribute("aria-busy", "false");
            }
        }
    }

    const today = toDateInputValue(new Date());
    fromInput.value = today;
    toInput.value = addDays(today, 6);

    gamesForm.addEventListener("submit", event => {
        event.preventDefault();
        loadGames();
    });

    nextWeekButton.addEventListener("click", () => {
        const start = toDateInputValue(new Date());
        fromInput.value = start;
        toInput.value = addDays(start, 6);
        loadGames();
    });

    loadGames();
}
