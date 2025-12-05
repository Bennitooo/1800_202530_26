// This Vite config file (vite.config.js) tells Rollup (production bundler) 
// to treat multiple HTML files as entry points so each becomes its own built page.

import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                index: resolve(__dirname, "index.html"),
                login: resolve(__dirname, "login.html"),
                main: resolve(__dirname, "main.html"),
                profile: resolve(__dirname, "profile.html"),
                session: resolve(__dirname, "session.html"),
                socialfeed: resolve(__dirname, "socialfeed.html"),
                create: resolve(__dirname, "create.html"),
                EachActiveSession: resolve(__dirname, "EachActiveSession.html")
            }
        }
    }
});
