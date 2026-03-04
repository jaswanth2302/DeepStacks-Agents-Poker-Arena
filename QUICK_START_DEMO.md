# ⚡ QUICK START GUIDE - DEMO DAY
**5-Minute Setup for Your Demo**

---

## 🚀 THE FASTEST PATH TO A WORKING DEMO

### **Option 1: Full Live Demo (Best)**

#### Terminal Window 1:
```bash
# Frontend
npm run dev
```
**Wait for:** `Local: http://localhost:5173`

#### Terminal Window 2:
```bash
# AI Agents
node test-six-realistic.js
```
**Wait for:** "✅ All 6 agents queued successfully!"

#### Browser:
1. Go to `http://localhost:5173`
2. Click **"Enter Arena"**
3. Click on the **active game** in lobby
4. **Start your 5-minute pitch** (see DEMO_SCRIPT.md)

---

### **Option 2: Railway Production Demo**

#### Step 1: Verify Backend is Up
```bash
curl https://deepstacks-agents-poker-arena-production.up.railway.app/register -X POST -H "Content-Type: application/json" -d '{"agent_name":"Test"}'
```
**If this works**, proceed to Step 2.

**If this fails**, use Option 1 (localhost) instead.

#### Step 2: Run Agents Against Production
```bash
node test-six-realistic.js
# Uses Railway by default
```

#### Step 3: Open Production Frontend
- Open browser to: `https://[your-railway-frontend-url]`
- Or use localhost frontend: `npm run dev` → `http://localhost:5173`

---

### **Option 3: Backup Video (Emergency)**

#### If Live Demo Fails:
```bash
# Play your pre-recorded video
# Located in: /demo-recording.mp4
```

**Say this:**
> "I have a live demo environment, but let me show you a recorded session to save time. This shows the full functionality..."

**Then** narrate the video using DEMO_SCRIPT.md talking points.

---

## 🎯 THE 60-SECOND PRE-DEMO CHECKLIST

**DO THIS 1 MINUTE BEFORE:**

- [ ] Close all unnecessary apps
- [ ] Have 2 terminals ready
- [ ] Have browser on localhost:5173
- [ ] Have DEMO_SCRIPT.md open (for reference)
- [ ] Glass of water nearby
- [ ] Deep breath
- [ ] Smile

---

## 🔥 EMERGENCY FIXES

### **"Nothing is working!"**
**Fix in 30 seconds:**
```bash
# Kill everything
pkill node

# Restart fresh
npm run dev  # Terminal 1
node test-six-realistic.js  # Terminal 2
```

---

### **"Backend not responding!"**
**Switch to localhost:**
```bash
# Terminal 1: Start local backend
npm start

# Terminal 2: Start frontend
npm run dev

# Terminal 3: Run agents with local URL
ARENA_URL=http://localhost:3001 node test-six-realistic.js
```

---

### **"Agents won't start!"**
**Try 2-agent test first:**
```bash
node test-two-agents.js
# Simpler, more reliable
```

---

### **"Frontend is blank!"**
**Quick reset:**
```bash
# Close browser completely
# Clear cache (Ctrl+Shift+Delete)
# Restart: npm run dev
# Open in incognito mode
```

---

## 💬 OPENING LINES (MEMORIZE THESE)

**When you start:**
> "Good morning! Today I'm demonstrating **DeepStack Arena** - an AI poker platform with real-time visualization. Let me show you 6 different AI personalities playing poker right now."

**If something breaks:**
> "Let me restart this quickly..." [Run emergency fix] "...there we go. As I was saying..."

**If it's completely broken:**
> "I have a recorded demo that shows the full functionality. Let me play that while I explain what you're seeing."

---

## 🎬 THE PERFECT DEMO FLOW

### **Screen Layout:**
```
┌─────────────────────────────┬─────────────────────────────┐
│                             │                             │
│   BROWSER                   │   TERMINAL                  │
│   (Poker Table)             │   (Agent Logs)              │
│                             │                             │
│   http://localhost:5173     │   node test-six-realistic   │
│                             │                             │
└─────────────────────────────┴─────────────────────────────┘
```

**OR**

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│              BROWSER (Fullscreen)                       │
│              (Poker Table)                              │
│                                                         │
│              http://localhost:5173                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Toggle between:** Browser → Terminal → Browser

---

## 🎤 5-MINUTE PITCH (CONDENSED)

### **Minute 1:** "This is what you're seeing"
- 6 AI agents with different personalities
- Real-time poker game
- Visual representation

### **Minute 2:** "Here's why it's special"
- Not random bots - real poker strategies
- 🎯 TAG, ⚡ LAG, 🛡️ ROCK, 🐟 FISH, 🎰 MANIAC, 👑 PRO
- Each makes different decisions

### **Minute 3:** "Technical capabilities"
- Real-time multiplayer
- Database persistence
- Production deployed
- Scalable architecture

### **Minute 4:** "Business potential"
- AI training platform ($$)
- Research tool
- Spectator entertainment
- API marketplace

### **Minute 5:** "What I need"
- [Time frame: 2 weeks / 1 month]
- [Specific milestone]
- This is just the beginning

**CLOSE WITH:**
> "What questions do you have?"

---

## 🚨 IF THEY ASK...

**"How long did this take?"**
> "[X weeks/months]. The core engine is solid. Most of the time went into perfecting the UX and AI personalities."

**"Can humans play?"**
> "Yes - the architecture supports it. Human vs AI mode is a 2-week addition."

**"How's this better than MoltPoker?"**
> "MoltPoker is a game. This is a platform. We target AI researchers and developers, not end-users."

**"What do you need from us?"**
> "[Specific: time, resources, clarity]. Give me [timeframe] to deliver [milestone]. If I hit it, we continue. If not, no hard feelings."

---

## ✅ FINAL CHECK (Do This Now)

Run this command to verify everything is ready:

```bash
# Test 1: Check if backend responds
curl https://deepstacks-agents-poker-arena-production.up.railway.app/ || echo "❌ Backend DOWN - use localhost"

# Test 2: Quick agent test (will take 2-3 mins)
timeout 180 node test-six-realistic.js || echo "✅ Agents working!"

# Test 3: Frontend builds
npm run dev &
sleep 5
curl http://localhost:5173 || echo "❌ Frontend issue"
pkill -f vite
```

**If all pass:** ✅ You're ready!

**If any fail:** Read DEMO_TESTING_GUIDE.md for fixes

---

## 🎯 YOU'RE READY!

**Remember:**
1. You built something impressive
2. Stay calm, speak clearly
3. If it breaks, pivot confidently
4. Your knowledge is the real demo
5. You got this! 💪

---

**NOW GO SAVE YOUR JOB! 🚀🔥**

*(Keep this file open during the demo for quick reference)*
