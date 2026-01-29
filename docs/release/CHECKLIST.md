# Launch Day Checklist

## Pre-Flight Checks
- [ ] **Tests Pass**: Ensure all GitHub Actions CI jobs are green.
- [ ] **Documentation**: Verify `README.md` links are working and images load.
- [ ] **Secrets**: Confirm `.env` files are in `.gitignore` and no real secrets are in the codebase.
- [ ] **Legal**: Ensure `LICENSE` is present and correct (MIT).
- [ ] **Clean History**: Review git log for any unintentional commits.

## The Launch
- [ ] **Visibility**: Change GitHub repository settings from Private to **Public**.
- [ ] **Release**: Create a new Release in GitHub (v1.0.0).
    - [ ] Tag: `v1.0.0`
    - [ ] Title: "Initial Open Source Release"
    - [ ] Description: Copy from CHANGELOG.md
- [ ] **Docker Hub**: (Optional) Push official images to Docker Hub.

## Promotion
- [ ] **Twitter**: Post using the template in `docs/release/ANNOUNCEMENT_TEMPLATES.md`.
- [ ] **LinkedIn**: Share the milestone with your network.
- [ ] **Reddit**: Post to r/webdev or r/opensource (check self-promotion rules first).
- [ ] **Discord/Slack**: Share in developer communities you belong to.

## Post-Launch
- [ ] **Monitor**: Watch for incoming Issues or PRs.
- [ ] **Engage**: Respond to the first few comments/stars quickly to build momentum.
