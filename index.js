#!/usr/bin/env node

const core = require("@actions/core");
const { context, GitHub } = require("@actions/github");

async function run() {
    const { GITHUB_TOKEN } = process.env;
    if (GITHUB_TOKEN) {
        core.setFailed('GITHUB_TOKEN is required');
        return;
    }

    const body = context.payload.comment.body;

    core.setOutput('comment_body', body);

    const { owner, repo } = context.repo;

    if (body.trim() !== "/hi") {
        core.setOutput("triggered", "false");
        return;
    }

    core.setOutput("triggered", "true");

    const client = new GitHub(GITHUB_TOKEN);
    if (context.eventName === "issue_comment") {
        await client.reactions.createForIssueComment({
            owner,
            repo,
            comment_id: context.payload.comment.id,
            content: '+1'
        });
    }
}

run().catch(err => {
    console.error(err);
    core.setFailed("Unexpected error");
});
