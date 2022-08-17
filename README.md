# Keycloak GitHub Action Bot

Custom GitHub Actions for Keycloak projects. 

## Using the bot in a repository

The bot contains the following functionality:

* When adding a comment `/rerun` as it on a pull request that is open, the bot will re-run any failed jobs in a workflow run.
  The comment needs to be either a collaborator, an owner, a member of the organization or contributor.

After processing the comment, the bot adds a +1 reaction to the comment.

**NOTE:** If there are queued GitHub actions in the GitHub organization, it might take some time until bot can start and add the reaction. 

## Adding the bot to the repository

To add it to a repository, add the following GitHub to the repository in its main branch.
It will then run the action on each comment on either an issue or a pull request to see if one of the commands listed above has been added.

```yaml
name: Keycloak GitHub Action Bot

on:
  issue_comment:
    types:
      - created

permissions:
  issues: write
  actions: write

jobs:
  act:
    runs-on: ubuntu-latest
    steps:
      - uses: keycloak/keycloak-gh-actionbot@v1
        env:
          GITHUB_TOKEN: '${{ secrets.GITHUB_TOKEN }}'
```

## Development Changes for bot

* Fork the repository, clone it and create a feature branch
* Run `yarn install` to install the dependencies
* Develop changes in `index.js`
* Run `yarn build` to package the changes to `dist/index.js`
* Commit and push the changes to the feature branch
* In the main branch of the repository, add the action bot that points to the feature branch
* Test the changes on the forked repository until satisfied
* Create a PR for the main project

## Releasing changes for the bot

* Create a new tag from the main branch for the release (like `v1.0.1`)
* Push the changes to the release branch for those who track only the major version (like `v1`)
