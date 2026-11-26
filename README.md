# ScriptSignal

ScriptSignal helps you spot AI-like writing patterns in English and Bengali scripts. A live speedometer shows a percentage estimate and shifts from green toward red as the score rises.

## Run locally

With Git, Node.js, and npm installed, run these commands.

```bash
git clone https://github.com/shaikotahmed19/scriptsignal.git
cd scriptsignal
npm start
```

Open [ScriptSignal on localhost](http://127.0.0.1:4173/).

## Analyze and edit a script

1. Paste at least 20 words into the **Script editor**, or choose **Load sample**.
2. Read the live score or select **Analyze script** to calculate it immediately.
3. Review the suggestions. **Apply edit** inserts the previewed replacement and recalculates the score. **Find in script** selects the passage so you can edit it yourself.
4. Use **Undo** to reverse the latest applied suggestion if you change your mind.

## How the score works

The browser uses rules for writing patterns such as formulaic phrases, repeated sentence openings, and long sentences. For each one-click suggestion, it scores the edited text to calculate the previewed point change. The percentage reflects how strongly a script matches the rules. Verifying who wrote a script requires other evidence.

Scripts are processed in your browser. The included Node.js server only serves the app files.
