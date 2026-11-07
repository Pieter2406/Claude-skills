# Reviewer subagent prompt

Fill in the brackets and send it as the subagent's prompt (background, general-purpose agent). It must work without
your context, so name the files; it must not be anchored, so don't say what you suspect.

```
Review a code change for correctness bugs in <repo path> (<one line: what the app is and its stack>). Read
<CLAUDE.md / README / the doc sections that describe the changed feature> first.
The change is `git -C <repo> diff <last-deploy>..HEAD` (<one line: what it adds>). Focus on <the 3–6 files or
sections with the new logic>.

Look for real bugs only:
- old saved data or old clients: fields missing, older formats, a previous version still running on another device;
- input the server trusts: validation holes, unbounded growth, odd keys ("__proto__"), wrong types, huge values;
- several users/devices at once: overwrites, double counting, two people pressing the same button, ordering;
- offline and retries: replays arriving late or twice, an action applied locally but refused by the server;
- time: client vs server clocks, clamping, time zones, timers firing late;
- escaping/injection in everything rendered; secrets in the client;
- UI state: stale variables between screens, double taps, debounce losing input, a success message after a failure;
- the wrong person/part/item chosen when identity is unknown.

Do NOT edit files. Report each finding with file:line, a concrete failure scenario (inputs → wrong result), a
suggested fix, and whether it is certain (you reproduced it or the code makes it inevitable) or plausible. Also list
what you checked and found fine. Under 600 words.
```

When it reports back: its findings are claims. Reproduce each one (a unit test or a small script) before fixing,
and say in the report which ones you confirmed, fixed, or left.
