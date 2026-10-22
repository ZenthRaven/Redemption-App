# Redemption — Build Roadmap

Each step ends with a live test in the phone-shaped preview and **your explicit go-ahead** before the next step starts. Every approved step is committed and pushed to `github.com/ZenthRaven/Redemption-App`.

**Stack:** React 18 + TypeScript + Vite (web preview) → Capacitor (Android APK in the final step). State: one small Zustand store persisted locally. No backend server; all data stays on the device.

| # | Step | What you test in the preview |
|---|------|------------------------------|
| 1 | **Foundation** — repo, phone-frame preview with device presets, design tokens from UI REFERENCES, app shell, bottom nav, routing to 10 module placeholders | Navigate every tab/module; switch device sizes |
| 2 | **Game engine** — persisted store, Time Credits (24h/168h/~720h caps), EXP + levels, F/H/L-Coins → EXP + Leisure Coins conversion, badges, Redemption Vault (escrow, 48–72h grace, 1.5× comeback), Recovery Mode charges (max 3/month) | A dev panel to fire test events and watch numbers move |
| 3 | **Life HUD dashboard** — player bar + vault timer, quick-count strip, bold wallet, 24h Time Bank bar + today's questline, Vitality & Ambition pulse | Dashboard reflects engine state |
| 4 | **01 Wallet** — monthly salary, icon category picker Quick Spend, expenditure hierarchy, F-Coin rules, end-of-month Buffer prompt (Save / Life Checklist wishlist) | Add salary + spends in seconds |
| 5 | **02 Liabilities** — loans/mortgages/subscriptions, 10d/5d/2d/night-before countdown, Paid → wallet auto-deduct + L-Coins | Mark paid, see wallet sync |
| 6 | **04 Commissions** — daily/weekly/monthly quests with subtasks + time cost, EXP rewards, missed → Vault + reschedule prompt | Complete/miss/redeem a quest |
| 7 | **03 Habits** — good habits with reminder times; Smart Bad-Habit Library (auto-weaning vs cold-turkey, reality-check quotes, urge-surfing) | Add from library, log a slip |
| 8 | **05 Calendar** — month view, events with date/time/location/tone | Add and view events |
| 9 | **06 Learning** — locked commits (3 days → indefinite), resources, contract-break penalty, health-gated Medical Pause | Try to delete a commit |
| 10 | **07 Time Bank** — default daily template, auto-sync from Learning/Projects, weekly/monthly reports | Adjust template, view report |
| 11 | **08 Projects** — time-credit allocation, milestones, deadlines, progress | Create project + milestones |
| 12 | **09 Vitality** — X-ray body map (tap green / double-tap red / hold-drag liquid fill), checkup prompts, mood questionnaire, BMI/weight, Recovery Mode prompt | Full body report in < 2 min |
| 13 | **10 Life Canvas** — dream cards with photos, notes, milestones, wishlist, hopeful prompts | Build a dream card |
| 14 | **Onboarding & daily loop** — Quick Intro vs 5-min Full Tour, Nightly Check-Out wizard with reward animation | First-run flow, nightly wizard |
| 15 | **Notifications** — 3-tier system (hard alarms / nudges / briefings) via Capacitor Local Notifications | Scheduled notification list |
| 16 | **Android build** — Capacitor project, portrait lock, icons/splash, APK | Install the APK on your phone |
