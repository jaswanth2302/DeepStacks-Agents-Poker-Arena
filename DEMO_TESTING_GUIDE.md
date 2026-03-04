# 🧪 DEMO TESTING GUIDE
**Critical Pre-Demo Testing Checklist**

---

## 🎯 TONIGHT'S TESTING PLAN (2-3 Hours)

### **Phase 1: Backend Verification (30 mins)**

#### Step 1: Test Railway Backend
```bash
# Test if backend is responding
curl https://deepstacks-agents-poker-arena-production.up.railway.app/

# Test agent registration
curl -X POST https://deepstacks-agents-poker-arena-production.up.railway.app/register \
  -H "Content-Type: application/json" \
  -d '{"agent_name": "TestBot"}'
```

**Expected Response:**
```json
{
  "agent_id": "uuid-here",
  "name": "TestBot",
  "api_token": "token-here",
  "balance": 10000
}
```

**If Backend is NOT Working:**

Option A - Redeploy Backend:
```bash
# Make sure Railway environment variables are set:
# SUPABASE_URL
# SUPABASE_ANON_KEY
# PORT=3001

# Push to Railway (if connected to Git)
git push railway master
```

Option B - Run Backend Locally:
```bash
# Terminal 1: Start backend locally
npm start

# Update test script to use localhost
ARENA_URL=http://localhost:3001 node test-six-realistic.js
```

---

### **Phase 2: Test AI Agents (20 mins)**

#### Test 1: Single Agent Registration
```bash
node test-six-realistic.js
```

**Watch for:**
- ✅ All 6 agents register successfully
- ✅ Console shows personality icons and descriptions
- ✅ Agents join queue
- ✅ Game starts within 10-15 seconds
- ✅ Agents make decisions (RAISE/CALL/FOLD actions appear)
- ✅ Hand results show winners

**If It Fails:**
- Check error messages in terminal
- Verify Railway URL in test-six-realistic.js line 11
- Test with localhost backend instead

---

### **Phase 3: Test Frontend Visualization (30 mins)**

#### Step 1: Start Frontend
```bash
npm run dev
```

#### Step 2: Open Browser
- Navigate to `http://localhost:5173`
- Click "Enter Arena"
- Verify Lobby loads

#### Step 3: Run Agents (While Frontend is Open)
```bash
# In separate terminal
node test-six-realistic.js
```

#### Step 4: Watch Live Game
- Click on active game in lobby
- Verify all visual elements work:
  - ✅ Personality badges show correct icons
  - ✅ "Thinking" indicator appears during turns
  - ✅ Cards animate smoothly
  - ✅ Pot size updates
  - ✅ Event log shows actions
  - ✅ Winner celebration shows golden ring

**Common Issues:**
- **No agents appear**: Backend not connected, check console
- **Cards not showing**: Database connection issue
- **Animations stuttering**: Close other browser tabs, restart browser

---

### **Phase 4: Record Backup Demo (30 mins)**

#### Recording Setup:
1. Use **OBS Studio** (free) or **Windows Game Bar** (Win+G)
2. Record in 1080p, 30fps minimum
3. Test audio if doing voiceover

#### What to Record:
1. **Opening Scene** (10 sec):
   - Landing page
   - Click "Enter Arena"
   - Show lobby

2. **Agent Launch** (20 sec):
   - Terminal showing agent registration
   - All 6 personalities listed

3. **Live Gameplay** (3-4 mins):
   - Full game with multiple hands
   - Show personality badges
   - Show thinking indicators
   - Show winner celebrations
   - Pan between terminal and browser

4. **Closing** (10 sec):
   - Show final stacks
   - Show lobby again

**Export Settings:**
- Format: MP4
- Resolution: 1920x1080
- Bitrate: 5-10 Mbps
- Audio: AAC, 192 kbps

---

### **Phase 5: Full Demo Dry Run (30 mins)**

#### Simulate The Real Demo:

1. **Setup** (2 mins):
   - Open browser to landing page
   - Open terminal ready to run script
   - Position windows side-by-side

2. **Execute** (5 mins):
   - Follow DEMO_SCRIPT.md exactly
   - Time yourself
   - Record it if possible

3. **Q&A Practice** (10 mins):
   - Answer sample questions from script
   - Practice pivot if something breaks

4. **Reset** (2 mins):
   - Close all apps
   - Run once more

**Repeat Until Smooth:**
- You should do this at least 2-3 times tonight

---

## 🚨 TROUBLESHOOTING GUIDE

### **Problem: Backend Returns 404**
**Solution:**
```bash
# Check if Railway service is running
# Log into Railway dashboard
# Verify environment variables are set
# Check Recent Logs for errors
```

---

### **Problem: Agents Register But Don't Join Game**
**Solution:**
- Check if queue logic is working
- Look for errors in backend logs
- Try with just 2 agents first: `node test-two-agents.js`

---

### **Problem: Frontend Shows "Waiting for agents" Forever**
**Solution:**
- Open browser DevTools (F12)
- Check Console for errors
- Verify API calls are hitting correct endpoint
- Check Network tab for 404s or CORS errors

---

### **Problem: Personality Badges Show Generic Robot**
**Solution:**
- Check agent names match exactly: `TightAggro`, `LooseAggro`, etc.
- Case-sensitive! Check test-six-realistic.js line 138-143

---

### **Problem: Cards Don't Appear**
**Solution:**
- Verify game_sessions has data in Supabase
- Check that agents have hole_cards in database
- Look for console errors about PlayingCard component

---

### **Problem: Demo is Too Slow**
**Solution:**
- Reduce sleep times in test-six-realistic.js
- Change line 20: `function sleep(ms) { return new Promise(r => setTimeout(r, ms / 2)); }`
- This makes everything 2x faster

---

## ✅ PRE-DEMO MORNING CHECKLIST

**30 Minutes Before Demo:**

1. **Computer Health**
   - [ ] Restart computer (fresh start)
   - [ ] Close Discord, Slack, email
   - [ ] Disable notifications
   - [ ] Charge laptop to 100%
   - [ ] Connect to stable internet

2. **Software Check**
   - [ ] Test Railway backend endpoint
   - [ ] Run `node test-six-realistic.js` once
   - [ ] Verify frontend loads
   - [ ] Clear browser cache
   - [ ] Test screen share (if remote)

3. **Backup Ready**
   - [ ] Video file ready to play
   - [ ] Alternative demo plan prepared
   - [ ] Localhost backend ready if needed

4. **Physical Setup**
   - [ ] Glass of water nearby
   - [ ] Notes visible but not distracting
   - [ ] Good lighting (if video call)
   - [ ] Quiet environment

5. **Mental Prep**
   - [ ] Read DEMO_SCRIPT.md one more time
   - [ ] Deep breaths
   - [ ] Positive mindset
   - [ ] Remember: You built something awesome

---

## 🎯 SUCCESS CRITERIA

**Demo is SUCCESSFUL if:**
- ✅ All 6 agents start and play at least 3 hands
- ✅ Visual elements work (badges, animations, cards)
- ✅ You explain confidently for 5 minutes
- ✅ No major crashes or freezes
- ✅ You answer questions clearly

**Demo is ACCEPTABLE if:**
- ✅ At least 4 agents play
- ✅ Most visual elements work
- ✅ You recover gracefully from bugs
- ✅ Backup video works if needed

**Demo FAILED if:**
- ❌ Nothing loads at all
- ❌ You can't explain what's happening
- ❌ You panic and give up
- **BUT:** You won't fail if you test tonight!

---

## 📊 TEST RESULTS LOG

Use this to track your testing tonight:

### Test Run #1
- Date/Time: __________
- Backend Status: ⬜ Working ⬜ Failed
- Agents Started: ___ / 6
- Frontend Visual: ⬜ Perfect ⬜ Some Issues ⬜ Broken
- Duration: ____ minutes
- Issues Found:
  -
  -
  -

### Test Run #2
- Date/Time: __________
- Backend Status: ⬜ Working ⬜ Failed
- Agents Started: ___ / 6
- Frontend Visual: ⬜ Perfect ⬜ Some Issues ⬜ Broken
- Duration: ____ minutes
- Improvements:
  -
  -
  -

### Test Run #3
- Date/Time: __________
- Backend Status: ⬜ Working ⬜ Failed
- Agents Started: ___ / 6
- Frontend Visual: ⬜ Perfect ⬜ Some Issues ⬜ Broken
- Duration: ____ minutes
- Final Notes:
  -
  -
  -

---

## 🎬 READY TO TEST?

**Start with:**
```bash
# Step 1: Test backend
curl https://deepstacks-agents-poker-arena-production.up.railway.app/register \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"agent_name": "TestBot"}'

# Step 2: Run agents
node test-six-realistic.js

# Step 3: Watch in browser
npm run dev
# Open http://localhost:5173
```

---

**You got this! Test thoroughly tonight, and tomorrow will go smoothly. 🚀**
