# Getting Started with PropOps

**A completely beginner-friendly guide. No technical experience required.**

This guide will take you from zero to using PropOps in about 30 minutes. You don't need to be a developer. You just need a computer and the ability to follow step-by-step instructions.

If you get stuck at any point, jump to the **Troubleshooting** section at the bottom.

---

## What is PropOps?

PropOps is a free AI tool that helps you buy property in India without getting ripped off. When you're looking at a flat, you can ask it questions like:

- *"Is this builder overcharging me?"*
- *"Does this builder have any pending court cases?"*
- *"What did similar flats actually sell for nearby?"*
- *"Can I afford this property without ruining my finances?"*
- *"Review this builder agreement — are there any unfair clauses?"*

It pulls real answers from government databases (IGRS, MahaRERA, eCourts) that are free to access but buried behind terrible websites nobody has the patience to use. PropOps reads all of them for you in seconds.

**PropOps is free.** It is open-source software. There is no subscription, no ads, nothing to pay for. (You will need a Claude subscription — see below — but PropOps itself is free.)

---

## What You'll Need

Before we start, make sure you have:

1. **A computer** — Mac or Windows. A laptop is fine. PropOps does not work on mobile phones yet.
2. **Internet connection** — for PropOps to talk to government websites.
3. **A Claude subscription** — this is the paid AI service that powers PropOps. Costs about **$20/month (~₹1,700/month)** for Claude Pro. You can cancel anytime. Sign up at https://claude.ai after finishing this guide.
4. **About 30 minutes** for this one-time setup. After that, using PropOps takes seconds.

> **Is the Claude subscription really needed?**
> Yes. PropOps is an AI agent — it needs an AI brain to think with. Think of it like needing electricity for a washing machine. The ₹1,700/month subscription gives you unlimited use of Claude for everything, not just PropOps. If you evaluate even one property with PropOps and avoid overpaying by 1%, you've saved many times the monthly cost.

---

## A Quick Note About the Terminal

One of the steps below asks you to open the **Terminal** (on Mac) or **Command Prompt** (on Windows) and type a few commands.

If you've never used the Terminal before: don't worry. It's just a text-based way of talking to your computer. The commands in this guide are short and you just copy-paste them. Nothing will break.

The Terminal looks like a black or white window with text inside. You type a command, press Enter, wait for it to finish, and then type the next one.

---

## Step 1: Install Node.js

Node.js is a small free program that PropOps needs to run. It's like installing a PDF reader before you can open PDF files.

### On Mac

1. Go to: https://nodejs.org/
2. Click the big green button that says **"LTS"** (this means Long-Term Support — it's the stable version).
3. A file will download. Open it.
4. Follow the installation instructions. Click "Continue" and "Install" until it's done.
5. You may need to enter your Mac password.

### On Windows

1. Go to: https://nodejs.org/
2. Click the big green button that says **"LTS"**.
3. A `.msi` file will download. Open it.
4. Follow the installation wizard. Accept the license, click "Next" through all steps, and "Install" at the end.
5. You may need to approve the installation in a popup.

### Check that it worked

**On Mac:**
1. Open the Terminal. You can find it by pressing `Cmd + Space`, typing "Terminal", and pressing Enter.
2. In the Terminal window, type this and press Enter:
   ```
   node --version
   ```
3. You should see something like `v20.11.0` or similar. If you see a version number, Node.js is installed correctly.

**On Windows:**
1. Open Command Prompt. Click Start, type "cmd", and press Enter.
2. In the Command Prompt window, type this and press Enter:
   ```
   node --version
   ```
3. You should see something like `v20.11.0`. If you see a version number, Node.js is installed correctly.

If you see an error like "command not found" or "not recognized", see the **Troubleshooting** section at the bottom.

---

## Step 2: Install Claude Code

Claude Code is Anthropic's developer tool. It's the thing that actually runs PropOps.

1. First, make sure you have a Claude Pro or Claude Max subscription. Sign up at https://claude.ai if you don't already have one.
2. Go to: https://claude.com/claude-code
3. Follow the installation instructions for your operating system (Mac or Windows).
4. After installation, open a new Terminal (Mac) or Command Prompt (Windows) window and type:
   ```
   claude --version
   ```
5. If you see a version number, Claude Code is installed.
6. Log in by typing:
   ```
   claude
   ```
   The first time you run it, it will ask you to sign in with your Claude account. Follow the prompts in your browser.

---

## Step 3: Download PropOps

Now let's download PropOps itself. You have two ways to do this. Pick whichever is easier.

### Option A: Download the ZIP (easiest, recommended for beginners)

1. Go to: https://github.com/himanshudongre/propops
2. Click the green **"Code"** button near the top-right of the page.
3. In the dropdown that appears, click **"Download ZIP"**.
4. A file called `propops-main.zip` will download.
5. Unzip the file. On Mac, double-click it. On Windows, right-click and choose "Extract All".
6. You'll now have a folder called `propops-main`. Move this folder to somewhere you can find it easily, like:
   - **Mac**: `/Users/your-name/Documents/propops`
   - **Windows**: `C:\Users\your-name\Documents\propops`
7. Rename the folder from `propops-main` to just `propops` if you want (optional).

### Option B: Use Git (if you're familiar with it)

```
cd ~/Documents
git clone https://github.com/himanshudongre/propops.git
```

---

## Step 4: Set Up PropOps

Now we tell your computer to prepare PropOps. This takes about 5 minutes.

### Open the Terminal inside the PropOps folder

**On Mac:**
1. Open Finder.
2. Navigate to the `propops` folder you created in Step 3.
3. Right-click on the folder (or hold Ctrl and click).
4. Choose **"New Terminal at Folder"**.
5. A Terminal window will open, already inside the PropOps folder.

If you don't see "New Terminal at Folder", you can do it the other way: open Terminal normally, then type:
```
cd ~/Documents/propops
```
(Replace with your actual path if different.)

**On Windows:**
1. Open File Explorer.
2. Navigate to your `propops` folder.
3. Click on the address bar at the top.
4. Delete what's there, type `cmd`, and press Enter.
5. A Command Prompt window will open, already inside the PropOps folder.

### Run the setup commands

In the Terminal/Command Prompt window (which should now be inside the PropOps folder), type these commands one at a time. Wait for each to finish before typing the next.

**Command 1:**
```
npm install
```
This downloads the libraries PropOps needs. You'll see a lot of text scroll by. This takes 1-2 minutes. When it finishes, you'll see a new prompt waiting for input.

**Command 2:**
```
npx playwright install chromium
```
This downloads a tool PropOps uses to read government websites. This takes 2-5 minutes. Be patient.

When both commands are done, PropOps is fully set up.

---

## Step 5: First Use

Now you're ready to actually use PropOps.

### Open Claude Code inside the PropOps folder

In the same Terminal/Command Prompt window (still inside the PropOps folder), type:
```
claude
```

Press Enter. Claude Code will start up.

### Do the one-time setup

The very first time you use PropOps, it needs to know a bit about you — your budget, which city you're looking to buy in, your preferences, etc. This only happens once.

Type this in Claude Code:
```
/propops
```

and press Enter. PropOps will start an onboarding chat with you. It will ask things like:
- *"What city and areas are you looking to buy in?"*
- *"What's your budget range?"*
- *"What configuration do you want — 1 BHK, 2 BHK, 3 BHK?"*
- *"What's your monthly income? (For affordability checks later.)"*

Answer honestly. The more you tell it, the more accurate its advice will be. All your answers are stored only on your computer — nothing is sent anywhere.

After onboarding, PropOps is ready to use.

---

## Example Things You Can Ask

Here are five common things you can do right after setup. Just type these into Claude Code.

### 1. Check if a builder is trustworthy

```
/propops builder Lodha
```
PropOps will check MahaRERA, K-RERA, TNRERA, and eCourts for all projects, complaints, and court cases related to this builder across India.

### 2. Get actual sale prices for an area

```
/propops trend Hinjewadi
```
PropOps will show you what flats are actually selling for (not the asking prices on 99acres).

### 3. Evaluate a property URL

Just paste any property URL from 99acres, MagicBricks, Housing.com, etc.:
```
https://www.99acres.com/godrej-woods-sector-43-noida-npxid-r35927
```
PropOps will do a complete 7-block evaluation with a score, red flags, and a recommendation.

### 4. Check if you can afford a property

```
/propops finance
```
PropOps will run a financial stress test — not just "can you afford the EMI" but "should you take this loan considering your income, other expenses, and risk tolerance?"

### 5. Review a builder agreement for unfair clauses

```
/propops agreement-review
```
PropOps will ask you to paste or upload the agreement, then flag any one-sided clauses, missing RERA protections, or vague specifications.

### See all commands

```
/propops
```
Shows you every command available.

---

## Troubleshooting

### "node: command not found" or "node is not recognized"

This means Node.js didn't install properly, or the Terminal/Command Prompt doesn't know where to find it.

**Fix:**
1. Close the Terminal/Command Prompt completely.
2. Restart your computer.
3. Open a new Terminal/Command Prompt window.
4. Try `node --version` again.

If it still doesn't work, go back to Step 1 and reinstall Node.js. Make sure to download the LTS version from the official website (https://nodejs.org/).

### "claude: command not found"

Claude Code isn't installed correctly or isn't in your path.

**Fix:** Go to https://claude.com/claude-code and follow the installation instructions for your operating system carefully. After installation, you may need to restart your Terminal/Command Prompt.

### "npm install" shows errors

Most npm install errors are temporary. Try these in order:

1. Close and reopen the Terminal/Command Prompt.
2. Navigate back to the propops folder.
3. Delete a file called `package-lock.json` if it exists.
4. Run `npm install` again.

### Playwright installation fails

Try running the command again:
```
npx playwright install chromium
```

Sometimes it fails due to a slow internet connection. If it still fails, try:
```
npx playwright install --force chromium
```

### PropOps asks for a CAPTCHA

This is normal. Some government portals (like IGRS Maharashtra and IGRS Telangana) show a CAPTCHA for every search. PropOps will:
1. Take a screenshot of the CAPTCHA.
2. Show it to you in the chat.
3. Ask you to type what you see.

Just type the CAPTCHA text and press Enter. PropOps will continue.

### Karnataka Kaveri asks me to log in

Kaveri (the Karnataka government property portal) requires a one-time phone + OTP login. PropOps will open a browser window. You log in once manually. Your session is saved for 8 hours, after which you'll need to log in again.

### Searches return no results for areas I know have properties

Government portals have different naming conventions. Try searching with variations:
- "Hinjewadi" vs "Hinjawadi" vs "Hinjwadi"
- "Bangalore" vs "Bengaluru"
- Full legal names vs short forms

### Something else went wrong

Look at the error message. If it mentions a specific file or step, search the `docs/` folder inside your PropOps installation. Most error messages have answers in `docs/SETUP.md` or `docs/ARCHITECTURE.md`.

If you're still stuck, you can file an issue on GitHub: https://github.com/himanshudongre/propops/issues

---

## Tips for Best Results

1. **Be specific in your buyer brief.** The more PropOps knows about what you want, the better. Tell it about your family size, commute preferences, budget flexibility, deal-breakers, etc.

2. **Use real property URLs.** When evaluating a specific flat, paste the actual URL from 99acres/MagicBricks/Housing.com. PropOps extracts all the listing details automatically.

3. **Run builder checks before site visits.** Knowing a builder has 3 pending court cases is way more useful *before* you spend half a day visiting their showroom.

4. **Trust the data, not the sales pitch.** If IGRS shows identical flats registered at ₹95L but the builder is quoting you ₹1.2Cr, the data is more reliable than the sales pitch.

5. **Keep your Claude subscription active.** PropOps only works while your Claude subscription is active.

---

## How to Get Help

- **GitHub issues:** https://github.com/himanshudongre/propops/issues
- **Documentation:** Inside your PropOps folder, the `docs/` folder has deeper technical guides.
- **Community:** If a group of PropOps users emerges, links will be added here.

---

## A Final Note

PropOps is built because the Indian property market is opaque by design. Builders profit from you not knowing what your neighbors paid, whether they have pending court cases, or whether their agreement has one-sided clauses.

Everything PropOps does uses data that is already public — just hard to access. You have the right to this information. PropOps just makes it easy to get.

Good luck with your property search.
