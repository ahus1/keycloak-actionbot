#!/usr/bin/env node

const core = require("@actions/core");
const github = require("@actions/github");
const { Octokit, App } = require("octokit");

async function run() {
    const githubToken = core.getInput("github_token");
    const debug = core.getInput("debug") === "true" || false;

    if (debug) {
        console.log(`Event name: ${github.context.eventName}`);
        console.log(
            `Event payload: ${JSON.stringify(
                github.context.payload,
                undefined,
                2
            )}`
        );
    }

    const octokit = new Octokit({ auth: githubToken });

    if (github.context.eventName === "issue_comment") {
        const body = github.context.payload.comment.body;
        const authorAssociation =
            github.context.payload.comment.author_association;
        const pull_number = github.context.payload.issue.number;

        const { owner, repo } = github.context.repo;

        if (body.trim() !== "/rerun") {
            // unrecognized command
            core.setOutput("triggered", "false");
            return;
        }

        if (!github.context.payload.issue.pull_request) {
            // not a pull request
            core.setOutput("triggered", "false");
            return;
        }

        if (github.context.payload.issue.state !== "open") {
            // not open
            core.setOutput("triggered", "false");
            return;
        }

        console.log(`evaluating action for PR#${pull_number}`);

        if (
            authorAssociation !== "COLLABORATOR" &&
            authorAssociation !== "OWNER" &&
            authorAssociation !== "MEMBER" &&
            authorAssociation !== "CONTRIBUTOR"
        ) {
            console.log(
                `skipped due to authorAssociation: ${authorAssociation}`
            );
            core.setOutput("triggered", "false");
            return;
        }

        const pull_request = unwrapResult(
            await octokit.request(
                "GET /repos/{owner}/{repo}/pulls/{pull_number}",
                {
                    owner: github.context.payload.repository.owner.login,
                    repo: github.context.payload.repository.name,
                    pull_number: pull_number,
                }
            )
        );

        if (debug) {
            console.log(
                `Pull request: ${JSON.stringify(pull_request, undefined, 2)}`
            );
        }

        const check_runs = unwrapResult(
            await octokit.request(
                "GET /repos/{owner}/{repo}/commits/{ref}/check-runs",
                {
                    owner: github.context.payload.repository.owner.login,
                    repo: github.context.payload.repository.name,
                    ref: pull_request.head.sha,
                }
            )
        ).check_runs;

        for (let i = 0; i < check_runs.length; i++) {
            const check = check_runs[i];
            if (check.conclusion === "failure") {
                if (debug) {
                    console.log(
                        `Check: ${JSON.stringify(check, undefined, 2)}`
                    );
                }

                const job = unwrapResult(
                    await octokit.request(
                        "GET /repos/{owner}/{repo}/actions/jobs/{job_id}",
                        {
                            owner: github.context.payload.repository.owner
                                .login,
                            repo: github.context.payload.repository.name,
                            job_id: check.id,
                        }
                    )
                );

                if (debug) {
                    console.log(`Job: ${JSON.stringify(job, undefined, 2)}`);
                }

                unwrapResult(
                    await octokit.request(
                        "POST /repos/{owner}/{repo}/actions/runs/{run_id}/rerun-failed-jobs",
                        {
                            owner: github.context.payload.repository.owner
                                .login,
                            repo: github.context.payload.repository.name,
                            run_id: job.run_id,
                        }
                    )
                );
            }
        }

        core.setOutput("triggered", "true");

        await octokit.request(
            "POST /repos/{owner}/{repo}/issues/comments/{comment_id}/reactions",
            {
                owner: owner,
                repo: repo,
                comment_id: github.context.payload.comment.id,
                content: "+1",
            }
        );
    }
}

run().catch((err) => {
    console.error(err);
    core.setFailed("Unexpected error");
});

function unwrapResult(response) {
    if (response.status === 200) {
        return response.data;
    }
    if (response.status === 201) {
        return undefined;
    }
    console.error(`response failed ${JSON.stringify(response, undefined, 2)}`);
    core.setFailed("Request to GitHub API failed");
}
