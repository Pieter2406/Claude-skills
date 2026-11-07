# Reviewer subagent prompt

Fill in the brackets and send it as the subagent's prompt (background, general-purpose agent). It must work without
your context, so name the files; it must not be anchored, so don't say what you suspect.

```
Review a code change for correctness bugs in <repo path> (<one line: what kind of app it is and its stack>). Read
<CLAUDE.md / README / the doc sections that describe the changed feature> first.
The change is `git -C <repo> diff <last-release>..HEAD` (<one line: what it adds>). Focus on <the 3–6 files or
sections with the new logic>.

Look for real bugs only:
- data or clients from the previous version: missing fields, older formats/schemas, an old client still running;
- input the code trusts (requests, files, messages, CLI args): validation holes, unbounded growth, odd keys
  ("__proto__"), wrong types, huge values, injection;
- several users/sessions/processes at once: overwrites, double counting, the same action twice, ordering, locks;
- interruptions and retries: late or duplicate replays, partial writes, an action applied locally but refused remotely;
- time: client vs server clocks, clamping, time zones, timers firing late;
- escaping of everything rendered or interpolated (HTML, SQL, shell); secrets reaching clients or logs;
- state and feedback: stale state between steps, double submits, debounced input lost, success shown after a failure;
- defaults when an identity, role, tenant or selection is missing (silently picking the first one);
- resource leaks and error handling: unclosed handles, swallowed exceptions, missing timeouts.

Do NOT edit files. Report each finding with file:line, a concrete failure scenario (inputs → wrong result), a
suggested fix, and whether it is certain (you reproduced it or the code makes it inevitable) or plausible. Also list
what you checked and found fine. Under 600 words.
```

When it reports back: its findings are claims. Reproduce each one (a unit test or a small script) before fixing,
and say in the report which ones you confirmed, fixed, or left.
