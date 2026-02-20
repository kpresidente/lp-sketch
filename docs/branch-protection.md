# Branch Protection Requirements (Main)

Date: `2026-02-19`

This document defines the required branch protection settings for `main` so merges are blocked unless CI passes.

## Required Settings

1. Protect branch: `main`
2. Require a pull request before merging: `Enabled`
3. Require status checks to pass before merging: `Enabled`
4. Required status checks:
   - `Build + Test` (job from `.github/workflows/ci.yml`)
5. Require branches to be up to date before merging: `Enabled`
6. Allow force pushes: `Disabled`
7. Allow deletions: `Disabled`

## Recommended Settings

1. Require approvals: `1` minimum
2. Dismiss stale approvals on new commits: `Enabled`
3. Restrict who can push to matching branches: `Enabled` (admins/service accounts as needed)

## Setup Procedure (GitHub UI)

1. Open repository `Settings`.
2. Go to `Branches`.
3. Create or edit a branch protection rule for `main`.
4. Apply all required settings above.
5. Save changes.

## Verification Procedure

1. Open a test pull request into `main`.
2. Confirm merge is blocked until `Build + Test` is green.
3. Confirm direct push to `main` is blocked for non-exempt users.

## Evidence Log

Fill after repository admin applies settings.

| Date | Actor | Evidence |
| --- | --- | --- |
| _pending_ | _pending_ | Screenshot of branch rule + blocked merge screenshot |

