# DUNDER MIFFLIN MISSION CONTROL — BRICK EDITION

> *"I am not going to explain this more than once. Pay attention. Unlike Ryan, you will not get a second chance."*
> — Dwight K. Schrute, Assistant Regional Manager

---

## WHAT IS THIS

This is the official Dunder Mifflin Mission Control dashboard. It monitors AI agents in real time. Each agent is represented by a LEGO minifigure of an actual Scranton employee. You will watch them work. You will not interfere unless they enter an error state. That is your only job.

I built it. Do not touch anything you do not understand. If you are unsure whether you understand something, you do not understand it.

---

## REQUIREMENTS

Before you begin, confirm you have the following. Do not proceed if you do not.

- **Node.js 18 or higher.** If you have Node 16, that is your fault.
- **npm.** It comes with Node. If you somehow do not have it, I cannot help you.
- **A terminal.** Not the kind with trains. The command-line kind. If you do not know what this is, close the laptop and call IT. Ask for Dwight. I will not come.
- **A brain.** Optional based on observed usage patterns.

---

## STEP-BY-STEP INSTALLATION

Follow these steps exactly. Exactly. Do not improvise. Improvisation is for jazz musicians and people who fail.

### Step 1 — Get the code

Open your terminal. Type this. Press Enter.

```bash
git clone https://github.com/mastalink/mission-control.git
```

This downloads the repository. A repository is a folder with a history. Like Schrute Farms, but digital. Do not ask follow-up questions.

### Step 2 — Enter the directory

```bash
cd mission-control
```

You are now inside the project. Do not wander. Stay on the path.

### Step 3 — Install dependencies

```bash
npm install
```

This will download many packages written by strangers on the internet. This is normal. It takes between 30 seconds and 4 minutes depending on your internet connection. If it takes longer than 4 minutes, your internet provider has failed you. That is not my problem.

You will see warnings. Ignore them. Warnings are for cowards.

### Step 4 — Start the development server

```bash
npm run dev
```

You will see output like this:

```
  VITE v5.x.x  ready in 312 ms

  ➜  Local:   http://localhost:5173/
```

The number after `ready in` does not matter. The URL does. Copy it.

### Step 5 — Open the dashboard

Open a web browser. A real one. Not Internet Explorer. Not whatever your default browser is if it is Internet Explorer.

Navigate to:

```
http://localhost:5173
```

You will be greeted by the Mission Control splash screen. Michael Scott's face will appear first. This is unavoidable. Scroll past it emotionally.

### Step 6 — Load Demo Mode

Click **Demo Mode**.

This loads 16 agents — your colleagues. Watch them work. Some are talking. Some are thinking. Some are calling tools. Dwight is always doing something productive. Kevin is not.

Do not click randomly. Observe first. This is the way of the Samurai and also of competent IT personnel.

---

## THE THREE VIEWS

Once inside, you have three floor views accessible from the top tabs:

| Tab | Location | Who Is There |
|-----|-----------|--------------|
| **Main Office** | Open floor, reception, Michael's office | Everyone doing their job |
| **Warehouse** | Distribution center | Darryl, Roy, heavy lifting |
| **Parking Lot** | Outside | Idle agents. They are on a break. Do not disturb them. |

---

## SPECIAL FEATURES

### Zoom
Use the `+` and `−` buttons in the top-right corner of the floor plan. The `%` button in the middle resets to 100%. Do not zoom in past 200%. I am warning you now.

### Fire Drill Mode
Click the `🚒 fire drill` button in the bottom-right corner.

Paper will fall from the sky. Agents will scatter. The office will turn red. This is a simulation. **Do not call 911.** Do not pull any actual fire alarms. I am speaking from experience when I say that HR takes this very seriously.

Click the button again to end the drill. Assess performance. Document who panicked.

### Memorabilia
Throughout the Main Office, you will find five important artifacts. Hover over them.

- 🏆 **Dundie Award** — Regional Manager's Award of Excellence. Self-awarded. Still counts.
- ☕ **World's Best Boss Mug** — Purchased at Spencer Gifts. The sentiment is accurate.
- 🌶️ **Kevin's Chili** — A family recipe. Do not ask for it. Kevin will talk for 45 minutes.
- 📎 **Jell-O Stapler** — Jim's. Do not laugh. It was not funny the first time or the fourteenth time.
- 🫖 **Teapot** — Pam's. There is a note inside. It is none of your business.

---

## CONNECTING TO A REAL GATEWAY

If you have a live OpenClaw gateway running, click **Quick Connect** on the splash screen.

Enter your WebSocket URL. Format:

```
ws://your-server:port
```

The dashboard will connect and display live agents. If connection fails, check:
1. Is the server running? Start it.
2. Is the port correct? Check it.
3. Is your firewall blocking it? Disable it or configure a rule.
4. Is it a user error? Almost certainly yes.

---

## BUILDING FOR PRODUCTION

```bash
npm run build
```

Output goes to the `dist/` folder. Serve it with any static file server. I recommend Nginx. I do not recommend asking me to set up Nginx for you.

---

## TROUBLESHOOTING

**"Port 5173 is already in use"**
Something else is running there. Find it and stop it. `lsof -i :5173` on Mac/Linux. On Windows, Google it. I am not a Windows person.

**Characters are not showing up**
You did not click Demo Mode. Click Demo Mode.

**The images are broken / all grey boxes**
The `public/chars/` folder is missing PNG files. Re-clone the repository. You probably deleted something.

**It says "No agents on the floor"**
This is correct behavior when no gateway is connected and Demo Mode has not been activated. This is not a bug. This is you not reading the instructions.

**Michael Scott keeps talking**
This is also correct behavior. There is no fix.

---

## TECH STACK

For those who care about such things:

- **React 18** — UI framework
- **Vite** — Build tool. Fast. Unlike some people.
- **Framer Motion** — Animations. The characters bob and shake and think.
- **Zustand** — State management. Simpler than Redux. You are welcome.
- **Tailwind CSS** — Styling. No CSS files were harmed.
- **WebSockets** — Real-time agent communication

---

## FINAL WORDS

> *"Through every dark night, there's a bright day after that. So no matter how hard it gets, stick your chest out, keep your head up, and handle it."*
>
> — Michael Scott (quoting Tupac, incorrectly attributed, still meaningful)

If this README did not answer your question, the answer is probably in the code. Read the code. That is what it is there for.

Do not file a GitHub issue asking why Kevin is not in the Warehouse view. Kevin works in Accounting. He does not do manual labor. This was a deliberate product decision.

---

*README authored under duress by D.K. Schrute, Assistant Regional Manager, Dunder Mifflin Scranton.*
*All errors are Jim's fault.*
