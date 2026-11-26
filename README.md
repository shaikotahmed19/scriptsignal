# ScriptSignal

ScriptSignal helps you spot AI-like writing patterns in English and Bengali scripts. A live speedometer shows a percentage estimate and shifts from green toward red as the score rises.

[Try ScriptSignal live](https://shaikotahmed19.github.io/scriptsignal/)

## Run locally

With Git, Node.js, and npm installed, run these commands.

```bash
git clone https://github.com/shaikotahmed19/scriptsignal.git
cd scriptsignal
npm start
```

Open [ScriptSignal on localhost](http://127.0.0.1:4173/).

## Analyze and edit a script

1. Paste at least 20 words of prose into the **Script editor**, or choose **Load sample** to cycle through English and Bengali examples. **Undo** restores the draft you had before browsing samples.
2. Read the live score or select **Analyze script** to run a scan on demand. Blocks of script text travel from the editor into the gauge before the result appears.
3. Review the suggestions. **Apply edit** inserts the previewed replacement and recalculates the score. **Find in script** selects the passage so you can edit it yourself.
4. Choose **Accept all** to review how many passages will change. Confirm to apply the ready edits together, or choose **Cancel**. **Undo** restores the script before the last edit or batch.

## Choose a theme

The header menu offers **Default**, **Light**, and **Dark**. Default follows the device’s color scheme as it changes. The browser remembers an explicit Light or Dark choice.

## How the score works

ScriptSignal blends a local statistical model with rules for formulaic phrasing, repeated openings, and sentence length. Short samples give more weight to the rules. Choose **Dialogue / transcript** for conversations, interviews, or podcast scripts to get a rules-based score and spoken-delivery advice. **Auto** recognizes repeated speaker labels and uses the dominant writing script to select the prose model. The percentage describes writing style. Verifying authorship requires other evidence.

Each one-click edit has to match the current passage exactly and lower the displayed score on a fresh check. A batch has to pass the same score check after all its edits are combined. Suggestions that need judgment or new details appear as manual advice.

Scripts are processed in your browser. Long pastes are analyzed in a background worker, and a newer edit cancels an obsolete analysis. The included Node.js server only serves the app files.

## Benchmark results

The original benchmark compared baseline `16b144d` with model release `9bedcbe`. Scores of 50 or above were counted as flags. AUROC measures how well the scores rank machine-labeled texts above human-labeled texts across cutoffs. The English RAID and Bengali IndicTextFake evaluation groups were separate from training. BHAID, the academic comparison, and the podcast excerpts were external checks.

| Evaluation set | Texts | Baseline → updated AUROC | Machine-labeled flags | Human flags |
| --- | ---: | ---: | ---: | ---: |
| RAID English books and news | 446 | 0.549 → 0.972 | 189/223 | 12/223 |
| IndicTextFake Bengali, including AI continuations | 396 | 0.534 → 0.719 | 76/198 | 14/198 |
| BHAID Bengali, length-matched | 716 | 0.608 → 0.970 | 343/358 | 59/358 |
| TextPulse academic English | 60 | 0.611 → 0.723 | 18/30 | 8/30 |
| Podcast excerpts | 12 | 0.472 → 0.208 | 0/6 | 1/6 |

On the same 60 TextPulse academic texts, archived GPTZero, Copyleaks, Originality.ai, Pangram, and Turnitin scores each flagged 30 of 30 machine texts and zero human texts at the study comparison cutoff. They differed on the separate 30 mixed-authorship texts. These are archived scores for this sample. [TextPulse replication data](https://doi.org/10.5281/zenodo.22003419)

The podcast check used six pre-2020 NASA podcast transcripts and six published AI podcast scripts. Each excerpt used a 220-word window and removed speaker and stage markers. The updated score performed worse than the baseline on this small cross-source sample, so the prose benchmark results should be read in their own domain. [NASA podcast transcripts](https://www.nasa.gov/podcasts/houston-we-have-a-podcast/) · [Model-Chronicle AI scripts](https://huggingface.co/datasets/My-Weird-Prompts/Model-Chronicle)

Across the 1,558 RAID, IndicTextFake, and BHAID texts, 750 received at least one suggestion. All 32 texts with ready edits passed the combined batch check. The editing fixtures cover exact offsets, score changes, protected text, and stale and invalid batch plans. Review any proposed wording for meaning before accepting it.

### Real-use retest

The fresh English holdout included 24 excerpts from pre-2021 NASA and NOAA podcasts and 24 from published AI-written podcasts. Each used a 220-word mid-episode window with speaker and stage markers removed. Auto flagged **0/24 AI** and **1/24 human** excerpts at 50. Dialogue mode offered revision advice on **37/48** excerpts, including advice on pacing and pauses. The 48 excerpts represent two human publishers and one AI publisher. [NASA transcripts](https://www.nasa.gov/podcasts/houston-we-have-a-podcast/) · [NOAA transcripts](https://oceanservice.noaa.gov/podcast/) · [Model-Chronicle](https://huggingface.co/datasets/My-Weird-Prompts/Model-Chronicle)

A second check used four NotebookLM podcast transcripts and four of those human excerpts. Auto flagged **0/4 AI** and **0/4 human**. A trial speech model caught two of the four NotebookLM texts and incorrectly flagged three of six human excerpts in the earlier podcast set. The released dialogue workflow uses editing rules. [NotebookLM podcast transcripts](https://doi.org/10.18710/RNTF9H)

After the input and editing fixes, the same prose retests flagged **189/223 AI and 12/223 human** on RAID, **76/198 AI and 14/198 human** on IndicTextFake, and **342/358 AI and 60/358 human** on BHAID. The TextPulse academic comparison remained at **18/30 AI and 8/30 human** flags. All 32 ready batches across RAID, IndicTextFake, and BHAID passed the combined score check. One-click edits remain sparse in the spoken samples, which returned manual advice.

Browser checks covered bilingual paste, numbers and fenced code, the phone layout, restoration after three sample previews, full analysis of a 363,000-character draft, a long batch with protected code, and cancellation when a new draft replaces an in-flight background job.

### Data and repeatable checks

- The English model used 1,114 RAID texts from books and news. The source-ID groups were split by a salted SHA-256 hash, with separate paired human and machine texts from ChatGPT, GPT-4, Mistral, and Llama in the 446-item holdout. The samples used clean greedy generation without a repetition penalty. [RAID dataset](https://huggingface.co/datasets/liamdugan/raid)
- The Bengali model used 3,180 clean Bengali rows from IndicTextFake under CC BY 4.0 at revision `d833f2f68309b26d756c77b100de8ea994f7ec15`. The fit and holdout used separate language, batch, and source-ID groups, with one human text and one generated example per group. [IndicTextFake dataset](https://huggingface.co/datasets/IndicTextFake/IndicTextFake)
- BHAID was evaluated separately. The 716 deduplicated Bengali texts were balanced by label in 50-word length bands. [BHAID dataset](https://huggingface.co/datasets/Sifi-world/BHAID)

The tools read local UTF-8 JSONL rows with `text` and `label` fields. Use `human` or `ai` as the label. Keep training and evaluation files separate.

```bash
node tools/fit-style-model.mjs training.jsonl en
node tools/evaluate-style.mjs held-out.jsonl 50
node tools/evaluate-style.mjs spoken-heldout.jsonl 50 analysis-engine.mjs dialogue
node tools/verify-edits.mjs
```
