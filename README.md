# FitQuest

## Overview

FitQuest is a minimalistic, gamified fitness app designed to support the growing number of gym-goers who work out without proper guidance. It allows users to create or join live workout sessions, earn XP, and unlock achievement badges that reflect their progress. A built-in social feed showcases user activity and fosters motivation through community interaction. Overall, FitQuest provides structure, accountability, and engagement for users at any fitness level.

---

## Features

- Create/Join live workout sessions
- Gain XP to level up your account
- Awarded badges for any progress made

---

## Technologies Used

- **Frontend**: HTML, Bootstrap CSS, JavaScript
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Backend**: Firebase for hosting
- **Database**: Firestore

---

## Usage

1. Install dependencies with `npm install`.
2. Start the development server with `npm run dev` (served by Vite).
3. Open your browser and visit the local address shown in the terminal (typically `http://localhost:5173`).
4. Create a workout session by clicking the `Create` button in the middle of the footer.
5. Enter a name for the session and add desired exercises.
6. Join other people's sessions from the `Session` button.
7. Navigate to profile and customize it (add new badges, change profile pic)
8. Follow other users on the app.

---

## Project Structure

```
project-name/
├── fonts/
├── images/
├── node_modules/...
├── src/
│ ├── components/
│ │ ├── site-footer.js
│ │ └── site-navbar.js
│ ├── authentication.js
│ ├── EachActiveSession.js
│ ├── firebaseConfig.js
│ ├── loginSignup.js
│ ├── main.js
│ ├── modal.js
│ ├── notification.js
│ ├── profile.js
│ ├── sessionsList.js
│ └── socialfeed.js
├── styles/
│   ├── style.css
├── .env
├── .gitignore
├── create.html
├── EachActiveSession.html
├── index.html
├── login.html
├── main.html
├── package-lock.json
├── package.json
├── profile.html
├── README.md
├── session.html
└── socialfeed.html
```

---

## Contributors

- **Bennett Lazarro**
- **Ryan Guan**
- **Niels van Atten**

---

## Acknowledgments

- Icons sourced from [Bootstrap](https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css) and [Google Icons](https://fonts.googleapis.com/icon?family=Material+Icons)
- We used [Claude](https://claude.ai/new) and [ChatGPT](https://chatgpt.com) to help us create
  and debug our JavaScript files

---

## Limitations and Future Work

### Limitations

- The user interface can be improved for better accesibility.
- Bugs regarding the hamburger menu and modal associated with it.
- Can only display one exercise for a chest movement when creating a session.

### Future Work

- Provide users with tips and recommendations.
- Combine fitness and nutrition tracking.
- Add everyday quests for the user to gain a bit of XP.
- Improve user interface by reorganizing pages and adding more text.

---

## License

Example:
This project is licensed under the MIT License. See the LICENSE file for details.
