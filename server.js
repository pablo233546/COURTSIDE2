

require("dotenv").config({
    path: require("path").join(__dirname, ".env")
});

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

function getBallDontLieApiKey(res) {
    const apiKey = process.env.BALLDONTLIE_API_KEY;

    if (!apiKey) {
        console.error("BALLDONTLIE_API_KEY is not configured in backend/.env.");
        res.status(503).json({
            error: "NBA API key is not configured"
        });
        return null;
    }

    return apiKey;
}


// ПЕРЕВІРКА СЕРВЕРА
app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        message: "COURTSIDE backend is running!"
    });
});


// ОТРИМАННЯ ВСІХ КОМАНД
app.get("/api/teams", async (req, res) => {
    try {
        const apiKey = getBallDontLieApiKey(res);
        if (!apiKey) return;

        const response = await fetch(
            "https://api.balldontlie.io/v1/teams",
            {
                headers: {
                    Authorization: apiKey
                }
            }
        );

        if (!response.ok) {
            console.error("NBA teams API request failed:", response.status);
            return res.status(response.status).json({
                error: "NBA API request failed"
            });
        }

        const data = await response.json();

        const nbaTeams = data.data.filter(
            team => team.id >= 1 && team.id <= 30
        );

        res.json(nbaTeams);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Internal server error"
        });
    }
});

app.get("/api/games", async (req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const addDays = (date, days) => {
        const result = new Date(`${date}T00:00:00.000Z`);
        result.setUTCDate(result.getUTCDate() + days);
        return result.toISOString().slice(0, 10);
    };
    const isValidDate = value => {
        if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return false;
        }

        const date = new Date(`${value}T00:00:00.000Z`);
        return !Number.isNaN(date.getTime()) &&
            date.toISOString().slice(0, 10) === value;
    };

    const requestedFrom = req.query.from;
    const requestedTo = req.query.to;
    let from;
    let to;

    if (requestedFrom === undefined && requestedTo === undefined) {
        from = today;
        to = addDays(today, 6);
    } else if (requestedFrom === undefined) {
        from = requestedTo;
        to = requestedTo;
    } else {
        from = requestedFrom;
        if (!isValidDate(from)) {
            return res.status(400).json({
                error: "Dates must use the YYYY-MM-DD format and be valid calendar dates."
            });
        }
        to = requestedTo === undefined ? addDays(from, 6) : requestedTo;
    }

    if (!isValidDate(from) || !isValidDate(to)) {
        return res.status(400).json({
            error: "Dates must use the YYYY-MM-DD format and be valid calendar dates."
        });
    }

    if (from > to) {
        return res.status(400).json({
            error: "The 'from' date must be on or before the 'to' date."
        });
    }

    const apiKey = getBallDontLieApiKey(res);
    if (!apiKey) return;

    try {
        const games = [];
        let cursor;

        do {
            const params = new URLSearchParams({
                start_date: from,
                end_date: to,
                per_page: "100"
            });

            if (cursor !== undefined) {
                params.set("cursor", String(cursor));
            }

            const response = await fetch(
                `https://api.balldontlie.io/v1/games?${params}`,
                {
                    headers: {
                        Authorization: apiKey
                    }
                }
            );

            if (!response.ok) {
                console.error("NBA games API request failed:", response.status);
                const message = response.status === 401 || response.status === 403
                    ? "BALLDONTLIE rejected the API key or account access."
                    : response.status === 429
                        ? "BALLDONTLIE rate limit reached. The Free plan allows 5 requests per minute."
                        : `BALLDONTLIE games request failed (HTTP ${response.status}).`;

                return res.status(response.status === 429 ? 429 : 502).json({
                    error: message
                });
            }

            const payload = await response.json();
            if (!Array.isArray(payload.data)) {
                throw new Error("BALLDONTLIE returned an invalid games response.");
            }

            games.push(...payload.data);
            cursor = payload.meta && payload.meta.next_cursor;
        } while (cursor !== undefined && cursor !== null);

        res.json(games);
    } catch (error) {
        console.error("NBA games loading error:", error);
        res.status(502).json({
            error: "Could not load NBA games. Please try again later."
        });
    }
});


// НОВИЙ МАРШРУТ: ОДНА КОМАНДА
app.get("/api/teams/:id", async (req, res) => {
    try {
        const apiKey = getBallDontLieApiKey(res);
        if (!apiKey) return;

        const teamId = Number(req.params.id);

        if (!Number.isInteger(teamId) || teamId < 1) {
            return res.status(400).json({
                error: "Invalid team ID"
            });
        }

        const response = await fetch(
            `https://api.balldontlie.io/v1/teams/${teamId}`,
            {
                headers: {
                    Authorization: apiKey
                }
            }
        );

        if (!response.ok) {
            console.error("NBA team API request failed:", response.status);
            return res.status(response.status).json({
                error: "Could not load team"
            });
        }

        const data = await response.json();
        res.json(data.data);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Internal server error"
        });
    }
});


// НОВИЙ МАРШРУТ: ГРАВЦІ КОМАНДИ
app.get("/api/teams/:id/players", async (req, res) => {
    try {
        const apiKey = getBallDontLieApiKey(res);
        if (!apiKey) return;

        const teamId = Number(req.params.id);

        if (!Number.isInteger(teamId) || teamId < 1) {
            return res.status(400).json({
                error: "Invalid team ID"
            });
        }

        const params = new URLSearchParams();
        params.append("team_ids[]", teamId);
        params.append("per_page", "100");

        const response = await fetch(
            `https://api.balldontlie.io/v1/players/active?${params}`,
            {
                headers: {
                    Authorization: apiKey
                }
            }
        );

        if (!response.ok) {
    const errorDetails = await response.text();

    console.error("BALLDONTLIE:", response.status, errorDetails);

    return res.status(response.status).json({
        error: "Could not load active players",
        status: response.status,
        details: errorDetails
    });
}

        const data = await response.json();

        res.json(data.data);

    } catch (error) {
        console.error("Active players error:", error);

        res.status(500).json({
            error: "Internal server error"
        });
    }
});


// ЗАПУСК СЕРВЕРА
app.listen(PORT, () => {
    console.log(`COURTSIDE server running on http://localhost:${PORT}`);
});
