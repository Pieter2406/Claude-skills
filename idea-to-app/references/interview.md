# The interview ("grill me")

Pieter asked to be grilled before anything is built. The point is not ceremony: an app built on a vague idea gets
rebuilt, and five minutes of sharp questions saves an hour of rework. Be the friendly product person who won't let a
fuzzy answer slide.

## How to run it

- **Use the AskUserQuestion tool**, up to 4 questions per round, each with 2–4 concrete options and your
  recommendation first (marked "(Recommended)"). Pieter is often on their phone: tapping beats typing. They can always
  pick "Other" to type their own answer.
- **One theme per round**, in the order below. Skip a question when the idea or an earlier answer already settles it;
  never ask what you could infer or look up.
- **Challenge, don't just collect.** If an answer is vague ("it should be easy", "for everyone"), make the next question
  force a choice. If two answers conflict (say "offline" and "shared live with family"), point it out and ask which wins.
  If the scope grows, ask what can wait for version 2.
- **Make options concrete to their idea.** Not "Who are the users?" but "Who opens the shopping list: just you, you and
  your partner, or the whole family including the kids?"
- **Stop when it converges.** Usually 4–6 rounds. If they say "go", "enough" or "just build it", stop immediately, fill the
  gaps with sensible defaults and list them in the spec.
- Ask in the language they wrote in.

## The rounds

### 1. The problem and the people
- What happens today without the app? What's annoying or missing about that?
- Who uses it (just Pieter, family, a club, a class, strangers)? Any kids or less technical people?
- How often and where: a quick moment on the phone, on a TV, at a desk, in a noisy room, in the car?
- What device(s): phone first, desktop first, a shared screen (TV) plus phones? With a TV: is it a laptop mirrored to
  the TV (so everything on the host's screen is seen by everyone) or a separate screen?

### 2. The core moment
- Describe the one thing it must do brilliantly. Walk through a typical use from opening it to closing it.
- What does the user see first? What's the very first tap?
- What would make them say "this is great" after a week? (That's the success criterion; write it down.)

### 3. Data
- What gets stored, if anything? Must it survive closing the app, switching phones or clearing the browser?
- Shared between people? If so: live (everyone sees changes instantly, like a game or a shared list being shopped) or
  just eventually (a log that others read later)?
- Anything sensitive (health, money, kids' names, addresses)? How long should it be kept? Delete or export needed?
- Does it start with content (a list of exercises, questions, recipes) that you should write or that they will provide?

### 4. Access
- Default is **unlisted**: anyone with the link can open it, search engines don't index it. Is that right, or should it
  be public, or need a login/passphrase?
- Can everyone with the link also change things, or should some people only view?
- Anyone who must never see it (e.g. a surprise for someone)?

### 5. Feel and extras
- Tone and look: playful, calm, sporty, professional, for kids? Any colours, theme or brand to use?
- Sound, haptics, notifications, reminders, timers, camera, microphone, location: which ones really matter?
- Must it work offline (no signal)? Installable on the home screen?

### 6. Scope and name
- What is explicitly *not* in version 1?
- Name and address: propose 2–3 short names that fit the idea, each as `<name>.pieterverlinden.be` (lowercase letters,
  digits and dashes). Check the address isn't already in use before suggesting it (see cloudflare.md).

## The spec

After the last round, write a one-page spec and show it in the chat (short; no code):

```
# <App name>  ·  https://<sub>.pieterverlinden.be
Problem: <one or two sentences>
Users and devices: <who, where, which device first>
Core flow: 1. … 2. … 3. …
Data: <none / in the browser / shared via server: what, how long kept>
Access: <unlisted / public / passphrase>, <who can edit>
Look and feel: <tone, colours, language>
Version 1 includes: <bullets>
Not in version 1: <bullets>
Success after a week: <criterion>
Assumptions I made: <anything they didn't decide>
```

Then ask one last question with AskUserQuestion: "Build it like this?" with options *Build it (Recommended)*,
*Change something*, *Stop here*. Build only after a yes. If they change something, update the spec and ask again.
