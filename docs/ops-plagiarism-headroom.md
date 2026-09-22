# Plagiarism hourly headroom

The campus cap lives in `settings.plagiarismHourlyCap` (seed 100). Admin sets a warn-at percent in `settings.plagiarismWarnPercent` (seed 70).

Valkey key `rl:plagiarism:{campus}:{hour}` counts scans for the current hour.

- At or above the warn percent, Admin **Health** draws the usage bar in amber.
- At or above 90%, Admin pages show a banner and new scan jobs are enqueued with a doubled wait (120 seconds).
- A job that would pass the cap is moved to delayed and retried. It is not dropped. The wait is 60 seconds below 90% and 120 seconds at or above 90%. A full cap is 100%, so an over-cap retry waits 120 seconds.

Plan headroom before term end by raising the cap or spreading submissions. The limiter stays on.
