# SonarCloud setup

SonarCloud (now called SonarQube Cloud) is free for public repositories. It reviews every pull
request for bugs, security hotspots, code smells and duplicated code, and shows the result as a
check on the PR. It complements ESLint and `tsc` (see `eslint.config.js`); it does not replace them.

The repo holds the configuration in `sonar-project.properties`. The steps below happen in the
dashboards, once.

## Automatic Analysis (no CI changes)

Sonar analyses the repository itself, without a token or a workflow step. It has no code coverage,
which is fine: the project has no coverage report yet.

1. Sign in to [sonarcloud.io](https://sonarcloud.io) with GitHub.
2. **Analyze new project**, pick the `lucieneu` organization (import it if asked) and select
   `lucieneu/personal-website`.
3. Choose **With GitHub Actions** only if you want coverage later. For now pick **Automatic
   Analysis** (under **Administration → Analysis Method**, turn **Automatic Analysis** on).
4. Install the SonarCloud GitHub app on `lucieneu/personal-website` when asked. This is what posts
   the check on pull requests.
5. **Administration → New Code**: choose **Previous version** or **Reference branch** `main`, so
   a PR is judged on the code it changes, not on everything already there.
6. Optional: in **Branch protection** for `main`, add the **SonarCloud Code Analysis** check as
   required, once you have seen it pass a few times.

## Later: coverage

Vitest can write an LCOV report (`vitest run --coverage`, with `@vitest/coverage-v8`). To show it in
SonarCloud, switch the analysis method to **With GitHub Actions**, add the `SONAR_TOKEN` secret and
a `SonarSource/sonarqube-scan-action` step to `.github/workflows/ci.yml`, and set
`sonar.javascript.lcov.reportPaths` in `sonar-project.properties`. SonarCloud's own setup page
gives the exact snippet for the current version.

## In the editor

SonarLint (a free VS Code extension) shows the same kind of issues while you type. Connect it to
the SonarCloud project to use the same rules.
